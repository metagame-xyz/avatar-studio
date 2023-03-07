import { UserRole } from '@prisma/client'
import { initTRPC, TRPCError } from '@trpc/server'
import { createHmac } from 'crypto'
import { env } from 'env/server.mjs'
import superjson from 'superjson'
import { z } from 'zod'
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
    const isOrgAdminInput = z.object({ organizationSlug: z.string() })
    const input = isOrgAdminInput.parse(rawInput)

    // TODO calling ctx here creates an issue:
    // This is caused by either a bug in Node.js or incorrect usage of Node.js internals.
    // Please open an issue with this stack trace at https://github.com/nodejs/node/issues
    // console.log('ctx', ctx.organizationSlug)
    // console.log('input', input)

    const organization = await ctx.prisma.organization.findUniqueOrThrow({
        where: {
            slug: input.organizationSlug,
        },
        include: {
            admins: { include: { member: true } },
            projects: true,
        },
    })

    const admins = organization.admins.map((admin) => admin.member)

    if (!admins.some((admin) => admin.privyDID === ctx.session?.userId)) {
        // then check for metagame admin only if the user is not an org admin to save a
        const user = await ctx.prisma.user.findUnique({
            where: {
                privyDID: ctx.session?.userId,
            },
        })

        if (!user || !(user.role === UserRole.METAGAME_ADMIN || user.role === UserRole.METAGAME_OWNER)) {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
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

    // first check for org admin
    if (!admins.some((admin) => admin.privyDID === ctx.session?.userId)) {
        // then check for metagame admin only if the user is not an org admin to save a
        const user = await ctx.prisma.user.findUnique({
            where: {
                privyDID: ctx.session?.userId,
            },
        })

        if (!user || !(user.role === UserRole.METAGAME_ADMIN || user.role === UserRole.METAGAME_OWNER)) {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
    }

    return next({ ctx })
})

const getNetworkName = (chainNetwork: string) => (env.NODE_ENV === 'production' ? chainNetwork : 'goerli')

const getNetwork = t.middleware(async ({ ctx, next, rawInput }) => {
    const chainNetwork = ((rawInput as Record<string, unknown>)?.chainNetwork || 'goerli') as string
    return next({
        ctx: {
            ...ctx,
            network: getNetworkName(chainNetwork),
        },
    })
})

const isMetagameAdmin = t.middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const user = await ctx.prisma.user.findUniqueOrThrow({
        where: {
            privyDID: ctx.session.userId,
        },
    })

    if (!(user.role === UserRole.METAGAME_ADMIN || user.role === UserRole.METAGAME_OWNER)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return next({ ctx })
})

const eventForwarderProtection = t.middleware(async ({ ctx, next, rawInput }) => {
    const input = z.object({ authToken: z.string(), signature: z.string(), body: z.any() }).parse(rawInput)
    const { authToken, signature, body } = input

    const hmac = createHmac('sha256', authToken) // Create a HMAC SHA256 hash using the auth token
    hmac.update(JSON.stringify(body), 'utf8') // Update the token hash with the request body using utf8
    const digest = hmac.digest('hex')

    if (signature !== digest) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return next({ ctx })
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
export const protectedMetagameAdminProcedure = t.procedure.use(getNetwork).use(isAuthed).use(isMetagameAdmin)
export const eventForwarderProcedure = t.procedure.use(eventForwarderProtection)
