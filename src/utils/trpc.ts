import { httpBatchLink, loggerLink, TRPCClientError } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import superjson from 'superjson'

import { getAccessToken } from '@privy-io/react-auth'
import Router from 'next/router'
import { type AppRouter } from 'server/trpc/router/_app'

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '' // browser should use relative url
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
    return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

const getSlugs = (): Record<string, string | undefined> => {
    if (typeof window === 'undefined') return {}
    const path = window.location.pathname

    const projectRegex = new RegExp(`project/([^/]+)(?:/|$).`)
    const projectslug = path.match(projectRegex)?.[1]

    const orgRegex = new RegExp(`org/([^/]+)(?:/|$).`)
    const orgslug = path.match(orgRegex)?.[1]

    return { projectslug, orgslug }
}

// const getNetwork = async () => {
//     if (typeof window === 'undefined') return ''
//     const chainId = await window.ethereum.request({ method: 'eth_chainId' })
//     return chainId // returns as 0x5
// }

export const trpc = createTRPCNext<AppRouter>({
    config() {
        return {
            transformer: superjson,
            links: [
                loggerLink({
                    enabled: (opts) =>
                        process.env.NODE_ENV === 'development' ||
                        (opts.direction === 'down' && opts.result instanceof Error),
                }),
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    async headers() {
                        const accessToken = await getAccessToken()
                        const slugs = getSlugs()
                        // const network = await getNetwork()
                        return {
                            Authorization: `Bearer ${accessToken}`,
                            ...slugs,
                        }
                    },
                }),
            ],
            queryClientConfig: {
                defaultOptions: {
                    queries: {
                        retry: (failureCount, error) => {
                            const rerouteCodes = ['UNAUTHORIZED', 'NOT_FOUND', 'FORBIDDEN']

                            if (error instanceof TRPCClientError) {
                                if (rerouteCodes.includes(error.data.code)) Router.push('/')
                            }
                            return failureCount < 3
                        },
                    },
                },
            },
        }
    },
    ssr: false,
})

/**
 * Inference helper for inputs
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>
/**
 * Inference helper for outputs
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>
