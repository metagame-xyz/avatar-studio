import type { AirtableProject, OrganizationAirtableAuth } from '@prisma/client'
import type { FieldSet } from 'airtable'
import AirtableApiClient from 'airtable'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import qs from 'qs'
import { slugify } from 'utils'
import { prisma } from '../server/db/client'
import type {
    AirtableBase,
    AirtableField,
    AirtableOAuthError,
    AirtableOAuthResponse,
    AirtableTable,
    AirtableWebhookError,
    AirtableWebhookRefreshResponse,
    AirtableWebhookResponse,
} from './airtableFrontend'
import { AirtableAuthError, AirtableLockError } from './airtableFrontend'
import { createAuthHeader, sleep } from './backend'
import type { MostTypes } from './types'

export const airtableAuthExpiredObj = {
    error: 'Auth Token Expired',
    action: 'REAUTH_AIRTABLE',
}
export const airtableAuthNotPresentObj = {
    error: 'Hasnt Authed Airtable',
    action: 'REAUTH_AIRTABLE',
}
export const airtableLockErrorObj = {
    error: 'Airtable Auth Locked by other process',
    action: 'NONE',
}

class Airtable {
    private baseUrl = clientEnv.NEXT_PUBLIC_AIRTABLE_URL
    private organizationSlug: string | null
    private airtableAuth: OrganizationAirtableAuth | null = null
    private airtableAuthHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: createAuthHeader(clientEnv.NEXT_PUBLIC_AIRTABLE_CLIENT_ID, serverEnv.AIRTABLE_CLIENT_SECRET),
    }
    private lockAcquired = false

    constructor(organizationSlug: string | null = null) {
        this.organizationSlug = organizationSlug
    }

    public async setOrg(organizationSlug: string, caller = 'unknown'): Promise<void> {
        this.organizationSlug = organizationSlug
        await this.preCallChecks(caller)
    }

    private async getOrgAirtableAuth(): Promise<OrganizationAirtableAuth> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }

        const airtableAuth = await prisma.organizationAirtableAuth.findFirst({
            where: {
                organizationSlug: this.organizationSlug,
            },
        })

        if (!airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }

        return airtableAuth
    }

    private async acquireLock(caller = 'unknown', retries = 0): Promise<void> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }

        try {
            while (retries++ < 10) {
                const lock = await prisma.lock.findFirst({ where: { id: this.organizationSlug } })

                if (!lock) {
                    await prisma.lock.create({
                        data: {
                            id: this.organizationSlug,
                            owner: caller,
                        },
                    })
                    console.log(`Lock acquired by ${caller}`)
                    this.lockAcquired = true
                    return
                }
                await sleep(800)
            }
        } catch (error) {
            throw new AirtableLockError('Lock acquisition failed')
        }
        throw new AirtableLockError('Lock acquisition failed')
    }

    private async releaseLock(caller = 'unknown'): Promise<void> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        if (this.lockAcquired) {
            console.log('releaseLock')
            try {
                await prisma.lock.delete({ where: { id: this.organizationSlug, owner: caller } })
            } catch (error) {
            } finally {
                this.lockAcquired = false
            }
        }
    }

    private async refreshAirtableAuth(): Promise<void> {
        console.log('refreshing!')
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }

        let airtableResponse: AirtableOAuthResponse | AirtableOAuthError

        try {
            airtableResponse = await fetch(`${this.baseUrl}/oauth2/v1/token`, {
                method: 'POST',
                headers: this.airtableAuthHeaders,
                body: qs.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: this.airtableAuth.refreshToken,
                }),
            }).then((res) => res.json() as Promise<AirtableOAuthResponse | AirtableOAuthError>)

            if ('error' in airtableResponse) {
                console.log('Refresh Error', airtableResponse)
                throw new AirtableAuthError(airtableResponse.error)
            }

            const updatedAirtableAuth = await prisma.organizationAirtableAuth.update({
                where: {
                    organizationSlug: this.airtableAuth.organizationSlug,
                },
                data: {
                    accessToken: airtableResponse.access_token,
                    refreshToken: airtableResponse.refresh_token,
                    accessTokenExpiration: new Date(Date.now() + airtableResponse.expires_in * 1000),
                    refreshTokenExpiration: new Date(Date.now() + airtableResponse.refresh_expires_in * 1000),
                    scope: airtableResponse.scope,
                },
            })

            this.airtableAuth = updatedAirtableAuth
        } catch (error) {
            console.log('Refresh Error')
            throw new AirtableAuthError('Refresh Error')
        }
    }

    public async preCallChecks(caller = 'unknown'): Promise<OrganizationAirtableAuth> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        this.airtableAuth = await this.getOrgAirtableAuth()
        if (new Date(Date.now()) > this.airtableAuth.accessTokenExpiration) {
            await this.acquireLock(caller)
            await this.refreshAirtableAuth()
        }
        return this.airtableAuth
    }

    public async postCallCleanup(caller = 'unknown'): Promise<void> {
        try {
            await this.releaseLock(caller)
        } catch (error) {}
    }

    public async safeRefreshAirtableAuth(): Promise<void> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        this.airtableAuth = await this.getOrgAirtableAuth()
        await this.acquireLock('safeRefreshAirtableAuth')
        await this.refreshAirtableAuth()
        await this.releaseLock('safeRefreshAirtableAuth')
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

    public async getBasesList(): Promise<AirtableBase[]> {
        if (!this.airtableAuth) throw new Error('No Airtable Auth yet')
        const url = 'https://api.airtable.com/v0/meta/bases'
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth.accessToken}`,
            },
        }).then((res) => res.json())

        if ('error' in data) {
            console.log('Refresh Error', data)
            throw new AirtableAuthError(data.error)
        }
        return data.bases
    }

    public async getTablesList(baseId: string): Promise<AirtableTable[]> {
        if (!this.airtableAuth) throw new Error('No Airtable Auth yet')
        const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth.accessToken}`,
            },
        }).then((res) => res.json())

        if ('error' in data) {
            console.log('Refresh Error', data)
            throw new AirtableAuthError(data.error)
        }

        return data.tables
    }

    public async getTableFields(airtableProject: AirtableProject): Promise<AirtableField[]> {
        if (!this.airtableAuth) throw new Error('No Airtable Auth yet')
        const url = `https://api.airtable.com/v0/meta/bases/${airtableProject.baseId}/tables`
        const data = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.airtableAuth.accessToken}`,
            },
        }).then((res) => res.json())

        if ('error' in data) {
            console.log('Refresh Error', data)
            throw new AirtableAuthError(data.error)
        }

        if (!data.tables) return []

        const table = data.tables.find((table: AirtableTable) => table.id === airtableProject.tableId)

        return table?.fields
    }

    public async getMembers(airtableProject: AirtableProject): Promise<Record<string, MostTypes>[]> {
        if (!this.airtableAuth) throw new Error('No Airtable Auth yet')
        const membersTable = new AirtableApiClient({ apiKey: this.airtableAuth.accessToken }).base(
            airtableProject.baseId,
        )(airtableProject.tableId)
        const memberRecords = await membersTable.select({}).all()
        const members = memberRecords.map((record) => record.fields)

        const slugifyKeys = (fields: Record<string, MostTypes>[] | FieldSet[]): Record<string, MostTypes>[] => {
            return fields.map((field) => {
                const transformedObj: Record<string, MostTypes> = {}
                Object.keys(field).forEach((fieldName) => {
                    const value = field[fieldName]
                    if (
                        typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean' ||
                        Array.isArray(value)
                    ) {
                        transformedObj[slugify(fieldName)] = value
                    }
                })
                return transformedObj
            })
        }
        return slugifyKeys(members)
    }

    async createWebhook(baseId: string, tableId: string): Promise<AirtableWebhookResponse> {
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }

        let airtableResponse: AirtableWebhookResponse | AirtableWebhookError

        const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks`
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.airtableAuth.accessToken}`,
        }
        const notificationUrl = `${serverEnv.BASE_URL}/api/airtable/webhook`
        const body = {
            notificationUrl,
            specification: {
                options: {
                    filters: {
                        dataTypes: ['tableData', 'tableFields', 'tableMetadata'],
                        recordChangeScope: tableId,
                    },
                },
            },
        }

        try {
            airtableResponse = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            }).then((res) => res.json() as Promise<AirtableWebhookResponse>)

            if ('error' in airtableResponse) {
                console.log('Webhook Create Error', airtableResponse)
                throw new Error(airtableResponse.error.message)
            }
        } catch (error) {
            console.log(error)
            throw new Error('Webhook Create Error')
        }

        return airtableResponse
    }

    async refreshWebhook(baseId: string, webhookId: string): Promise<AirtableWebhookRefreshResponse> {
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }

        let airtableResponse: AirtableWebhookRefreshResponse | AirtableWebhookError

        const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/refresh`
        const headers = {
            Authorization: `Bearer ${this.airtableAuth.accessToken}`,
        }

        try {
            airtableResponse = await fetch(url, {
                method: 'POST',
                headers,
            }).then((res) => res.json() as Promise<AirtableWebhookRefreshResponse | AirtableWebhookError>)

            if ('error' in airtableResponse) {
                console.log('Webhook Refresh Error', airtableResponse)
                throw new Error(airtableResponse.error.message)
            }
        } catch (error) {
            console.log(error)
            throw new Error('Webhook Refresh Error')
        }

        return airtableResponse
    }

    async deleteWebhook(baseId: string, webhookId: string): Promise<void> {
        if (!this.airtableAuth) {
            throw new Error('No Airtable Auth yet')
        }

        let airtableResponse: unknown

        const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`
        const headers = {
            Authorization: `Bearer ${this.airtableAuth.accessToken}`,
        }

        try {
            airtableResponse = await fetch(url, {
                method: 'DELETE',
                headers,
            }).then((res) => res.json() as Promise<null | AirtableWebhookError>)

            if (airtableResponse) {
                console.log('Webhook Delete Error', airtableResponse)
                throw new Error('Webhook Delete Error')
            }
        } catch (error) {
            console.log(error)
            throw new Error('Webhook Delete Error')
        }
    }
}

const airtable = new Airtable()
export default airtable
