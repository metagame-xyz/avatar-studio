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
