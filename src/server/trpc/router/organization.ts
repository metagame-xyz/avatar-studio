import { TRPCError } from '@trpc/server'
import airtable from 'utils/airtable'
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
    addAirtableTokens: protectedOrgProcedure
        .input(z.object({ code: z.string(), codeVerifier: z.string(), organizationSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { code, codeVerifier, organizationSlug } = input

            if (ctx.session?.userId === undefined) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not logged in',
                })
            }

            await airtable.getAirtableAuth(code, codeVerifier, organizationSlug, ctx.session.userId)

            return organizationSlug
        }),
    doesTokenNeedRefresh: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string() }))
        .query(async ({ input }) => {
            try {
                await airtable.setOrg(input.organizationSlug, 'doesTokenNeedRefresh')
                return true
            } catch (err) {
                false
            } finally {
                await airtable.postCallCleanup('doesTokenNeedRefresh')
            }
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
