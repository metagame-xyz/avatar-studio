import type { NextApiRequest, NextApiResponse } from 'next'

import { prisma } from 'server/db/client'
import airtable from 'utils/airtable'

// export const config = {
//     runtime: 'edge',
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const airtableProjects = await prisma.airtableProject.findMany({
        include: {
            project: {
                include: {
                    organization: true,
                },
            },
        },
    })

    const webhookIds: Record<string, string> = {}
    // todo make this concurrent
    for (const airtableProject of airtableProjects) {
        if (!airtableProject.webhookId) {
            console.log(`No webhook for ${airtableProject.project.organization.slug}/${airtableProject.project.name}`)
            continue
        }

        webhookIds[
            `${airtableProject.project.organization.slug}/${airtableProject.project.slug}/${airtableProject.baseName}`
        ] = airtableProject.webhookId

        await airtable.setOrg(airtableProject.project.organization.slug)
        // console.log(
        //     `Refreshing webhook for ${airtableProject.project.organization.slug}/${airtableProject.project.name} with id ${airtableProject.webhookId}`,
        // )
        await airtable.refreshWebhook(airtableProject.baseId, airtableProject.webhookId)
    }

    return res.status(200).json({ webhookIds })
}
