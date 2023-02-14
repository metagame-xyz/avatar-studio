import type { AchievementType, NftMetadata } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import type { FieldSet } from 'airtable'
import { clientEnv } from 'env/schema.mjs'
import { providers } from 'ethers'
import { slugify } from 'utils'
import airtable, { airtableAuthErrorObj, airtableLockErrorObj } from 'utils/airtable'
import { AirtableAuthError, airtableFieldSchema, AirtableLockError } from 'utils/airtableFrontend'
import { privyAddUser } from 'utils/backend'
import type { MostTypes } from 'utils/types'
import { newAirtableMemberSchema } from 'utils/types'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'

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
                    AchievementCategory: true,
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
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { projectSlug, baseName, tableName, baseId, tableId } = input
            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: projectSlug },
                select: { id: true },
            })
            // add AirtableProject and connect it to the project
            return ctx.prisma.airtableProject.create({
                data: {
                    baseName,
                    tableName,
                    baseId,
                    tableId,
                    project: { connect: { id: project.id } },
                },
            })
        }),
    getAllAirtableData: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string() })) // for protectedOrgProcedure to work
        .query(async ({ ctx }) => {
            if (!ctx.projectSlug) throw new Error('Cant get slug from context')

            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: ctx.projectSlug },
                include: {
                    airtableProject: true,
                    organization: {
                        include: {
                            airtableAuth: true,
                        },
                    },
                },
            })

            if (!project.airtableProject || !project.organization.airtableAuth)
                return { bases: null, members: null, achievementFields: null, error: airtableAuthErrorObj }

            try {
                await airtable.setOrg(project.organization.slug, 'getAllAirtableData')

                let bases = await airtable.getBasesList()
                bases = !bases || !bases[0] ? [] : bases

                for (const base of bases) {
                    const tables = await airtable.getTablesList(base.id)
                    base.tables = tables || []
                }

                const members = await airtable.getMembers(project.airtableProject)

                const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)

                async function updateMember(member: Record<string, MostTypes>) {
                    if (member['ens'] && typeof member['ens'] === 'string') {
                        const address = await provider.resolveName(member['ens'])
                        member['wallet-address'] = address?.toLowerCase()
                    }

                    if (member['wallet-address'] && typeof member['wallet-address'] === 'string') {
                        const ens = await provider.lookupAddress(member['wallet-address'])
                        member['ens'] = ens
                    }

                    return member as FieldSet
                }

                const updatedMembers = await Promise.all(members.map(async (member) => updateMember(member)))

                let airtableFields = await airtable.getTableFields(project.airtableProject)
                airtableFields = airtableFields || []
                const nonAchievementFields = ['first-name', 'last-name', 'email', 'wallet-address', 'ens']

                const allowedAchievementTypes = ['number', 'checkbox', 'singleLineText']

                const achievementFields = airtableFields
                    .filter((field) => !nonAchievementFields.includes(slugify(field.name)))
                    .filter((field) => allowedAchievementTypes.includes(field.type))

                return { bases, members: updatedMembers, achievementFields, error: null }
            } catch (err) {
                if (err instanceof AirtableAuthError) {
                    return { bases: null, members: null, achievementFields: null, error: airtableAuthErrorObj }
                } else if (err instanceof AirtableLockError) {
                    return { bases: null, members: null, achievementFields: null, error: airtableLockErrorObj }
                } else {
                    throw err
                }
            } finally {
                airtable.postCallCleanup('getAllAirtableData')
            }
        }),
    deleteAllMembers: publicProcedure.query(async ({ ctx }) => {
        // const users = await privyGetAllUsers()
        // await users.map(async (user) => {
        //     await privyDeleteUser(user.id)
        // })
        // console.log(users.map((u) => `${u.id} ${JSON.stringify(u.linked_accounts[0])}`))
    }),
    syncAirtableMembers: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string(), airtableMembers: z.array(newAirtableMemberSchema) }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.projectSlug) throw new Error('Cant get slug from context')

            // const users = await privyGetAllUsers()
            // await users.map(async (user) => {
            //     await privyDeleteUser(user.id)
            // })
            // console.log(users.map((u) => `${u.id} ${JSON.stringify(u.linked_accounts[0])}`))

            const users = await Promise.all(
                input.airtableMembers.map(async (member) => {
                    const existingUser = await ctx.prisma.user.findUnique({
                        where: { address: member['wallet-address'] },
                    })
                    if (existingUser) {
                        return existingUser
                    } else {
                        const privyUser = await privyAddUser(member)
                        const user = await ctx.prisma.user.create({
                            data: {
                                privyDID: privyUser.id,
                                address: member['wallet-address'],
                                firstName: member['first-name'],
                                lastName: member['last-name'],
                                email: member.email,
                            },
                        })

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

                        return user
                    }
                }),
            )

            const project = await ctx.prisma.project.findUnique({ where: { slug: ctx.projectSlug } })
            if (!project) {
                throw new Error('Project not found')
            }

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
    syncAirtableAchievementCategories: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string(), airtableFields: z.array(airtableFieldSchema) })) // for protectedOrgProcedure to work
        .mutation(async ({ ctx, input }) => {
            if (!ctx.projectSlug) throw new Error('Cant get slug from context')

            const project = await ctx.prisma.project.findUniqueOrThrow({
                where: { slug: ctx.projectSlug },
                select: { id: true },
            })

            const airtableFieldToAchievementCategoryType = (airtableType: string): AchievementType => {
                switch (airtableType) {
                    case 'number':
                        return 'LEVEL'
                    case 'checkbox':
                    case 'singleLineText':
                        return 'SPECIFIC_ACHIEVEMENT'
                    default:
                        return 'SPECIFIC_ACHIEVEMENT'
                }
            }

            const achievementCategoriesToCreate = input.airtableFields.map((field) => {
                return {
                    projectId: project.id,
                    airtableId: field.id,
                    name: field.name,
                    description: field.description,
                    type: airtableFieldToAchievementCategoryType(field.type),
                }
            })

            const createdResponse = await ctx.prisma.achievementCategory.createMany({
                data: achievementCategoriesToCreate,
                skipDuplicates: true,
            })

            return createdResponse
        }),
})
