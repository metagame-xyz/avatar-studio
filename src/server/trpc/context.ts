import type { AuthTokenClaims } from '@privy-io/server-auth'
import { type inferAsyncReturnType } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { privy } from 'utils/backend'
import { prisma } from '../db/client'

type CreateContextOptions = {
    verifiedClaims: AuthTokenClaims | null
    projectSlug: string | null
    organizationSlug: string | null
    network: string | null
    webhookPassword: string | null
}

/** Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 **/
export const createContextInner = async (opts: CreateContextOptions) => {
    return {
        session: opts.verifiedClaims,
        prisma,
        projectSlug: opts.projectSlug,
        organizationSlug: opts.organizationSlug,
        network: opts.network,
        webhookPassword: opts.webhookPassword,
    }
}

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (opts: CreateNextContextOptions) => {
    const { req } = opts

    const authToken = req.headers?.authorization?.replace('Bearer ', '')
    const projectSlug = (req.headers?.projectslug || null) as string | null
    const organizationSlug = (req.headers?.orgslug || null) as string | null
    const network = (req.headers?.chain || null) as string | null
    const webhookPassword = (req.headers?.webhookPassword || null) as string | null

    // console.log('headers', req.headers)

    let verifiedClaims: AuthTokenClaims | null = null

    // Only attempt to verify if there's actually a token
    // In demo mode, no auth token is sent
    if (authToken) {
        try {
            verifiedClaims = await privy.verifyAuthToken(authToken)
        } catch (error) {
            console.log(`Token verification failed with error ${error}.`)
        }
    }

    return await createContextInner({ verifiedClaims, projectSlug, organizationSlug, network, webhookPassword })
    // Get the session from the server using the unstable_getServerSession wrapper function
    // const session = await getServerAuthSession({ req, res })
}

export type Context = inferAsyncReturnType<typeof createContext>
