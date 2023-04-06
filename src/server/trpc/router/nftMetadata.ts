import type { NftMetadata } from '@prisma/client'
import type { Attribute, NftMetadataWithTraits, OpenSeaMetadata } from 'utils/types'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'

const nftMetadataToOpenSeaFormat = (nftMetadata: NftMetadataWithTraits): OpenSeaMetadata => {
    const { name, description, image, externalUrl, traits } = nftMetadata

    const attributes: Attribute[] = traits.map((t) => ({ trait_type: t.traitCategoryName, value: t.name }))

    attributes.push({
        display_type: 'date',
        trait_type: 'Last Updated',
        value: Math.floor(nftMetadata.timestamp.getTime() / 1000).toString(),
    })

    return {
        name,
        description,
        image: image ?? '',
        external_url: externalUrl ?? '',
        attributes,
    }
}

export const nftMetadataRouter = router({
    getForOpenseaByTokenId: publicProcedure
        .input(z.object({ tokenId: z.string(), projectSlug: z.string(), chainNetwork: z.string() }))
        .query(async ({ ctx, input }) => {
            const { tokenId, projectSlug, chainNetwork } = input

            const data = await ctx.prisma.$queryRaw<NftMetadata[]>`WITH max_timestamps AS (
                SELECT "userId", MAX("timestamp") AS "timestamp"
                FROM "NftMetadata"
                WHERE "projectSlug" = ${projectSlug}
                AND "network" = ${chainNetwork}
                AND "tokenId" = ${Number(tokenId)}
                GROUP BY "userId"
              )
              SELECT "NftMetadata".*
              FROM "NftMetadata"
              JOIN max_timestamps ON "NftMetadata"."userId" = max_timestamps."userId"
                AND "NftMetadata"."timestamp" = max_timestamps."timestamp"
              ORDER BY "timestamp" DESC;`

            // console.log('data', data)
            const latestNftMetadata = await ctx.prisma.nftMetadata.findFirstOrThrow({
                where: { id: { in: data.map((d) => d.id) } },
                include: {
                    traits: true,
                },
            })
            // return latestNftMetadata
            return nftMetadataToOpenSeaFormat(latestNftMetadata)
        }),
    addTokenId: protectedProcedure
        .input(z.object({ tokenId: z.number(), projectSlug: z.string(), network: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { tokenId, projectSlug, network } = input

            const member = await ctx.prisma.user.findFirst({ where: { privyDID: ctx.session.userId } })

            return ctx.prisma.nftMetadata.updateMany({
                where: {
                    userId: member?.id,
                    projectSlug,
                    network,
                },
                data: {
                    tokenId,
                },
            })
        }),
    addTokenIdFromEventForwarder: publicProcedure
        .input(
            z.object({
                projectSlug: z.string(),
                address: z.string(),
                tokenId: z.number(),
                network: z.string(),
                // for eventForwarder signature check
                authToken: z.string(),
                signature: z.string(),
                body: z.any(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { tokenId, projectSlug, network, address } = input

            console.log('addTokenIdFromEventForwarder', input)

            const member = await ctx.prisma.user.findFirst({ where: { address } })

            await ctx.prisma.nftMetadata.updateMany({
                where: {
                    userId: member?.id,
                    projectSlug,
                    network,
                },
                data: {
                    tokenId,
                },
            })

            return {
                minterAddress: member?.address,
                tokenId,
                ensName: '', // TODO
            }
        }),
})
