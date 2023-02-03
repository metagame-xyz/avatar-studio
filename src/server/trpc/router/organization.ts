import { TRPCError } from '@trpc/server'
import Airtable from 'airtable'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import qs from 'qs'
import { getBasesList, getTablesList } from 'utils/airtable'
import { z } from 'zod'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'

type AirtableOAuthResponse = {
    token_type: string
    scope: string
    access_token: string
    expires_in: number
    refresh_token: string
    refresh_expires_in: number
}

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

            const bases = await getBasesList(org.airtableAuth.accessToken)
            console.log('bases', bases)
            if (!bases[0]) throw new Error('No bases found')

            const tables = await getTablesList(org.airtableAuth.accessToken, bases[0].id)
            console.log('tables', tables)
            tables.map((table) => console.log(table.fields))

            Airtable.configure({ apiKey: org.airtableAuth.accessToken })

            const base = Airtable.base(bases[0].id)
            console.log('base', base)

            return bases
        }),
    addAirtableTokens: protectedOrgProcedure
        .input(z.object({ code: z.string(), codeVerifier: z.string(), organizationSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { code, codeVerifier, organizationSlug } = input

            const encodedCredentials = Buffer.from(
                `${clientEnv.NEXT_PUBLIC_AIRTABLE_CLIENT_ID}:${serverEnv.AIRTABLE_CLIENT_SECRET}`,
            ).toString('base64')
            const authorizationHeader = `Basic ${encodedCredentials}`

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: authorizationHeader,
            }

            let airtableResponse: AirtableOAuthResponse
            try {
                airtableResponse = await fetch(`${clientEnv.NEXT_PUBLIC_AIRTABLE_URL}/oauth2/v1/token`, {
                    method: 'POST',
                    headers,
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
