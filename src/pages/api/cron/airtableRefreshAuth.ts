import type { NextApiRequest, NextApiResponse } from 'next'

import { prisma } from 'server/db/client'
import airtable from 'utils/airtable'

// export const config = {
//     runtime: 'edge',
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const orgs = await prisma.organization.findMany({
        include: {
            airtableAuth: true,
        },
    })

    const webhookIds: Record<string, string> = {}
    // todo make this concurrent
    for (const org of orgs) {
        await airtable.setOrg(org.slug)
        await airtable.safeRefreshAirtableAuth()
    }

    return res.status(200).json({ webhookIds })
}
