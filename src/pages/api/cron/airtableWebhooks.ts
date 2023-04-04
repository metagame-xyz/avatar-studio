import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from 'server/db/client'
import airtable from 'utils/airtable'

export default async function handler(req: NextRequest) {
    const airtableProjects = await prisma.airtableProject.findMany({
        include: {
            project: {
                include: {
                    organization: true,
                },
            },
        },
    })

    for (const airtableProject of airtableProjects) {
        if (!airtableProject.webhookId) {
            console.log(`No webhook for ${airtableProject.project.organization.slug}/${airtableProject.project.name}`)
            continue
        }

        await airtable.setOrg(airtableProject.project.organization.slug)
        await airtable.refreshWebhook(airtableProject.baseId, airtableProject.webhookId)
    }

    return new NextResponse(JSON.stringify({}), { status: 200 })
}
