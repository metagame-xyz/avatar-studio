import { TRPCError } from '@trpc/server'
import Airtable from 'utils/Airtable'
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

            if (!org.airtableAuth) return null

            const airtable = new Airtable(org.airtableAuth)

            const bases = await airtable.getBasesList()
            if (!bases || !bases[0]) return null

            for (const base of bases) {
                const tables = await airtable.getTablesList(base.id)
                base.tables = tables || []
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

            if (ctx.session?.userId === undefined) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not logged in',
                })
            }

            const airtable = new Airtable()
            await airtable.getAirtableAuth(code, codeVerifier, organizationSlug, ctx.session.userId)

            return organizationSlug
        }),
    checkAirtableToken: protectedOrgProcedure
        .input(z.object({ organizationSlug: z.string() }))
        .query(async ({ ctx, input }) => {
            const org = await ctx.prisma.organization.findUniqueOrThrow({
                where: {
                    slug: input.organizationSlug,
                },
                include: {
                    airtableAuth: true,
                },
            })

            const airtable = new Airtable(org.airtableAuth)
            const bases = await airtable.getBasesList()
            return !bases
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
