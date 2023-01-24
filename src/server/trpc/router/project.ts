import type { NftMetadata } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { slugify } from 'utils'
import type { TraitWithEarnedBool } from 'utils/types'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'

export const projectRouter = router({
    getBySlug: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            try {
                const data = await ctx.prisma.project.findUniqueOrThrow({
                    where: {
                        slug: input,
                    },
                    include: {
                        members: { include: { member: true } },
                        organization: true,
                        traitCategories: { include: { traits: true } },
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
        .input(z.object({ name: z.string(), organizationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            console.log('input', input)
            const { name, organizationId } = input
            const slug = slugify(name)

            return ctx.prisma.project.create({
                data: {
                    name,
                    slug,
                    organization: { connect: { id: organizationId } },
                },
            })
        }),
    getAllNftMetadata: publicProcedure
        .input(z.object({ projectSlug: z.string(), chainName: z.string() }))
        .query(async ({ ctx, input }) => {
            const network = ctx.network
            const { projectSlug } = input

            console.log('projectSlug', projectSlug)
            console.log('network', network)

            const data = await ctx.prisma.$queryRaw<
                NftMetadata[]
            >`SELECT * FROM NftMetadata WHERE projectSlug = ${projectSlug} AND network = ${network}
            GROUP BY userId
            HAVING MAX(timestamp)`

            console.log('data', data)

            const LatestNftMetadataArr = await ctx.prisma.nftMetadata.findMany({
                where: { id: { in: data.map((d) => d.id) } },
                include: {
                    traits: true,
                },
            })

            return LatestNftMetadataArr
        }),
    getUsedNftCombos: publicProcedure
        .input(z.object({ projectSlug: z.string(), chainName: z.string() }))
        .query(async ({ ctx, input }) => {
            const network = ctx.network
            const { projectSlug } = input

            console.log('projectSlug', projectSlug)
            console.log('network', network)

            const data = await ctx.prisma.$queryRaw<
                NftMetadata[]
            >`SELECT * FROM NftMetadata WHERE projectSlug = ${projectSlug} AND network = ${network}
            GROUP BY userId
            HAVING MAX(timestamp)`

            console.log('data', data)

            const LatestNftMetadataArr = await ctx.prisma.nftMetadata.findMany({
                where: { id: { in: data.map((d) => d.id) } },
                include: {
                    traits: { include: { traitCategory: true } },
                },
            })

            const traitsWithEarnedBool = LatestNftMetadataArr.map((nft) => {
                return nft.traits.map((t) => {
                    return {
                        ...t,
                        category: t.traitCategory.name,
                        zIndex: t.traitCategory.zIndex,
                        earned: true,
                        isModifiable: t.traitCategory.isModifiable,
                    } as TraitWithEarnedBool
                }) as TraitWithEarnedBool[]
            })

            const usedNonModifiableCombos: Set<string> = new Set()
            // const usedNonModifiableCombos: string[] = []

            for (const traitWithEarnedBool of traitsWithEarnedBool) {
                usedNonModifiableCombos.add(
                    traitWithEarnedBool
                        .filter((t) => !t.isModifiable)
                        .sort((a, b) => a.zIndex - b.zIndex)
                        .reduce(
                            (acc, { category, name }) =>
                                `${acc} ${category}:${name}`,
                            '',
                        )
                        .trim(),
                )
            }

            return usedNonModifiableCombos

            // return LatestNftMetadataArr
        }),
})
