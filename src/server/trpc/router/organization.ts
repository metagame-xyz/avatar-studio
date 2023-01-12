import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure, router } from '../trpc'

export const organizationRouter = router({
    getBySlug: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            try {
                const data = await ctx.prisma.organization.findUniqueOrThrow({
                    where: {
                        slug: input,
                    },
                    include: {
                        admins: { include: { member: true } },
                        projects: true,
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
