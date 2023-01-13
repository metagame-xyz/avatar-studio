import { TRPCError } from '@trpc/server'
import { getEntries } from 'utils'
import { getS3LayersFolderUrl } from 'utils/constants'
import { getTraitCategoriesAndNames } from 'utils/s3'
import { z } from 'zod'
import { protectedProjectProcedure, publicProcedure, router } from '../trpc'

export const traitRouter = router({
    getFromS3: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            return getTraitCategoriesAndNames(input)
        }),
    createFromS3: protectedProjectProcedure
        .input(z.object({ projectSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { projectSlug } = input
            const project = await ctx.prisma.project.findUnique({
                where: {
                    slug: projectSlug,
                },
                include: {
                    organization: true,
                },
            })

            if (!project) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Project not found',
                })
            }

            const traitCategories = await getTraitCategoriesAndNames(
                projectSlug,
            )

            const fileNameToName = (fileName: string): string => {
                return fileName.replace(/_/g, ' ')
            }

            const s3FolderUrl = getS3LayersFolderUrl(projectSlug)

            for (const [traitCategory, traitNameList] of getEntries(
                traitCategories,
            )) {
                // create trait category
                await ctx.prisma.traitCategory.upsert({
                    create: {
                        name: fileNameToName(traitCategory),
                        modifiable: false,
                        defaultAchieved: true, // TODO should be false to prevent sniping
                        zIndex: 0, // TODO
                        project: {
                            connect: {
                                id: project.id,
                            },
                        },
                    },
                    where: {
                        projectId_name: {
                            projectId: project.id,
                            name: fileNameToName(traitCategory),
                        },
                    },
                    update: {},
                })

                // create traits
                for (const traitName of traitNameList) {
                    const pngUrl =
                        s3FolderUrl + traitCategory + '/' + traitName + '.png'

                    await ctx.prisma.trait.upsert({
                        create: {
                            name: fileNameToName(traitName),
                            pngUrl,
                            traitCategory: {
                                connect: {
                                    projectId_name: {
                                        projectId: project.id,
                                        name: fileNameToName(traitCategory),
                                    },
                                },
                            },
                        },
                        where: {
                            projectId_traitCategoryName_name: {
                                projectId: project.id,
                                traitCategoryName:
                                    fileNameToName(traitCategory),
                                name: fileNameToName(traitName),
                            },
                        },
                        update: {
                            pngUrl,
                        },
                    })
                }
            }

            // return traits
        }),
})
