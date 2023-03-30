import base64url from 'base64url'
import crypto from 'crypto'
import { env } from 'env/client.mjs'
import { z } from 'zod'
import type { Prettify } from './types'

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

export type AirtableOAuthError = {
    error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unsupported_grant_type'
    error_description: string
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

export type AirtableView = {
    id: string
    name: string
    type: string
}

export class AirtableAuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AirtableAuthError'
    }
}
export class AirtableLockError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AirtableLockError'
    }
}

export type AirtableFieldType = 'checkbox' | 'number' | 'singleSelect' | 'multipleSelects'

type AirtableFieldBase = {
    id: string
    name: string
    description?: string
    type: AirtableFieldType
}

type AirtableCheckbox = { icon?: string; color?: string }
type AirtableNumber = { precision?: number }
type AirtableSelect = { choices: { id: string; name: string; color?: string }[] }

type AirtableFieldCheckbox = AirtableFieldBase & {
    type: 'checkbox'
    options: AirtableCheckbox
}

type AirtableFieldNumber = AirtableFieldBase & {
    type: 'number'
    options: AirtableNumber
}

type AirtableFieldSingleSelect = AirtableFieldBase & {
    type: 'singleSelect'
    options: AirtableSelect
}

type AirtableFieldMultipleSelects = AirtableFieldBase & {
    type: 'multipleSelects'
    options: AirtableSelect
}

export type AirtableField = Prettify<
    AirtableFieldCheckbox | AirtableFieldNumber | AirtableFieldSingleSelect | AirtableFieldMultipleSelects
>

export const airtableOAuthResponseSchema = z.object({
    token_type: z.string(),
    scope: z.string(),
    access_token: z.string(),
    expires_in: z.number(),
    refresh_token: z.string(),
    refresh_expires_in: z.number(),
})

const airtableFieldTypeSchema = z.union([
    z.literal('checkbox'),
    z.literal('number'),
    z.literal('singleSelect'),
    z.literal('multipleSelects'),
])

const airtableFieldBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: airtableFieldTypeSchema,
})

const airtableCheckboxSchema = z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
})

const airtableNumberSchema = z.object({
    precision: z.number().optional(),
})

const airtableSelectSchema = z.object({
    choices: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().optional(),
        }),
    ),
})

const airtableFieldCheckboxSchema = airtableFieldBaseSchema.and(
    z.object({
        type: z.literal('checkbox'),
        options: airtableCheckboxSchema,
    }),
)

const airtableFieldNumberSchema = airtableFieldBaseSchema.and(
    z.object({
        type: z.literal('number'),
        options: airtableNumberSchema,
    }),
)

const airtableFieldSingleSelectSchema = airtableFieldBaseSchema.and(
    z.object({
        type: z.literal('singleSelect'),
        options: airtableSelectSchema,
    }),
)

const airtableFieldMultipleSelectsSchema = airtableFieldBaseSchema.and(
    z.object({
        type: z.literal('multipleSelects'),
        options: airtableSelectSchema,
    }),
)

export const airtableFieldSchema = z.union([
    airtableFieldCheckboxSchema,
    airtableFieldNumberSchema,
    airtableFieldSingleSelectSchema,
    airtableFieldMultipleSelectsSchema,
])

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
