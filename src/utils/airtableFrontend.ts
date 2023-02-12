import base64url from 'base64url'
import crypto from 'crypto'
import { env } from 'env/client.mjs'
import { z } from 'zod'

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

export type AirtableOAuthResponse = {
    token_type: string
    scope: string
    access_token: string
    expires_in: number
    refresh_token: string
    refresh_expires_in: number
}

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

export const airtableOAuthResponseSchema = z.object({
    token_type: z.string(),
    scope: z.string(),
    access_token: z.string(),
    expires_in: z.number(),
    refresh_token: z.string(),
    refresh_expires_in: z.number(),
})

export const airtableFieldSchema = z.object({
    description: z.string().optional(),
    id: z.string(),
    name: z.string(),
    options: z
        .object({
            inverseLinkFieldId: z.string().optional(),
            isReversed: z.boolean().optional(),
            linkedTableId: z.string().optional(),
            prefersSingleRecordLink: z.boolean().optional(),
        })
        .optional(),
    type: z.string(),
})

export const airtableViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
})

export const airtableTableSchema = z.object({
    description: z.string().optional(),
    fields: z.array(airtableFieldSchema),
    id: z.string(),
    name: z.string(),
    primaryFieldId: z.string(),
    views: z.array(airtableViewSchema),
})

export const airtableBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.union([
        z.literal('none'),
        z.literal('read'),
        z.literal('comment'),
        z.literal('edit'),
        z.literal('create'),
    ]),
    tables: z.array(airtableTableSchema),
})
