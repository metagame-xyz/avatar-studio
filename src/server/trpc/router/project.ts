import type { AchievementType, NftMetadata } from '@prisma/client'
import type { EmailWithMetadata, User as PrivyUser, WalletWithMetadata } from '@privy-io/server-auth'
import { TRPCError } from '@trpc/server'
import Bottleneck from 'bottleneck'
import { env as clientEnv } from 'env/client.mjs'
import { providers } from 'ethers'
import { filterToAchievementFields, getEmailFromString, isNotNull, slugify } from 'utils'
import airtable, { airtableAuthExpiredObj, airtableAuthNotPresentObj, airtableLockErrorObj } from 'utils/airtable'
import type { AirtableFieldType, AirtableWebhookResponse } from 'utils/airtableFrontend'
import { AirtableAuthError, airtableFieldSchema, AirtableLockError } from 'utils/airtableFrontend'
import { privy } from 'utils/backend'
import { LogData, logError, logSuccess } from 'utils/logging'
import { getAddressFromString } from 'utils/needEnvUtils'
import type { MostTypes } from 'utils/types'
import { getNewAirtableMemberSchema, newAirtableMemberSchemaOld } from 'utils/types'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router, webhookOrOrgAdminProcedure } from '../trpc'
import { testData } from './testData'

