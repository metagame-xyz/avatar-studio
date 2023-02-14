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
} from './airtableFrontend'
import { AirtableAuthError, AirtableLockError } from './airtableFrontend'
import { createAuthHeader, sleep } from './backend'
import type { MostTypes } from './types'

export const airtableAuthErrorObj = {
    error: 'Auth Issue',
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

    constructor(organizationSlug: string | null = null) {
        this.organizationSlug = organizationSlug
    }

    public setOrg(organizationSlug: string): void {
        this.organizationSlug = organizationSlug
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
        console.log('releaseLock')
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        try {
            await prisma.lock.delete({ where: { id: this.organizationSlug, owner: caller } })
        } catch (error) {}
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
                    scope: airtableResponse.scope,
                },
            })

            this.airtableAuth = updatedAirtableAuth
        } catch (error) {
            console.log('Refresh Error')
            throw new AirtableAuthError('Refresh Error')
        }
    }

    private async preCallChecks(caller = 'unknown'): Promise<OrganizationAirtableAuth> {
        if (!this.organizationSlug) {
            throw new Error('No Org Slug yet')
        }
        try {
            await this.acquireLock(caller)
            this.airtableAuth = await this.getOrgAirtableAuth()
            if (new Date(Date.now()) > this.airtableAuth.accessTokenExpiration) {
                await this.refreshAirtableAuth()
            }
            return this.airtableAuth
        } catch (error) {
            throw error
        }
    }

    private async postCallCleanup(caller = 'unknown'): Promise<void> {
        try {
            await this.releaseLock(caller)
        } catch (error) {}
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
        const url = 'https://api.airtable.com/v0/meta/bases'
        let airtableAuth: OrganizationAirtableAuth | undefined = undefined
        try {
            airtableAuth = await this.preCallChecks('getBasesList')
            const data = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${airtableAuth.accessToken}`,
                },
            }).then((res) => res.json())

            return data.bases
        } catch (error) {
            throw error
        } finally {
            await this.postCallCleanup('getBasesList')
        }
    }

    public async getTablesList(baseId: string): Promise<AirtableTable[]> {
        const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
        try {
            const airtableAuth = await this.preCallChecks('getTablesList')
            const data = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${airtableAuth.accessToken}`,
                },
            }).then((res) => res.json())

            return data.tables
        } catch (error) {
            throw error
        } finally {
            await this.postCallCleanup('getTablesList')
        }
    }

    public async getTableFields(airtableProject: AirtableProject): Promise<AirtableField[]> {
        const url = `https://api.airtable.com/v0/meta/bases/${airtableProject.baseId}/tables`
        try {
            const airtableAuth = await this.preCallChecks('getTableFields')
            const data = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${airtableAuth.accessToken}`,
                },
            }).then((res) => res.json())

            if (!data.tables) return []

            const table = data.tables.find((table: AirtableTable) => table.id === airtableProject.tableId)

            return table?.fields
        } catch (error) {
            console.log('getTableFields error')
            throw error
        } finally {
            await this.postCallCleanup('getTableFields')
        }
    }

    public async getMembers(airtableProject: AirtableProject): Promise<Record<string, MostTypes>[]> {
        try {
            const airtableAuth = await this.preCallChecks('getMembers')
            const membersTable = new AirtableApiClient({ apiKey: airtableAuth.accessToken }).base(
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
        } catch (error) {
            console.log('getMembers error')
            throw error
        } finally {
            await this.postCallCleanup('getMembers')
        }
    }

    public async doesTokenNeedRefresh(): Promise<boolean> {
        try {
            await this.preCallChecks('checkToken')
            return false
        } catch (error) {
            return true
        } finally {
            await this.postCallCleanup('checkToken')
        }
    }
}

const airtable = new Airtable()
export default airtable
