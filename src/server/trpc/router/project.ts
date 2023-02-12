import type { NftMetadata } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { clientEnv } from 'env/schema.mjs'
import { providers } from 'ethers'
import { slugify } from 'utils'
import Airtable from 'utils/Airtable'
import { privyAddUser } from 'utils/backend'
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
    getAirtableMembersList: protectedOrgProcedure
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

            if (!project.airtableProject || !project.organization.airtableAuth) return null

            try {
                const airtable = new Airtable(project.organization.airtableAuth)
                const members = await airtable.getMembers(project.airtableProject)

                const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)

                async function updateMember(member: any) {
                    if (member['ens']) {
                        const address = await provider.resolveName(member['ens'])
                        member['wallet-address'] = address?.toLowerCase()
                    }

                    if (member['wallet-address']) {
                        const ens = await provider.lookupAddress(member['wallet-address'])
                        member['ens'] = ens
                    }

                    return member
                }

                const updatedMembers = await Promise.all(members.map(async (member) => updateMember(member)))

                return updatedMembers
            } catch (err) {
                console.log(err)
            }
            return null
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
                        console.log('privyUser', privyUser)

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
})