export const projectRouter = router({
    getProject: publicProcedure.input(z.string()).query(async ({ ctx }) => {
        try {
            if (!ctx.projectSlug) throw new Error('Cant get slug from context')
            const data = await ctx.prisma.project.findUniqueOrThrow({
                where: {
                    slug: ctx.projectSlug,
                },
                include: {
                    members: { include: { member: true } },
                    organization: true,
                    traitCategories: { include: { traits: true } },
                    airtableProject: true,
                    achievementCategories: { include: { achievements: true } },
                },
            })
            return data
        } catch (error) {
            console.log('error', error)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Project not found',
            })
        }
    }),
    createNewProject: protectedOrgProcedure
        .input(z.object({ name: z.string(), organizationSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { name, organizationSlug } = input
            const slug = slugify(name)

            const { id } = await ctx.prisma.organization.findUniqueOrThrow({
                where: {
                    slug: organizationSlug,
                },
                select: {
                    id: true,
                },
            })

            return ctx.prisma.project.create({
                data: {
                    name,
                    slug,
                    organization: { connect: { id } },
                },
            })
        }),
    getAllNftMetadata: publicProcedure.input(z.object({ chainNetwork: z.string() })).query(async ({ ctx }) => {
        const network = ctx.network
        if (!ctx.projectSlug) throw new Error('Cant get slug from context')

        const data = await ctx.prisma.$queryRaw<NftMetadata[]>`WITH max_timestamps AS (
            SELECT "userId", MAX("timestamp") AS "timestamp"
            FROM "NftMetadata"
            WHERE "projectSlug" = ${ctx.projectSlug}
            AND "network" = ${network}
            GROUP BY "userId"
          )
          SELECT "NftMetadata".*
          FROM "NftMetadata"
          JOIN max_timestamps ON "NftMetadata"."userId" = max_timestamps."userId"
            AND "NftMetadata"."timestamp" = max_timestamps."timestamp"
          ORDER BY "timestamp" DESC;`

        const LatestNftMetadataArr = await ctx.prisma.nftMetadata.findMany({
            where: { id: { in: data.map((d) => d.id) } },
            include: {
                traits: true,
            },
        })

        return LatestNftMetadataArr
    }),
    getUsedNftCombos: publicProcedure.input(z.object({ chainNetwork: z.string() })).query(async ({ ctx }) => {
        const network = ctx.network

        if (!ctx.projectSlug) throw new Error('Cant get slug from context')

        const data = await ctx.prisma.$queryRaw<NftMetadata[]>`WITH max_timestamps AS (
            SELECT "userId", MAX("timestamp") AS "timestamp"
            FROM "NftMetadata"
            WHERE "projectSlug" = ${ctx.projectSlug}
            AND "network" = ${network}
            GROUP BY "userId"
          )
          SELECT "NftMetadata".*
          FROM "NftMetadata"
          JOIN max_timestamps ON "NftMetadata"."userId" = max_timestamps."userId"
            AND "NftMetadata"."timestamp" = max_timestamps."timestamp"
          ORDER BY "timestamp" DESC;`

        const LatestNftMetadataArr = await ctx.prisma.nftMetadata.findMany({
            where: { id: { in: data.map((d) => d.id) } },
            include: {
                traits: { include: { traitCategory: true } },
            },
        })

        const traitsArr = LatestNftMetadataArr.map((nft) => nft.traits.filter((t) => !t.traitCategory.isModifiable))

        const usedNonModifiableCombos: Record<string, string>[] = []
        for (const traits of traitsArr) {
            const obj = {} as Record<string, string>
            for (const trait of traits) {
                obj[trait.traitCategoryName] = trait.name
            }
            usedNonModifiableCombos.push(obj)
        }
        return usedNonModifiableCombos
    }),
    addAirtableProject: protectedOrgProcedure
        .input(
            z.object({
                organizationSlug: z.string(),
                projectSlug: z.string(),
                baseName: z.string(),
                tableName: z.string(),
                baseId: z.string(),
                tableId: z.string(),
                walletAddressFieldId: z.string(),
                walletAddressFieldName: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const {
                projectSlug,
                baseName,
                tableName,
                baseId,
                tableId,
                walletAddressFieldId,
                walletAddressFieldName,
                organizationSlug,
            } = input
            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: projectSlug },
                include: { airtableProject: true },
            })

            let webhookData: AirtableWebhookResponse | null = null

            //only create a new webhook if there is no existing one
            if (!project.airtableProject?.webhookId) {
                await airtable.setOrg(organizationSlug, 'createWebhook via addAirtableProject')
                webhookData = await airtable.createWebhook(baseId, tableId)
                await airtable.postCallCleanup('createWebhook via addAirtableProject')
            }

            const data = {
                baseName,
                tableName,
                baseId,
                tableId,
                walletAddressFieldId,
                walletAddressFieldName,
                project: { connect: { id: project.id } },
                webhookId: project.airtableProject?.webhookId || webhookData?.id,
                macSecretBase64: project.airtableProject?.macSecretBase64 || webhookData?.macSecretBase64,
            }

            // add AirtableProject and connect it to the project
            return ctx.prisma.airtableProject.upsert({
                where: {
                    projectId: project.id,
                },
                update: data,
                create: data,
            })
        }),
    addAirtableWebhook: protectedOrgProcedure
        .input(
            z.object({
                organizationSlug: z.string(),
                projectSlug: z.string(),
                override: z.boolean().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { projectSlug, organizationSlug } = input
            const project = await ctx.prisma.project.findUnique({
                where: { slug: projectSlug },
                include: { airtableProject: true },
            })

            if (!project?.airtableProject) throw new Error('Airtable project not found')

            if (!project.airtableProject.webhookId || input.override) {
                await airtable.setOrg(organizationSlug, 'createWebhook via addAirtableWebhook')
                const webhookData = await airtable.replaceWithFreshWebhook(
                    project.airtableProject.baseId,
                    project.airtableProject.tableId,
                )
                await airtable.postCallCleanup('createWebhook via addAirtableWebhook')

                return ctx.prisma.airtableProject.update({
                    where: {
                        projectId: project.id,
                    },
                    data: {
                        webhookId: webhookData.id,
                        macSecretBase64: webhookData.macSecretBase64,
                    },
                })
            }
        }),
    getAllAirtableData: webhookOrOrgAdminProcedure
        .input(z.object({ organizationSlug: z.string(), projectSlug: z.string().optional() })) // for protectedOrgProcedure to work
        .query(async ({ input, ctx }) => {
            const projectSlug = input.projectSlug || ctx.projectSlug
            if (!projectSlug) throw new Error('Cant get slug from context or input')

            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: projectSlug },
                include: {
                    airtableProject: true,
                    organization: {
                        include: {
                            airtableAuth: true,
                        },
                    },
                },
            })

            if (!project.organization.airtableAuth)
                return { bases: null, members: null, achievementFields: null, error: airtableAuthNotPresentObj }

            try {
                await airtable.setOrg(project.organization.slug, 'getAllAirtableData')

                let bases = await airtable.getBasesList()
                bases = !bases || !bases[0] ? [] : bases

                for (const base of bases) {
                    const tables = await airtable.getTablesList(base.id)
                    base.tables = tables || []
                }

                if (!project.airtableProject) return { bases, members: null, achievementFields: null, error: null }

                const unvalidatedMembers = await airtable.getMembers(project.airtableProject)

                // console.log(members)

                const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)

                const walletAddressFieldNameSlug = slugify(project.airtableProject.walletAddressFieldName)

                const newAirtableMemberSchema = getNewAirtableMemberSchema(walletAddressFieldNameSlug)

                // update and clean members to best of ability
                // if there's a problem, add an error field to the member
                // filter out members with errors, add them to membersWithBadData
                // use safeParse as a 2nd guard to filter out members with bad data, add them to membersWithBadData

                async function cleanMember(member: Record<string, MostTypes>) {
                    // if ens, get address from ens
                    if (member.ens && typeof member.ens === 'string') {
                        try {
                            const address = await provider.resolveName(member.ens)
                            member[walletAddressFieldNameSlug] = address?.toLowerCase()
                        } catch (err: Error | any) {
                            // console.error(err)
                            member.error = err.message
                            // membersWithBadData.push(member)
                        }
                    }

                    // if address string, get ens or address from address string
                    if (member[walletAddressFieldNameSlug] && typeof member[walletAddressFieldNameSlug] === 'string') {
                        try {
                            const address = await getAddressFromString(member[walletAddressFieldNameSlug] as string) // shouldn't need this, the check is done in the if statement above...?
                            member[walletAddressFieldNameSlug] = address?.toLowerCase()

                            // const ens = await provider.lookupAddress(address)
                            // member.ens = ens
                        } catch (err: Error | any) {
                            // console.error(err)
                            member.error = err.message
                            // membersWithBadData.push(member)
                        }
                    }

                    // clean email string
                    if (member.email) {
                        try {
                            member.email = getEmailFromString(member.email as string)
                        } catch (err: Error | any) {
                            // console.error(err)
                            member.error = err.message
                            // membersWithBadData.push(member)
                        }
                    }

                    return member
                }

                const limiter = new Bottleneck({
                    maxConcurrent: 30,
                    minTime: (1000 / 30) * 1.3,
                })

                const cleanMembers = await await Promise.all(
                    unvalidatedMembers.map(async (member) => limiter.schedule(() => cleanMember(member))),
                )

                const membersWithBadData: Record<string, MostTypes>[] = []
                const validMembers: Record<string, MostTypes>[] = []

                cleanMembers.forEach((member, i) => {
                    const parsedMember = newAirtableMemberSchema.safeParse(member)
                    parsedMember.success ? validMembers.push(member) : membersWithBadData.push(member)
                })

                // validMembers.forEach((m) => {
                //     try {
                //         newAirtableMemberSchema.parse(m)
                //     } catch (err: Error | any) {
                //         console.error(err)
                //         membersWithBadData.push(m)
                //     }
                // })

                // console.log(membersWithBadData)

                let airtableFields = await airtable.getTableFields(project.airtableProject)
                airtableFields = airtableFields || []

                const achievementFields = filterToAchievementFields(airtableFields, walletAddressFieldNameSlug)

                return { bases, members: validMembers, achievementFields, error: null, membersWithBadData }
            } catch (err) {
                if (err instanceof AirtableAuthError) {
                    return { bases: null, members: null, achievementFields: null, error: airtableAuthExpiredObj }
                } else if (err instanceof AirtableLockError) {
                    return { bases: null, members: null, achievementFields: null, error: airtableLockErrorObj }
                } else {
                    throw err
                }
            } finally {
                airtable.postCallCleanup('getAllAirtableData')
            }
        }),
    syncAirtableMembers: webhookOrOrgAdminProcedure
        .input(
            z.object({
                organizationSlug: z.string(),
                airtableMembers: z.array(newAirtableMemberSchemaOld),
                projectSlug: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const projectSlug = input.projectSlug || ctx.projectSlug
            if (!projectSlug) throw new Error('Cant get slug from context or input')

            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: projectSlug },
                include: {
                    airtableProject: true,
                },
            })

            if (!project || !project.airtableProject) {
                throw new Error('Project not found')
            }

            // TODO update this to somehow use field id instead of name
            const walletAddressFieldNameSlug = slugify(project.airtableProject.walletAddressFieldName)

            // const allPrivyUsers = await privyGetAllUsers(clientEnv.NEXT_PUBLIC_PRIVY_APP_ID, serverEnv.PRIVY_APP_SECRET)
            const allPrivyUsers = await privy.getUsers()

            // console.log('allPrivyUsers length:', allPrivyUsers.length)

            // map where the key is the wallet address and the value is the user
            const privyUsersByWalletAddress: Record<string, PrivyUser> = {}

            allPrivyUsers.forEach((user) => {
                if (user.wallet?.address) {
                    privyUsersByWalletAddress[user.wallet.address.toLowerCase()] = user
                }
            })

            // console.log('first privy user:', Object.entries(privyUsersByWalletAddress).length)

            // const airtableMembers = input.airtableMembers
            const airtableMembers = testData as Record<string, string>[]

            const airtableMembersDedupedMap: Record<string, Record<string, string>> = {}

            airtableMembers.forEach((member) => {
                const walletAddress = member[walletAddressFieldNameSlug] as string
                airtableMembersDedupedMap[walletAddress] = member
            })

            // console.log('airtableMembers length:', airtableMembers.length)
            // console.log('airtableMembersDedupedMap length:', Object.entries(airtableMembersDedupedMap).length)

            // const loggableUser = {
            //     airtable: {
            //         email: 'maggie@shefi.org',
            //         address: '0x0',
            //         name: 'Maggie',
            //     },
            //     privy: {
            //         exists: true,
            //         isJustCreated: false,
            //         email: 'maggie@shefi.org',
            //         address: '0x0',
            //         privyId: 'CSWA123',
            //     },
            //     database: {
            //         exists: true,
            //         isJustCreated: false,
            //         projectId: 5,
            //         address: '0x0',
            //         email: 'maggie@shefi.org',
            //         firstName: 'Maggie',
            //     },
            // }

            type loggableUser = {
                airtable: Record<string, MostTypes> | undefined
                privy:
                    | {
                          exists: boolean
                          isJustCreated: boolean
                          email: string | null
                          address: string | null
                          privyId: string | null
                      }
                    | undefined
                database:
                    | {
                          exists: boolean
                          isJustCreated: boolean
                          projectId: number | null
                          address: string | null
                          email: string | null
                          firstName: string | null
                      }
                    | undefined
            }

            const loggableUsersMap: Record<string, loggableUser> = {}

            Object.entries(airtableMembersDedupedMap).forEach(([address, airtableMember]) => {
                const privyData = privyUsersByWalletAddress[address]
                loggableUsersMap[address] = {
                    airtable: airtableMember,
                    privy: {
                        exists: !!privyData,
                        isJustCreated: false,
                        email: privyData?.email?.address || null,
                        address: privyData?.wallet?.address || null,
                        privyId: privyData?.id || null,
                    },
                    database: undefined,
                }
            })

            const users = await Promise.all(
                airtableMembers.map(async (airtableMember) => {
                    let privyUser: PrivyUser | null = null
                    const walletAddress = airtableMember[walletAddressFieldNameSlug] as string
                    try {
                        const logData: LogData = {
                            level: 'info',
                            function_name: 'beginSyncAirtableMembers',
                            wallet_address: walletAddress,
                        }

                        logSuccess(logData)

                        // console.log('walletAddress (user.findUnique):', walletAddress)
                        const existingUser = await ctx.prisma.user.findUnique({
                            where: { address: walletAddress },
                        })
                        let existingPrivyUser: PrivyUser | null | undefined = null

                        if (existingUser) {
                            loggableUsersMap[walletAddress] = {
                                airtable: undefined,
                                privy: undefined,
                                ...(loggableUsersMap[walletAddress] || {}),
                                database: {
                                    exists: true,
                                    isJustCreated: false,
                                    projectId: null,
                                    address: existingUser.address,
                                    email: existingUser.email,
                                    firstName: existingUser.firstName,
                                },
                            }
                        }

                        // TODO update this to "privyUpdateUser once Privy adds that option"
                        if (!existingUser) {
                            existingPrivyUser = privyUsersByWalletAddress[walletAddress]

                            if (existingPrivyUser) {
                                // console.log(
                                //     'existing privy user:',
                                //     existingPrivyUser?.email?.address,
                                //     ' | ',
                                //     existingPrivyUser?.id,
                                // )
                                privyUser = existingPrivyUser
                            } else {
                                // console.log('adding privy user:', airtableMember.email)

                                // type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never
                                const linkedAccounts = []

                                if (airtableMember[walletAddressFieldNameSlug]) {
                                    linkedAccounts.push({
                                        address: airtableMember[walletAddressFieldNameSlug] as string,
                                        type: 'wallet',
                                        chainType: 'ethereum',
                                    } as WalletWithMetadata)
                                }
                                if (airtableMember.email) {
                                    linkedAccounts.push({
                                        address: airtableMember.email,
                                        type: 'email',
                                    } as EmailWithMetadata)
                                }

                                privyUser = await privy.importUser({
                                    linkedAccounts,
                                })

                                loggableUsersMap[walletAddress] = {
                                    airtable: undefined,
                                    database: undefined,
                                    ...(loggableUsersMap[walletAddress] || {}),
                                    privy: {
                                        exists: true,
                                        isJustCreated: true,
                                        email: privyUser?.email?.address || null,
                                        address: privyUser?.wallet?.address || null,
                                        privyId: privyUser?.id || null,
                                    },
                                }
                                // privyUser = await privyAddUser(airtableMember, walletAddressFieldNameSlug)
                            }
                        }

                        let lastName: string | null = null
                        let firstName: string | null = null

                        if (airtableMember.name) {
                            // pop off the last word in the string
                            const nameArr = airtableMember.name.split(' ')
                            if (nameArr.length > 1) {
                                lastName = airtableMember.name.split(' ').pop() || null
                                // combine the rest of the words into a string
                                firstName = airtableMember.name.split(' ').slice(0, -1).join(' ') || null
                            } else {
                                firstName = airtableMember.name
                                lastName = null
                            }
                        }

                        // console.log('existingUser:', existingUser?.privyDID)
                        // console.log('privyUser:', privyUser?.id)
                        const privyDID = existingUser?.privyDID || privyUser?.id
                        // console.log('privyDID (user.upsert):', privyDID)
                        if (privyDID) {
                            const user = await ctx.prisma.user.upsert({
                                where: {
                                    privyDID,
                                },
                                update: {
                                    firstName: airtableMember['first-name'] || firstName || existingUser?.firstName,
                                    lastName: airtableMember['last-name'] || lastName || existingUser?.lastName,
                                    email: airtableMember.email || existingUser?.email,
                                },
                                create: {
                                    privyDID,
                                    address: airtableMember[walletAddressFieldNameSlug],
                                    firstName: airtableMember['first-name'] || firstName,
                                    lastName: airtableMember['last-name'] || lastName,
                                    email: airtableMember.email,
                                },
                            })

                            if (privyUser) {
                                const accounts = privyUser.linkedAccounts.map((account) => {
                                    const data = {
                                        userId: user.privyDID,
                                        type: account.type,
                                        address: null as string | null,
                                        chainType: null as string | null,
                                        email: null as string | null,
                                    }
                                    if (account.type === 'email') data.email = account.address
                                    if (account.type === 'wallet') {
                                        data.address = account.address
                                        data.chainType = account.chainType
                                    }
                                    return data
                                })

                                await ctx.prisma.account.createMany({ data: accounts })
                            }

                            if (!user.id) {
                                // console.log('user:', user)
                            }

                            return user
                        } else {
                            // console.log('existingUser:', existingUser)
                            // console.log('privyUser:', privyUser)
                            return null
                        }
                    } catch (error) {
                        // console.log('USER UPSERT error:', privyUser)

                        const logData: LogData = {
                            level: 'error',
                            function_name: 'syncAirtableMembersWithData',
                            wallet_address: walletAddress,
                        }

                        logError(logData, error)

                        return null
                    } finally {
                        const logData: LogData = {
                            level: 'info',
                            function_name: 'syncAirtableMembersWithData',
                            wallet_address: walletAddress,
                        }

                        logSuccess(logData, JSON.stringify(loggableUsersMap[walletAddress] || 'user not found'))
                    }
                }),
            ).then((users) => users.filter(isNotNull))

            // console.log('users length:', users.length)

            await Promise.all(
                users.map(async (user) => {
                    const response = await ctx.prisma.membersOfProjects.upsert({
                        where: {
                            userId_projectSlug: {
                                userId: user.id,
                                projectSlug: project.slug,
                            },
                        },
                        update: {
                            userId: user.id,
                            projectSlug: project.slug,
                        },
                        create: {
                            userId: user.id,
                            projectSlug: project.slug,
                        },
                    })

                    return response
                }),
            )
        }),
    syncAirtableAchievements: webhookOrOrgAdminProcedure
        .input(
            z.object({
                organizationSlug: z.string(),
                airtableFields: z.array(airtableFieldSchema),
                airtableMembers: z.array(newAirtableMemberSchemaOld),
                projectSlug: z.string().optional(),
            }),
        ) // for protectedOrgProcedure to work
        .mutation(async ({ ctx, input }) => {
            const projectSlug = input.projectSlug || ctx.projectSlug
            if (!projectSlug) throw new Error('Cant get slug from context or input')

            const { airtableFields, airtableMembers } = input
            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: projectSlug },
                include: { airtableProject: true },
            })

            const { walletAddressFieldName } = project.airtableProject ?? {}
            if (!walletAddressFieldName) {
                throw new Error(`Project's airtableProject not found`)
            }

            const achievementFields = filterToAchievementFields(airtableFields, walletAddressFieldName)

            const airtableFieldToAchievementCategoryType = (airtableType: AirtableFieldType): AchievementType => {
                switch (airtableType) {
                    case 'number':
                        return 'LEVEL'
                    case 'checkbox':
                    case 'singleSelect':
                    case 'multipleSelects':
                        return 'SPECIFIC_ACHIEVEMENT'
                    default:
                        return 'SPECIFIC_ACHIEVEMENT'
                }
            }

            const achievementCategoriesToCreate = achievementFields.map((field) => {
                let achievements: { name: string; id: string }[] = []
                // TODO: add support for checkbox
                if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
                    achievements = field.options?.choices?.map((choice) => ({ name: choice.name, id: choice.id })) || []
                }

                const upsert = achievements.map((achievement) => ({
                    where: {
                        airtableId: achievement.id,
                    },
                    create: {
                        name: achievement.name,
                        airtableId: achievement.id,
                    },
                    update: {
                        name: achievement.name,
                        airtableId: achievement.id,
                    },
                }))

                const create = achievements.map((achievement) => ({
                    name: achievement.name,
                    airtableId: achievement.id,
                }))

                const category = {
                    projectId: project.id,
                    airtableId: field.id,
                    name: field.name,
                    description: field.description,
                    type: airtableFieldToAchievementCategoryType(field.type),
                }

                return { category, create, upsert }
            })

            const achievementCategories = await Promise.all(
                achievementCategoriesToCreate.map(({ category, create, upsert }) => {
                    return ctx.prisma.achievementCategory.upsert({
                        where: {
                            projectId_airtableId: { projectId: category.projectId, airtableId: category.airtableId },
                        },
                        create: { ...category, achievements: { create } },
                        update: { ...category, achievements: { upsert } },
                        include: { achievements: true },
                    })
                }),
            )

            const userAddresses = airtableMembers.map((member) => member['wallet-address'])

            const prismaMembers = await ctx.prisma.user.findMany({
                where: { address: { in: userAddresses } },
            })

            const memberAchievementData: { userId: string; achievementId: number }[] = []

            for (const airtableMember of airtableMembers) {
                const prismaMember = prismaMembers.find((u) => u.address === airtableMember['wallet-address'])

                if (!prismaMember) {
                    console.error(`User with address ${airtableMember['wallet-address']} not found`)
                    continue
                }

                for (const field of achievementFields) {
                    const prismaAC = achievementCategories.find((ac) => ac.name === field.name)

                    if (!prismaAC) {
                        console.error(`AchievementCategory with name ${field.name} not found`)
                        continue
                    }

                    const fieldSlug = slugify(field.name)

                    if (!airtableMember[fieldSlug]) continue

                    if (field.type === 'multipleSelects') {
                        const achievementNames = airtableMember[fieldSlug]

                        const achievements = prismaAC.achievements.filter((prismaAchievement) =>
                            achievementNames.includes(prismaAchievement.name),
                        )

                        achievements.forEach((achievement) => {
                            memberAchievementData.push({
                                userId: prismaMember.id,
                                achievementId: achievement.id,
                            })
                        })
                    } else if (field.type === 'number') {
                        const memberLevel = Number(airtableMember[fieldSlug])

                        const padWithZeros = (num: number, sigFigs = 5): string => {
                            const numString = num.toFixed(0)
                            const numLength = numString.length
                            const numZeros = sigFigs - numLength
                            return '0'.repeat(numZeros) + numString
                        }

                        const fakeAirtableId = `${padWithZeros(prismaAC.id)}${padWithZeros(memberLevel)}`

                        const achievementData = {
                            achievementCategoryId: prismaAC.id,
                            name: `${prismaAC.name}: ${memberLevel}`,
                            level: memberLevel,
                            airtableId: fakeAirtableId,
                        }

                        const achievement = await ctx.prisma.achievement.upsert({
                            where: achievementData,
                            create: achievementData,
                            update: achievementData,
                        })

                        memberAchievementData.push({
                            userId: prismaMember.id,
                            achievementId: achievement.id,
                        })

                        await ctx.prisma.memberAchievements.updateMany({
                            where: {
                                userId: prismaMember.id,
                                achievement: {
                                    achievementCategory: {
                                        id: prismaAC.id,
                                    },
                                },
                            },
                            data: {
                                status: false,
                            },
                        })

                        // singleSelect
                    } else {
                        const achievement = prismaAC.achievements.find(
                            (prismaAchievement) => prismaAchievement.name === airtableMember[fieldSlug],
                        )

                        if (!achievement) {
                            console.log(`Achievement for category ${field.name} not found`)
                            continue
                        }

                        memberAchievementData.push({
                            userId: prismaMember.id,
                            achievementId: achievement.id,
                        })
                    }
                }
            }

            return ctx.prisma.memberAchievements.createMany({
                skipDuplicates: true,
                data: memberAchievementData,
            })
        }),
})
