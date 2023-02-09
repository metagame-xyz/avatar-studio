import type { OrganizationAirtableAuth } from '@prisma/client'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import qs from 'qs'
import { prisma } from '../server/db/client'
import type { AirtableOAuthResponse } from './airtable'

const encodedCredentials = Buffer.from(
    `${clientEnv.NEXT_PUBLIC_AIRTABLE_CLIENT_ID}:${serverEnv.AIRTABLE_CLIENT_SECRET}`,
).toString('base64')

export const airtableAuthHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${encodedCredentials}`,
}

export const refreshAirtableAuth = async (
    airtableAuth: OrganizationAirtableAuth,
): Promise<OrganizationAirtableAuth> => {
    let airtableResponse: AirtableOAuthResponse
    try {
        airtableResponse = await fetch(`${clientEnv.NEXT_PUBLIC_AIRTABLE_URL}/oauth2/v1/token`, {
            method: 'POST',
            headers: airtableAuthHeaders,
            body: qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: airtableAuth.refreshToken,
            }),
        }).then((res) => res.json() as Promise<AirtableOAuthResponse>)
    } catch (error) {
        console.log('Airtable Response Error', error)
        throw new Error('Airtable issue')
    }

    const updatedAirtableAuth = await prisma.organizationAirtableAuth.update({
        where: {
            organizationSlug: airtableAuth.organizationSlug,
        },
        data: {
            accessToken: airtableResponse.access_token,
            refreshToken: airtableResponse.refresh_token,
            scope: airtableResponse.scope,
        },
    })

    return updatedAirtableAuth
}
