import type { AirtableProject, OrganizationAirtableAuth } from '@prisma/client'
import type { FieldSet } from 'airtable'
import AirtableApiClient from 'airtable'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import qs from 'qs'
import { slugify } from 'utils'
import { prisma } from '../server/db/client'
import type { AirtableBase, AirtableField, AirtableOAuthResponse, AirtableTable } from './airtableFrontend'
import { createAuthHeader } from './backend'
import type { MostTypes } from './types'

export default class Airtable {
    private baseUrl = clientEnv.NEXT_PUBLIC_AIRTABLE_URL
    private airtableAuth: OrganizationAirtableAuth | null
    private airtableAuthHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: createAuthHeader(clientEnv.NEXT_PUBLIC_AIRTABLE_CLIENT_ID, serverEnv.AIRTABLE_CLIENT_SECRET),
    }

    constructor(airtableAuth: OrganizationAirtableAuth | null = null) {
        this.airtableAuth = airtableAuth
    }

    private async refreshAirtableAuth(): Promise<void> {
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }
        let airtableResponse: AirtableOAuthResponse
        try {
            airtableResponse = await fetch(`${this.baseUrl}/oauth2/v1/token`, {
                method: 'POST',
                headers: this.airtableAuthHeaders,
                body: qs.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: this.airtableAuth.refreshToken,
                }),
            }).then((res) => res.json() as Promise<AirtableOAuthResponse>)
        } catch (error) {
            console.log('Airtable Response Error', error)
            throw new Error('Airtable issue')
        }

        const updatedAirtableAuth = await prisma.organizationAirtableAuth.update({
            where: {
                organizationSlug: this.airtableAuth.organizationSlug,
            },
            data: {
                accessToken: airtableResponse.access_token,
                refreshToken: airtableResponse.refresh_token,
                scope: airtableResponse.scope,
            },
        })
        this.airtableAuth = updatedAirtableAuth
    }

    private isAccessTokenExpired(): boolean {
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }
        return new Date(Date.now()) > this.airtableAuth.accessTokenExpiration
    }

    public async getAirtableAuth(
        code: string,
        codeVerifier: string,
        organizationSlug: string,
        privyDID: string,
    ): Promise<string> {
        let airtableResponse: AirtableOAuthResponse
        try {
            airtableResponse = await fetch(`${clientEnv.NEXT_PUBLIC_AIRTABLE_URL}/oauth2/v1/token`, {
                method: 'POST',
                headers: this.airtableAuthHeaders,
                body: qs.stringify({
                    code_verifier: codeVerifier,
                    redirect_uri: clientEnv.NEXT_PUBLIC_AIRTABLE_REDIRECT_URI,
                    code,
                    grant_type: 'authorization_code',
                }),
            }).then((res) => res.json() as Promise<AirtableOAuthResponse>)
        } catch (error) {
            console.log('Airtable Response Error', error)
            throw new Error('Airtable issue')
        }
        const { access_token, refresh_token, expires_in, refresh_expires_in } = airtableResponse

        const user = await prisma.user.findUniqueOrThrow({ where: { privyDID } })

        const authData = {
            organizationSlug,
            accessToken: access_token,
            refreshToken: refresh_token,
            accessTokenExpiration: new Date(Date.now() + expires_in * 1000),
            refreshTokenExpiration: new Date(Date.now() + refresh_expires_in * 1000),
            accessGrantedUserId: user.id,
            scope: clientEnv.NEXT_PUBLIC_AIRTABLE_SCOPE,
        }

        await prisma.organizationAirtableAuth.upsert({
            where: {
                organizationSlug,
            },
            create: authData,
            update: authData,
        })

        return organizationSlug
    }

    public async getBasesList(): Promise<AirtableBase[] | undefined> {
        if (this.isAccessTokenExpired()) await this.refreshAirtableAuth()

        const url = 'https://api.airtable.com/v0/meta/bases'
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth?.accessToken}`,
            },
        }).then((res) => res.json())

        return data.bases
    }

    public async getTablesList(baseId: string): Promise<AirtableTable[] | undefined> {
        if (this.isAccessTokenExpired()) await this.refreshAirtableAuth()

        const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth?.accessToken}`,
            },
        }).then((res) => res.json())

        return data.tables
    }

    public async getTableFields(airtableProject: AirtableProject): Promise<AirtableField[] | undefined> {
        if (this.isAccessTokenExpired()) await this.refreshAirtableAuth()

        const url = `https://api.airtable.com/v0/meta/bases/${airtableProject.baseId}/tables`
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth?.accessToken}`,
            },
        }).then((res) => res.json())

        const table = data.tables.find((table: AirtableTable) => table.id === airtableProject.tableId)

        return table?.fields
    }

    public async getMembers(airtableProject: AirtableProject): Promise<Record<string, MostTypes>[]> {
        if (this.isAccessTokenExpired()) await this.refreshAirtableAuth()

        const membersTable = new AirtableApiClient({ apiKey: this.airtableAuth?.accessToken }).base(
            airtableProject.baseId,
        )(airtableProject.tableId)

        const memberRecords = await membersTable.select({}).all()
        const members = memberRecords.map((record) => record.fields)

        const slugifyKeys = (arr: Record<string, MostTypes>[] | FieldSet[]): Record<string, MostTypes>[] => {
            return arr.map((obj) => {
                const transformedObj: Record<string, MostTypes> = {}
                Object.keys(obj).forEach((key) => {
                    const value = obj[key]
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        transformedObj[slugify(key)] = value
                    }
                })
                return transformedObj
            })
        }

        return slugifyKeys(members)
    }
}
