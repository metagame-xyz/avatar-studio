import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

import { type Context } from './context'

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape
    },
})

export const router = t.router

/**
 * Unprotected procedure
 **/
export const publicProcedure = t.procedure

/**
 * Reusable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    // for some reason, prevents the session type from being null
    // and for some reason, we don't need to pass the prisma client? but I am anyways?
    // return next({ ctx })
    return next({ ctx: { session: { ...ctx.session }, prisma: ctx.prisma } })
})

/**
 * Protected procedure
 **/
export const protectedProcedure = t.procedure.use(isAuthed)
