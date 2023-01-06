import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

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
                invitations: { include: { organization: true } },
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
    acceptOrgInvitation: protectedProcedure
        .input(z.object({ organizationId: z.number(), role: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.address) return null

            const orgInvite =
                await ctx.prisma.organizationInvitation.findFirstOrThrow({
                    where: {
                        status: 'PENDING',
                        inviteeAddress: ctx.address,
                        organizationId: input.organizationId,
                        role: input.role,
                    },
                })

            const [user] = await ctx.prisma.$transaction([
                ctx.prisma.user.update({
                    where: {
                        address: ctx.address,
                    },
                    data: {
                        organizations: {
                            create: [
                                {
                                    organizationId: orgInvite.organizationId,
                                    role: orgInvite.role,
                                },
                            ],
                        },
                    },
                }),
                ctx.prisma.organizationInvitation.update({
                    where: {
                        organizationId_inviteeAddress_role: {
                            organizationId: orgInvite.organizationId,
                            inviteeAddress: ctx.address,
                            role: orgInvite.role,
                        },
                    },
                    data: { status: 'ACCEPTED' },
                }),
            ])

            return user
        }),
})
