import { RequirementAction } from '@prisma/client'
import { Network } from 'alchemy-sdk'
import { createOrUpdateNftWebhook, getAddressesByRequirement } from 'utils/onchainAchievements'
import { z } from 'zod'
import { protectedOrgProcedure, protectedProcedure, router, webhookOrOrgAdminProcedure } from '../trpc'

export const achievementRouter = router({
    createAchievement: protectedOrgProcedure
        .input(
            z.object({
                name: z.string().min(1),
                achievementCategoryId: z.number(),
                // level: z.number().optional(),
                organizationSlug: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { name, achievementCategoryId } = input
            const { prisma } = ctx

            return prisma.achievement.upsert({
                where: {
                    achievementCategoryId_name: {
                        achievementCategoryId,
                        name,
                    },
                },
                update: {},
                create: {
                    name,
                    // level,
                    achievementCategoryId,
                },
            })
        }),
    createAchievementCategory: protectedOrgProcedure
        .input(
            z.object({
                name: z.string().min(1),
                organizationSlug: z.string(),
                description: z.string().optional(),
                projectId: z.number(),
                // type: z.string(), // specific achievement vs level
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { name, description, projectId } = input
            const { prisma } = ctx

            return prisma.achievementCategory.upsert({
                where: {
                    projectId_name: {
                        projectId,
                        name,
                    },
                },
                update: {},
                create: {
                    name,
                    description,
                    projectId,
                },
            })
        }),
    // createAchievementForMembers: protectedOrgProcedure
    //     .input(
    //         z.object({
    //             achievementId: z.number(),
    //             memberAddresses: z.array(z.string()),
    //             organizationSlug: z.string(),
    //         }),
    //     )
    //     .mutation(async ({ input, ctx }) => {
    //         // get all members by their addresses, then create MemberAchievements

    //         const { achievementId, memberAddresses } = input
    //         const { prisma } = ctx

    //         const members = await prisma.user.findMany({
    //             where: {
    //                 address: {
    //                     in: memberAddresses,
    //                 },
    //             },
    //             select: {
    //                 id: true,
    //             },
    //         })

    //         const memberAchievements = members.map((member) => ({
    //             userId: member.id,
    //             achievementId,
    //         }))

    //         return prisma.memberAchievements.createMany({
    //             data: memberAchievements,
    //         })
    //     }),
    createOrUpdateAchievementsForMember: webhookOrOrgAdminProcedure
        .input(
            z.object({
                memberId: z.string(),
                achievementIds: z.array(z.number()),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { memberId, achievementIds } = input
            const { prisma } = ctx

            const memberAchievements = achievementIds.map((achievementId) => ({
                userId: memberId,
                achievementId,
            }))

            return prisma.memberAchievements.createMany({
                data: memberAchievements,
                skipDuplicates: true,
            })
        }),
    createRequirement: protectedOrgProcedure
        .input(
            z.object({
                contractAddress: z.string(),
                network: z.nativeEnum(Network),
                action: z.nativeEnum(RequirementAction),
                organizationSlug: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { contractAddress, network, action } = input
            const { prisma } = ctx

            let requirement = await prisma.requirement.findFirst({
                where: {
                    contractAddress,
                    network,
                    action,
                },
            })

            if (!requirement) {
                requirement = await prisma.requirement.create({
                    data: {
                        contractAddress,
                        network,
                        action,
                    },
                })
            }

            return requirement
        }),
    getRequirement: webhookOrOrgAdminProcedure
        .input(
            z.object({
                network: z.string(),
                contractAddress: z.string(),
                action: z.nativeEnum(RequirementAction),
            }),
        )
        .query(async ({ input, ctx }) => {
            const { contractAddress, network, action } = input
            const { prisma } = ctx

            return prisma.requirement.findFirst({
                where: {
                    contractAddress,
                    network,
                    action,
                },
                include: {
                    achievements: true,
                },
            })
        }),
    getAllRequirements: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.requirement.findMany({})
    }),

    connectRequirementToAchievement: protectedOrgProcedure
        .input(
            z.object({
                requirementId: z.number(),
                achievementId: z.number(),
                organizationSlug: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { requirementId, achievementId } = input
            const { prisma } = ctx

            const { contractAddress, network, action } = await prisma.requirement.findFirstOrThrow({
                where: {
                    id: requirementId,
                },
            })

            /* Backfill existing members achievements */
            const memberAddresses = await getAddressesByRequirement(contractAddress, network, action)

            const members = await prisma.user.findMany({
                where: {
                    address: {
                        in: memberAddresses,
                    },
                },
                select: {
                    id: true,
                },
            })

            const memberAchievements = members.map((member) => ({
                userId: member.id,
                achievementId,
            }))

            await prisma.memberAchievements.createMany({
                data: memberAchievements,
                skipDuplicates: true,
            })

            /* Create webhook for existing members going forwards */
            await createOrUpdateNftWebhook(contractAddress, network)

            /* Connect requirement to achievement */
            return prisma.achievement.update({
                where: {
                    id: achievementId,
                },
                data: {
                    requirements: {
                        connect: {
                            id: requirementId,
                        },
                    },
                },
            })
        }),
})
