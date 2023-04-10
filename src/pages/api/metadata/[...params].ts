import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'server/db/client'
import { nftMetadataRouter } from 'server/trpc/router/nftMetadata'

const nftMetadataTrpc = nftMetadataRouter.createCaller({
    session: null,
    prisma: prisma,
    projectSlug: null,
    organizationSlug: null,
    network: null,
    webhookPassword: null,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { params } = req.query as { params: string[] }
    const projectSlug = params[0] as string
    const tokenId = params[1] as string

    const isProd = process.env.VERCEL_ENV === 'production' // TODO confirm
    const chainNetwork = isProd ? 'homestead' : 'sepolia'

    try {
        const nftMetadata = await nftMetadataTrpc.getForOpenseaByTokenId({
            tokenId,
            projectSlug,
            chainNetwork,
        })
        if (!nftMetadata) {
            return res.status(404).json({ message: 'Not found' })
        }

        return res.status(200).json(nftMetadata)
    } catch (err) {
        console.error('getNftMetadataByProjectAndTokenId error', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}
