import { type inferAsyncReturnType } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { prisma } from '../db/client'

import type { AuthTokenClaims } from '@privy-io/server-auth'
import { PrivyClient } from '@privy-io/server-auth'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'

const privy = new PrivyClient(
    clientEnv.NEXT_PUBLIC_PRIVY_APP_ID,
    serverEnv.PRIVY_APP_SECRET,
)

type CreateContextOptions = {
    verifiedClaims: AuthTokenClaims | null
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
    }
}

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (opts: CreateNextContextOptions) => {
    const { req } = opts

    const authToken = req.headers?.authorization?.replace('Bearer ', '')

    let verifiedClaims: AuthTokenClaims | null = null

    try {
        verifiedClaims = await privy.verifyAuthToken(authToken || '')
    } catch (error) {
        console.log(`Token verification failed with error ${error}.`)
    }

    return await createContextInner({ verifiedClaims })
    // Get the session from the server using the unstable_getServerSession wrapper function
    // const session = await getServerAuthSession({ req, res })
}

export type Context = inferAsyncReturnType<typeof createContext>
