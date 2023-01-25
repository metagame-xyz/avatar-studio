import type { NftMetadata } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { slugify } from 'utils'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'

export const projectRouter = router({
    getBySlug: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
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

            const data = await ctx.prisma.$queryRaw<
                NftMetadata[]
            >`SELECT * FROM NftMetadata WHERE projectSlug = ${projectSlug} AND network = ${network}
            GROUP BY userId
            HAVING MAX(timestamp)`

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

            console.log('ctx.projectSlug', ctx.projectSlug)
            console.log('network', network)

            const data = await ctx.prisma.$queryRaw<
                NftMetadata[]
            >`SELECT * FROM NftMetadata WHERE projectSlug = ${projectSlug} AND network = ${network}
            GROUP BY userId
            HAVING MAX(timestamp)`

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
})
