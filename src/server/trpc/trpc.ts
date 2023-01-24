import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'

import { env } from 'env/server.mjs'
import { type Context } from './context'

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape
    },
})

export const router = t.router

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
    return next({
        ctx: { ...ctx, session: { ...ctx.session }, prisma: ctx.prisma },
    })
})

const isOrgAdmin = t.middleware(async ({ ctx, next, rawInput }) => {
    const isOrgAdminInput = z.object({ organizationId: z.number() })
    const input = isOrgAdminInput.parse(rawInput)

    const organization = await ctx.prisma.organization.findUniqueOrThrow({
        where: {
            id: input.organizationId,
        },
        include: {
            admins: { include: { member: true } },
            projects: true,
        },
    })

    const admins = organization.admins.map((admin) => admin.member)

    if (!admins.some((admin) => admin.privyDID === ctx.session?.userId)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return next({ ctx })
})

// check if the user is an admin of the org that the project belongs to
const isProjectOrgAdmin = t.middleware(async ({ ctx, next, rawInput }) => {
    const isProjectOrgAdminInput = z.object({
        projectSlug: z.string(),
    })
    const input = isProjectOrgAdminInput.parse(rawInput)

    const project = await ctx.prisma.project.findUniqueOrThrow({
        where: {
            slug: input.projectSlug,
        },
        include: {
            organization: {
                include: { admins: { include: { member: true } } },
            },
        },
    })

    const admins = project.organization.admins.map((admin) => admin.member)

    if (!admins.some((admin) => admin.privyDID === ctx.session?.userId)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return next({ ctx })
})

const getNetworkName = (chainName: string) => (env.NODE_ENV === 'production' ? chainName : 'goerli')

const getNetwork = t.middleware(async ({ ctx, next, rawInput }) => {
    const chainName = ((rawInput as Record<string, unknown>)?.chainName || 'goerli') as string
    return next({
        ctx: {
            ...ctx,
            network: getNetworkName(chainName),
        },
    })
})

/**
 * Unprotected procedure
 **/
export const publicProcedure = t.procedure.use(getNetwork)
/**
 * Protected procedure
 **/
export const protectedProcedure = t.procedure.use(getNetwork).use(isAuthed)
export const protectedOrgProcedure = t.procedure.use(getNetwork).use(isAuthed).use(isOrgAdmin)
export const protectedProjectProcedure = t.procedure.use(getNetwork).use(isAuthed).use(isProjectOrgAdmin)
