import { RequirementAction, RequirementLogic } from '@prisma/client'
import { WebhookType } from 'alchemy-sdk'
import { env } from 'env/server.mjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'server/db/client'
import { achievementRouter } from 'server/trpc/router/achievement'
import { memberRouter } from 'server/trpc/router/member'
import { isValidAlchemySignature } from 'utils/backend'
import type { AlchemyWebhookData } from 'utils/types'

const trpcCallerConfig = {
    session: null,
    prisma: prisma,
    projectSlug: null,
    organizationSlug: null,
    network: null,
    webhookPassword: env.WEBHOOK_PASSWORD,
}

const achievementTrpc = achievementRouter.createCaller(trpcCallerConfig)
const memberTrpc = memberRouter.createCaller(trpcCallerConfig)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // const { contractAddress } = req.query as { contractAddress: string }
    try {
        /****************/
        /*     AUTH     */
        /****************/
        isValidAlchemySignature(req)
        // if (!isValidAlchemySignature(req)) {
        //     const error = 'invalid event-forwarder Signature';
        //     logger.error({ error });
        //     return res.status(400).send({ error });
        // }

        // console.log('alchemy webhook')
        // console.log(req.headers)
        // console.log(req.body)

        const { type, event } = req.body as AlchemyWebhookData

        console.log(req.body)

        const { network, activity: activityArr } = event

        if (type === WebhookType.NFT_ACTIVITY) {
            // get the requirement, which gets the achievements. then get the user based on the toAddress. then connect the user to all of the achievements

            for (const activity of activityArr) {
                const { contractAddress, toAddress } = activity
                console.log('activity', activity)

                const requirement = await achievementTrpc.getRequirement({
                    contractAddress,
                    network,
                    action: RequirementAction.OWN,
                })

                if (!requirement) {
                    console.log(`no requirement found for ${contractAddress} ${network} ${RequirementAction.OWN}`)
                    continue
                }

                const member = await memberTrpc.getByAddress({
                    address: toAddress,
                })

                if (!member) {
                    console.log(`no member found for ${toAddress}`)
                    continue
                }

                // TODO if it's the fromAddress, then we need set the achievementStatus to false

                // TODO handle RequirementLogic.AND
                const achievementIds = requirement.achievements
                    .filter((a) => a.requirementLogic === RequirementLogic.OR)
                    .map((a) => a.id)

                await achievementTrpc.createOrUpdateAchievementsForMember({
                    memberId: member.id,
                    achievementIds,
                })
            }
        }
    } catch (e) {
        console.error(e)
        console.log(req.body)
    } finally {
        if (req.method !== 'POST') {
            const metadata = {}
            res.setHeader('Content-Type', 'application/json')
            return res.status(200).send(metadata)
        }
        return res.status(200).json({ message: 'ok' })
    }
}
