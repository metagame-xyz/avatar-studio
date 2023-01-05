import { z } from 'zod'

import { publicProcedure, protectedProcedure, router } from '../trpc'

export const memberRouter = router({
    me: protectedProcedure.query(async ({ ctx }) => {
        const member = await ctx.prisma.user.findUniqueOrThrow({
            where: {
                address: ctx.address,
            },
            include: {
                organizations: { include: { organization: true } },
                projects: { include: { project: true } },
                achievements: { include: { achievement: true } },
            },
        })

        return {
            ...member,
            organizations: member.organizations.map((o) => {
                return { ...o.organization, role: o.role }
            }),
            projects: member.projects.map((p) => {
                return { ...p.project, role: p.role }
            }),
            achievements: member.achievements.map((a) => {
                return {
                    ...a.achievement,
                    timestamp: a.timestamp,
                    status: a.status,
                }
            }),
        }
    }),
    connectOrg: protectedProcedure.mutation(async ({ ctx }) => {
        const orgIds = (await ctx.prisma.organization.findMany({
            where: { adminAddress: ctx.address },
            select: { id: true },
        })) as [{ id: number }]

        return ctx.prisma.user.update({
            where: {
                address: ctx.address,
            },
            data: {
                organizations: {
                    create: [
                        ...orgIds.map(({ id }) => ({
                            organizationId: id,
                            role: 'OWNER',
                        })),
                    ],
                },
            },
        })
    }),
})
