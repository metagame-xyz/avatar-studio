import { TRPCError } from '@trpc/server'
import { env as clientEnv } from 'env/client.mjs'
import qs from 'qs'
import type { AirtableOAuthResponse } from 'utils/airtable'
import { getBasesList, getTablesList } from 'utils/airtable'
import { airtableAuthHeaders, refreshAirtableAuth } from 'utils/airtableBackend'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'

export const organizationRouter = router({
    getBySlug: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
        try {
            const data = await ctx.prisma.organization.findUniqueOrThrow({
                where: {
                    slug: input,
                },
                include: {
                    admins: { include: { member: true } },
                    projects: true,
                    airtableAuth: true,
                },
            })
            return data
        } catch (error) {
            console.log('error', error)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Organization not found',
            })
        }
    }),
    getAirtableBases: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string() }))
        .query(async ({ ctx, input }) => {
            const org = await ctx.prisma.organization.findUniqueOrThrow({
                where: {
                    slug: input.organizationSlug,
                },
                include: {
                    admins: { include: { member: true } },
                    projects: true,
                    airtableAuth: true,
                },
            })

            if (!org.airtableAuth) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Airtable auth not found',
                })
            }

            // TODO move airtable stuff into a class, record when the access / refresh token will expire, and only refresh if needed. move the refresh check into each individual api call, so we don't have to remember to refresh when you make a new call. Also make a cronjob with quirrel to refresh all tokens every 30 days just to make sure never lose the refresh token validity
            const airtableAuth = await refreshAirtableAuth(org.airtableAuth)

            const bases = await getBasesList(airtableAuth.accessToken)
            if (!bases || !bases[0]) return null

            for (const base of bases) {
                const tables = await getTablesList(airtableAuth.accessToken, base.id)
                if (tables) base.tables = tables
            }

            // We can switch to parallelized if it's a problem but I think we'd hit the rate limit of 5 req/s
            // const getTablesLists = async (accessToken: string, baseIds: string[]) => {
            //     const promises = baseIds.map(async (baseId) => {
            //         const tables = await getTablesList(accessToken, baseId)
            //         return { id: baseId, tables }
            //     })
            //     return Promise.all(promises)
            // }
            // const baseIds = bases.map((base) => base.id)
            // const updatedBases = await getTablesLists(org.airtableAuth.accessToken, baseIds)
            // updatedBases.forEach((updatedBase) => {
            //     const base = bases.find((base) => base.id === updatedBase.id) as AirtableBase
            //     base.tables = updatedBase.tables
            // })

            // Airtable.configure({ apiKey: org.airtableAuth.accessToken })
            // const base = Airtable.base(bases[0].id)

            return bases
        }),
    addAirtableTokens: protectedOrgProcedure
        .input(z.object({ code: z.string(), codeVerifier: z.string(), organizationSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { code, codeVerifier, organizationSlug } = input

            let airtableResponse: AirtableOAuthResponse
            try {
                airtableResponse = await fetch(`${clientEnv.NEXT_PUBLIC_AIRTABLE_URL}/oauth2/v1/token`, {
                    method: 'POST',
                    headers: airtableAuthHeaders,
                    body: qs.stringify({
                        code_verifier: codeVerifier,
                        redirect_uri: clientEnv.NEXT_PUBLIC_AIRTABLE_REDIRECT_URI,
                        code,
                        grant_type: 'authorization_code',
                    }),
                }).then((res) => res.json() as Promise<AirtableOAuthResponse>)
            } catch (error) {
                console.log('Airtable Response Error', error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Airtable issue',
                })
            }
            console.log('airtableResponse', airtableResponse)

            const { access_token, refresh_token } = airtableResponse

            const user = await ctx.prisma.user.findUniqueOrThrow({
                where: {
                    privyDID: ctx.session?.userId,
                },
            })

            const authData = {
                organizationSlug,
                accessToken: access_token,
                refreshToken: refresh_token,
                accessGrantedUserId: user.id,
                scope: clientEnv.NEXT_PUBLIC_AIRTABLE_SCOPE,
            }

            await ctx.prisma.organizationAirtableAuth.upsert({
                where: {
                    organizationSlug,
                },
                create: authData,
                update: authData,
            })

            return organizationSlug
        }),
})

// export const organizationRouter = router({
//     getBySlug: publicProcedure
//         .input(z.string())
//         .query(async ({ ctx, input }) => {
//             return trpcError(ctx.prisma.organization.findUniqueOrThrow)({
//                 where: {
//                     slug: input,
//                 },
//                 include: {
//                     admins: { include: { member: true } },
//                     projects: true,
//                 },
//             })
//         }),
// })

// type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
// type AsyncFn = (...args: any[]) => Promise<any>

// function trpcError<T extends AsyncFn>(
//     call: T,
// ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
//     return async (...args: Parameters<T>) => {
//         try {
//             return await call(...args)
//         } catch (exception) {
//             throw new TRPCError({
//                 code: 'NOT_FOUND',
//                 message: 'Organization not found',
//             })
//         }
//     }
// }

// function wrapFunction<TArgs extends any[], TReturn>(
//     targetFunction: (...parameters: TArgs) => Promise<TReturn>,
// ): (...parameters: TArgs) => TReturn {
//     return async (...parameters: TArgs) => {
//         try {
//             const data = await targetFunction(...parameters)
//             return data
//         } catch (error) {
//             console.log('error', error)
//             throw new TRPCError({
//                 code: 'NOT_FOUND',
//                 message: 'Organization not found',
//             })
//         }
//         //   console.log(`Hello, what is your name?`);
//         //   return targetFunction(...parameters);
//     }
// }
