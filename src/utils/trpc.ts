import { httpBatchLink, loggerLink, TRPCClientError } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import Router from 'next/router'
import { type AppRouter } from 'server/trpc/router/_app'
import superjson from 'superjson'

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '' // browser should use relative url
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
    return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

// TODO don't do this anymore bc it fucks up useQuery's caching (use input instead of ctx)
const getSlugs = (): Record<string, string | undefined> => {
    if (typeof window === 'undefined') return {}
    const path = window.location.pathname

    const projectRegex = new RegExp(`project\/([^\/]+)(?:\/|$)`)
    const projectslug = path.match(projectRegex)?.[1]

    const orgRegex = new RegExp(`org\/([^\/]+)(?:\/|$)`)
    const orgslug = path.match(orgRegex)?.[1]

    return { projectslug, orgslug }
}

export class AirtableAuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AirtableAuthError'
    }
}

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
                    headers() {
                        const slugs = getSlugs()
                        // Demo mode: no auth token or chain needed
                        return {
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
                                if (rerouteCodes.includes(error.data?.code)) Router.push('/')
                            }

                            if (error instanceof AirtableAuthError) {
                                // dont retry,
                                return false
                            }
                            // console.log('failureCount', failureCount)
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
