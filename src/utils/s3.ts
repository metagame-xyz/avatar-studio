import type { PrismaClient, TraitCategory } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import type * as AWS from 'aws-sdk'
import { z } from 'zod'
import { getS3LayersFolderUrl } from './constants'
import type { TraitWithCategory } from './types'

const S3FoldersSchema = z.record(z.array(z.string()))
type S3Folders = z.infer<typeof S3FoldersSchema>

export async function getTraitCategoriesAndNames(
    aws: typeof AWS,
    projectSlug: string,
): Promise<S3Folders> {
    const s3 = new aws.S3()
    const result: S3Folders = {}

    const params = {
        Bucket: 'metagame-xyz',
        Prefix: `nft-images/${projectSlug}/Layers`,
    }

    const data = await s3.listObjectsV2(params).promise()
    const files = data.Contents

    files?.forEach((file) => {
        // get the file name
        const traitName = file.Key?.split('/').pop()?.split('.')[0] as string
        // take the last folder name as the key
        const traitCategory = file.Key?.split('/').slice(-2)[0] as string

        if (!result[traitCategory]) {
            result[traitCategory] = [traitName]
        } else {
            result[traitCategory]?.push(traitName)
        }
    })
    return result
}

export const getFromS3 = async (
    aws: typeof AWS,
    prisma: PrismaClient,
    projectSlug: string,
): Promise<{
    traitCategories: TraitCategory[]
    traits: TraitWithCategory[]
}> => {
    const project = await prisma.project.findUnique({
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

    const traitCategoriesData = await getTraitCategoriesAndNames(
        aws,
        projectSlug,
    )

    const fileNameToName = (fileName: string): string => {
        return fileName.replace(/_/g, ' ')
    }

    const s3FolderUrl = getS3LayersFolderUrl(projectSlug)

    const traitCategories: TraitCategory[] = []
    const traits: TraitWithCategory[] = []

    for (const [traitCategoryData, traitNameList] of Object.entries(
        traitCategoriesData,
    )) {
        // create trait category
        const traitCategory = await prisma.traitCategory.upsert({
            create: {
                name: fileNameToName(traitCategoryData),
                isModifiable: false,
                isDefaultAchieved: true, // TODO should be false to prevent sniping
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
                    name: fileNameToName(traitCategoryData),
                },
            },
            update: {},
        })

        traitCategories.push(traitCategory)

        // create traits
        for (const traitName of traitNameList) {
            const pngUrl =
                s3FolderUrl + traitCategory.name + '/' + traitName + '.png'

            const trait = await prisma.trait.upsert({
                create: {
                    name: fileNameToName(traitName),
                    pngUrl,
                    traitCategory: {
                        connect: {
                            projectId_name: {
                                projectId: project.id,
                                name: fileNameToName(traitCategoryData),
                            },
                        },
                    },
                },
                where: {
                    projectId_traitCategoryName_name: {
                        projectId: project.id,
                        traitCategoryName: fileNameToName(traitCategoryData),
                        name: fileNameToName(traitName),
                    },
                },
                update: {
                    pngUrl,
                },
                include: {
                    traitCategory: true,
                },
            })

            traits.push(trait)
        }
    }

    return {
        traitCategories,
        traits,
    }
}
