import type { NftMetadata } from '@prisma/client'
import type { Attribute, NftMetadataWithTraits, OpenSeaMetadata } from 'utils/types'
import { z } from 'zod'
import { publicProcedure, router } from '../trpc'

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
})
