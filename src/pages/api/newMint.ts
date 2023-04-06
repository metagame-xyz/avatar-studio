import { env as serverEnv } from 'env/server.mjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'server/db/client'
import { nftMetadataRouter } from 'server/trpc/router/nftMetadata'
import { isValidEventForwarderSignature } from 'utils/backend'
// import { LogData, logError, logSuccess } from 'utils/logging'

const nftMetadataTrpc = nftMetadataRouter.createCaller({
    session: null,
    prisma: prisma,
    projectSlug: null,
    organizationSlug: null,
    network: null,
    webhookPassword: null,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(404).send({})
    }

    /****************/
    /*     AUTH     */
    /****************/
    if (!isValidEventForwarderSignature(req)) {
        const error = 'invalid event-forwarder Signature'
        return res.status(403).send({ error })
    }
    const { minterAddress, tokenId, nftName } = req.body
    const address = minterAddress.toLowerCase()

    const isProd = process.env.VERCEL_ENV === 'production' // TODO confirm
    const network = isProd ? 'homestead' : 'sepolia'

    // const logData: LogData = {
    //     level: 'info',
    //     function_name: 'newTransaction',
    //     message: `begin`,
    //     token_id: tokenId,
    //     wallet_address: address,
    // }

    try {
        const result = await nftMetadataTrpc.addTokenIdFromEventForwarder({
            projectSlug: nftName,
            address,
            tokenId: Number(tokenId),
            network,
            authToken: serverEnv.EVENT_FORWARDER_AUTH_TOKEN,
            signature: req.headers['x-event-forwarder-signature'] as string,
            body: req.body,
        })

        // logSuccess(logData)
        res.status(200).send({
            status: 1,
            message: 'success',
            result,
        })
    } catch (error) {
        console.error('error', error)
        // logError(logData, error)
        return res.status(500).send({ error })
    }
}
