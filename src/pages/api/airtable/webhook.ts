import { env } from 'env/server.mjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'server/db/client'
import { projectRouter } from 'server/trpc/router/project'
import { isValidAirtableWebhook } from 'utils/backend'
import { newAirtableMemberSchema } from 'utils/types'
import { z } from 'zod'

// export const config = {
//     runtime: 'edge',
// }

const projectTrpc = projectRouter.createCaller({
    session: null,
    prisma: prisma,
    projectSlug: null,
    organizationSlug: null,
    network: null,
    webhookPassword: env.WEBHOOK_PASSWORD,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(404).send({})
    }

    const webhookSchema = z.object({
        base: z.object({
            id: z.string(),
        }),
        webhook: z.object({
            id: z.string(),
        }),
        timestamp: z.string(),
    })

    const body = webhookSchema.parse(req.body)
    const baseId = body.base.id

    const airtableProject = await prisma.airtableProject.findFirst({
        where: {
            baseId,
            webhookId: body.webhook.id,
        },
        include: {
            project: {
                include: {
                    organization: true,
                },
            },
        },
    })

    if (!airtableProject) {
        const error = `no airtable project found for baseId ${baseId} webhookId ${body.webhook.id}`
        console.log(error)
        return res.status(200).send({})
    }

    const macSecret = airtableProject?.macSecretBase64

    if (!macSecret) {
        const error = `no mac secret found for ${airtableProject?.baseName} ${airtableProject?.tableName}`
        console.log(error)
        return res.status(200).send({})
    }

    if (!isValidAirtableWebhook(req, macSecret)) {
        const error = 'invalid airtable webhook signature'
        return res.status(403).send({ error })
    }

    const organizationSlug = airtableProject.project.organization.slug

    const data = await projectTrpc.getAllAirtableData({ organizationSlug })

    if (!data || data.error) {
        console.log('error getting airtable data', data?.error)
        return res.status(200).send({})
    }

    if (!data.members) {
        console.log('no members found')
        return res.status(200).send({})
    }

    if (!data.achievementFields) {
        console.log('no achievement fields found')
        return res.status(200).send({})
    }

    const airtableMembers = data.members.map((m) => newAirtableMemberSchema.parse(m))

    await projectTrpc.syncAirtableMembers({ organizationSlug, airtableMembers })
    await projectTrpc.syncAirtableAchievements({
        organizationSlug,
        airtableMembers,
        airtableFields: data.achievementFields,
    })

    console.log(`synced ${airtableMembers.length} members and ${data.achievementFields.length} achievements`)

    return res.status(200).json({})
}
