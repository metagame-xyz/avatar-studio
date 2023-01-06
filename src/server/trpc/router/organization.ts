import { z } from 'zod'

import { publicProcedure, router } from '../trpc'

export const organizationRouter = router({
    getBySlug: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            return ctx.prisma.organization.findUniqueOrThrow({
                where: {
                    slug: input,
                },
                include: {
                    admins: { include: { member: true } },
                    projects: true,
                },
            })
        }),
})
