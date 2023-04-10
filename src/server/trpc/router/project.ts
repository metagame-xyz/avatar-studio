import type { AchievementType, NftMetadata } from '@prisma/client'
import { User as PrivyUser } from '@privy-io/server-auth'
import { TRPCError } from '@trpc/server'
import type { FieldSet } from 'airtable'
import { clientEnv } from 'env/schema.mjs'
import { providers } from 'ethers'
import { filterToAchievementFields, slugify } from 'utils'
import airtable, { airtableAuthExpiredObj, airtableAuthNotPresentObj, airtableLockErrorObj } from 'utils/airtable'
import type { AirtableFieldType, AirtableWebhookResponse } from 'utils/airtableFrontend'
import { AirtableAuthError, airtableFieldSchema, AirtableLockError } from 'utils/airtableFrontend'
import { privyAddUser } from 'utils/backend'
import { getAddressFromString } from 'utils/needEnvUtils'
import type { MostTypes } from 'utils/types'
import { newAirtableMemberSchema } from 'utils/types'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router, webhookOrOrgAdminProcedure } from '../trpc'

export const projectRouter = router({
    getProject: publicProcedure.query(async ({ ctx }) => {
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

                const members = await airtable.getMembers(project.airtableProject)

                const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)

                const walletAddressFieldName = slugify(project.airtableProject.walletAddressFieldName)

                async function updateMember(member: Record<string, MostTypes>) {
                    if (member.ens && typeof member.ens === 'string') {
                        const address = await provider.resolveName(member.ens)
                        member[walletAddressFieldName] = address?.toLowerCase()
                    }

                    if (member[walletAddressFieldName] && typeof member[walletAddressFieldName] === 'string') {
                        try {
                            const address = await getAddressFromString(member[walletAddressFieldName] as string) // shouldn't need this, the check is done in the if statement above...?
                            member[walletAddressFieldName] = address?.toLowerCase()

                            const ens = await provider.lookupAddress(address)
                            member.ens = ens
                        } catch (err: Error | any) {
                            console.error(err)
                        }
                    }

                    return member as FieldSet
                }

                const updatedMembers = await (
                    await Promise.all(members.map(async (member) => updateMember(member)))
                ).filter((member) => !!member[walletAddressFieldName])

                let airtableFields = await airtable.getTableFields(project.airtableProject)
                airtableFields = airtableFields || []

                const achievementFields = filterToAchievementFields(airtableFields, walletAddressFieldName)

                return { bases, members: updatedMembers, achievementFields, error: null }
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
                airtableMembers: z.array(newAirtableMemberSchema),
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
            const walletAddressFieldName = slugify(project.airtableProject.walletAddressFieldName)

            const users = await Promise.all(
                input.airtableMembers.map(async (member) => {
                    const existingUser = await ctx.prisma.user.findUnique({
                        where: { address: member[walletAddressFieldName] },
                    })
                    let privyUser: PrivyUser | null = null

                    // TODO update this to "privyUpdateUser once Privy adds that option"
                    if (!existingUser) {
                        privyUser = await privyAddUser(member, walletAddressFieldName)
                    }

                    let lastName: string | null = null
                    let firstName: string | null = null

                    if (member.name) {
                        // pop off the last word in the string
                        lastName = member.name.split(' ').pop() || null
                        // combine the rest of the words into a string
                        firstName = member.name.split(' ').slice(0, -1).join(' ') || null
                    }

                    const privyDID = (existingUser?.privyDID || privyUser?.id) as string
                    const user = await ctx.prisma.user.upsert({
                        where: {
                            privyDID,
                        },
                        update: {
                            firstName: member['first-name'] || firstName || existingUser?.firstName,
                            lastName: member['last-name'] || lastName || existingUser?.lastName,
                            email: member.email || existingUser?.email,
                        },
                        create: {
                            privyDID,
                            address: member[walletAddressFieldName],
                            firstName: member['first-name'] || firstName,
                            lastName: member['last-name'] || lastName,
                            email: member.email,
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

                    return user
                }),
            )

            await Promise.all(
                users.map(async (user) => {
                    await ctx.prisma.membersOfProjects.upsert({
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
                }),
            )
        }),
    syncAirtableAchievements: webhookOrOrgAdminProcedure
        .input(
            z.object({
                organizationSlug: z.string(),
                airtableFields: z.array(airtableFieldSchema),
                airtableMembers: z.array(newAirtableMemberSchema),
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
