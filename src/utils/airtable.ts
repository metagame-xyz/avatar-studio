import base64url from 'base64url'
import crypto from 'crypto'
import { env } from 'env/client.mjs'

export const codeVerifierKey = base64url.encode(crypto.randomBytes(100))

// prevents others from impersonating you
export const codeVerifierStr = base64url.encode(crypto.randomBytes(96)) // 128 characters
const codeChallengeMethod = 'S256'
const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifierStr) // hash the code verifier with the sha256 algorithm
    .digest('base64') // base64 encode, needs to be transformed to base64url
    .replace(/=/g, '') // remove =
    .replace(/\+/g, '-') // replace + with -
    .replace(/\//g, '_') // replace / with _ now base64url encoded

// build the authorization URL
const authorizationUrl = new URL(`${env.NEXT_PUBLIC_AIRTABLE_URL}/oauth2/v1/authorize`)
authorizationUrl.searchParams.set('code_challenge', codeChallenge)
authorizationUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
authorizationUrl.searchParams.set('state', codeVerifierKey)
authorizationUrl.searchParams.set('client_id', env.NEXT_PUBLIC_AIRTABLE_CLIENT_ID)
authorizationUrl.searchParams.set('redirect_uri', env.NEXT_PUBLIC_AIRTABLE_REDIRECT_URI)
authorizationUrl.searchParams.set('response_type', 'code')
authorizationUrl.searchParams.set('scope', env.NEXT_PUBLIC_AIRTABLE_SCOPE)

export const airtableAuthUrl = authorizationUrl.toString()

export type AirtableBase = {
    id: string
    name: string
    permissionLevel: 'none' | 'read' | 'comment' | 'edit' | 'create'
    tables: AirtableTable[]
}

export type AirtableTable = {
    description?: string
    fields: AirtableField[]
    id: string
    name: string
    primaryFieldId: string
    views: AirtableView[]
}

export type AirtableField = {
    description?: string
    id: string
    name: string
    options?: {
        inverseLinkFieldId?: string
        isReversed?: boolean
        linkedTableId?: string
        prefersSingleRecordLink?: boolean
    }
    type: string
}

export type AirtableView = {
    id: string
    name: string
    type: string
}

export const getBasesList = async (accessToken: string): Promise<AirtableBase[]> => {
    const url = 'https://api.airtable.com/v0/meta/bases'

    const data = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((res) => res.json())

    return data.bases
}

export const getTablesList = async (accessToken: string, baseId: string): Promise<AirtableTable[]> => {
    const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`

    const data = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((res) => res.json())

    return data.tables
}
