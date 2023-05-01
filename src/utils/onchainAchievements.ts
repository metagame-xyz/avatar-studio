import { RequirementAction } from '@prisma/client'
import type { Network, NftWebhookParams } from 'alchemy-sdk'
import { Alchemy, WebhookType } from 'alchemy-sdk'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'

export const getAlchemy = (network: string) => {
    return new Alchemy({
        apiKey: clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID,
        network: network as Network,
        authToken: serverEnv.ALCHEMY_NOTIFY_TOKEN,
    })
}

const webhookUrl = `${serverEnv.BASE_URL}/api/alchemy/webhook`

export const getOwnersForContract = async (contractAddress: string, network: string): Promise<string[]> => {
    const alchemy = getAlchemy(network)

    const response = await alchemy.nft.getOwnersForContract(contractAddress)
    console.log('count:', response.owners.length)
    return response.owners
}

export const getAddressesByRequirement = async (
    contractAddress: string,
    network: string,
    action: RequirementAction,
) => {
    if (action === RequirementAction.OWN) {
        return getOwnersForContract(contractAddress, network)
    }
}

export const createNftWebhook = async (contractAddress: string, network: string) => {
    const alchemy = getAlchemy(network)

    const params: NftWebhookParams = {
        filters: [
            {
                contractAddress,
            },
        ],
        network: network as Network,
        // network: 'ETH_SEPOLIA' as Network,
    }

    console.log(params)
    console.log(webhookUrl)

    try {
        const response = await alchemy.notify.createWebhook(webhookUrl, WebhookType.NFT_ACTIVITY, params)
        console.log('response:', response)
        return response
    } catch (e) {
        console.log('error obj', JSON.stringify(e))
        // console.log('error message', e.message)
        // console.log()
        throw e
    }
}

export const createOrUpdateNftWebhook = async (contractAddress: string, network: string) => {
    const alchemy = getAlchemy(network)

    const { webhooks } = await alchemy.notify.getAllWebhooks()

    console.log('webhooks:', webhooks)
    // find the webhook that matches the network, webhook type, and env (via url)
    const webhook = webhooks.find(
        (w) => w.network === network && w.type === WebhookType.NFT_ACTIVITY && w.url === webhookUrl,
    )

    if (!webhook) {
        console.log('creating new webhook')
        await createNftWebhook(contractAddress, network)
        console.log('new webhook created')
    } else {
        console.log('updating webhook')
        await alchemy.notify.updateWebhook(webhook.id, {
            addFilters: [
                {
                    contractAddress,
                },
            ],
        })
        console.log('webhook updated')
    }
}

// requirements

/**
 * Achievements have a set of requirements that must be met to earn the achievement.
 * No easy way to do ((A && B) || (C))
 * Not bad to do [OR | AND] (A, B, C)
 *
 * A requirement, for now, is:
 * - contract address
 * - network
 * - action: own, minted, called X function
 *
 * When a requirement is connected to an achievement:
 * - the requirement does two things:
 *   - finds all addresses for that project that match that requirement
 *      - create member<>achievement for each address
 *   - creates a an alchemy Notify webhook for that requirement
 *      - webhook data is attached to the requirement
 *      - creates a new member<>achievement for new each address that matches the requirement
 *      - sets status:false to member<>achievement for addresses that no longer match the requirement
 *
 *
 */
