import { z } from 'zod'
import { slugify } from 'utils/frontend'
import { protectedOrgProcedure, publicProcedure, router } from '../trpc'
import { TRPCError } from '@trpc/server'

export const projectRouter = router({
    getBySlug: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            try {
                const data = await ctx.prisma.project.findUniqueOrThrow({
                    where: {
                        slug: input,
                    },
                    include: {
                        members: { include: { member: true } },
                        organization: true,
                    },
                })
                return data
            } catch (error) {
                console.log('error', error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Project not found',
                })
            }
        }),
    createNewProject: protectedOrgProcedure
        .input(z.object({ name: z.string(), organizationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            console.log('input', input)
            const { name, organizationId } = input
            const slug = slugify(name)

            return ctx.prisma.project.create({
                data: {
                    name,
                    slug,
                    organization: { connect: { id: organizationId } },
                },
            })
        }),
})
