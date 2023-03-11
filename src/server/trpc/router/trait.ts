import { env } from 'env/server.mjs'
import { getFromS3, getTraitCategoriesAndNames } from 'utils/s3'
import { z } from 'zod'
import { protectedMetagameAdminProcedure, protectedProjectProcedure, publicProcedure, router } from '../trpc'

import * as AWS from 'aws-sdk'
import { traitCategorySchema } from 'utils/types'

AWS.config.update({
    accessKeyId: env.METAGAME_AWS_ACCESS_KEY,
    secretAccessKey: env.METAGAME_AWS_SECRET_ACCESS_KEY,
})

export const traitRouter = router({
    getFromS3: publicProcedure.input(z.string()).query(async ({ input }) => {
        return getTraitCategoriesAndNames(AWS, input)
    }),
    createFromS3: protectedProjectProcedure
        .input(z.object({ projectSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { projectSlug } = input

            return getFromS3(AWS, ctx.prisma, projectSlug)
        }),
    updateTraitCategory: protectedProjectProcedure
        .input(z.object({ traitCategory: traitCategorySchema, projectSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { traitCategory: tc } = input

            return ctx.prisma.traitCategory.update({
                where: {
                    projectId_name: {
                        projectId: tc.projectId,
                        name: tc.name,
                    },
                },
                data: {
                    zIndex: tc.zIndex,
                    isDefaultAchieved: tc.isDefaultAchieved,
                    isModifiable: tc.isModifiable,
                },
            })
        }),
    connectAchievement: protectedMetagameAdminProcedure
        .input(
            z.object({ traitId: z.number(), achievementId: z.number(), achievementsRequiredDescription: z.string() }),
        )
        .mutation(async ({ ctx, input }) => {
            const { traitId, achievementId, achievementsRequiredDescription } = input

            return ctx.prisma.trait.update({
                where: {
                    id: traitId,
                },
                data: {
                    isDefaultAchieved: false,
                    achievementsRequired: {
                        set: [],
                        connect: {
                            id: achievementId,
                        },
                    },
                    achievementsRequiredDescription,
                },
                include: {
                    achievementsRequired: true,
                },
            })
        }),
    removeAchievement: protectedMetagameAdminProcedure
        .input(z.object({ traitId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { traitId } = input

            return ctx.prisma.trait.update({
                where: {
                    id: traitId,
                },
                data: {
                    achievementsRequired: {
                        set: [],
                    },
                    achievementsRequiredDescription: null,
                },
                include: {
                    achievementsRequired: true,
                },
            })
        }),
    toggleTraitComplimentary: protectedMetagameAdminProcedure
        .input(z.object({ traitId: z.number(), isComplimentary: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            const { traitId, isComplimentary } = input

            return ctx.prisma.trait.update({
                where: {
                    id: traitId,
                },
                data: {
                    isDefaultAchieved: isComplimentary,
                    achievementsRequired: {
                        set: [],
                    },
                    achievementsRequiredDescription: null,
                },
                include: {
                    achievementsRequired: true,
                },
            })
        }),
})
