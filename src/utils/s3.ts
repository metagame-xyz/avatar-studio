import type { PrismaClient, TraitCategory } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import type * as AWS from 'aws-sdk'
import { z } from 'zod'
import { getCloudfrontLayersFolderUrl } from './constants'
import type { TraitWithCategory } from './types'

const S3FoldersSchema = z.record(z.array(z.string()))
type S3Folders = z.infer<typeof S3FoldersSchema>

export async function getTraitCategoriesAndNames(aws: typeof AWS, projectSlug: string): Promise<S3Folders> {
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
        const fileNameParts = file.Key?.split('/')
        if (!fileNameParts) {
            return
        }

        // combine the second-to-last and last parts of the path to create the new file name
        // "Hair/Blue.png" => "Hair" & "Blue.png"
        // "Hair/Man/Blue.png" => "Hair" & "Man/Blue.png"
        const traitCategory = fileNameParts[3] as string
        const fileName = (
            fileNameParts.length > 5
                ? fileNameParts.slice(fileNameParts.length - 2).join('/')
                : fileNameParts[fileNameParts.length - 1]
        ) as string

        if (!result[traitCategory]) {
            result[traitCategory] = [fileName]
        } else {
            result[traitCategory]?.push(fileName)
        }
    })
    // console.log(result)
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

    const traitCategoriesData = await getTraitCategoriesAndNames(aws, projectSlug)

    const fileNameToName = (fileName: string): string => {
        return fileName.replace(/_/g, ' ')
    }

    const cloudfrontFolderUrl = getCloudfrontLayersFolderUrl(projectSlug)

    const traitCategories: TraitCategory[] = []
    const traits: TraitWithCategory[] = []

    for (const [traitCategoryData, fileNameList] of Object.entries(traitCategoriesData)) {
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

        let fileNames = [] as string[][]

        if (fileNameList[0]?.includes('/')) {
            const fileNamesGroupedByCategory: Record<string, string[]> = {}
            for (const fileName of fileNameList) {
                const category = fileName.split('/')[1] as string
                if (!fileNamesGroupedByCategory[category]) {
                    fileNamesGroupedByCategory[category] = []
                }
                fileNamesGroupedByCategory[category]?.push(fileName)
            }

            fileNames = Object.values(fileNamesGroupedByCategory)
        } else {
            fileNames = fileNameList.map((fileName) => [fileName])
        }
        for (const fileNamesArray of fileNames) {
            const pngUrlMap: Record<string, string> = {}
            let traitName = undefined

            if (fileNamesArray.length > 1) {
                // array of file names for variants of the same trait
                for (const fileName of fileNamesArray) {
                    const baseName = fileName.split('/')[0] as string
                    pngUrlMap[baseName] = cloudfrontFolderUrl + traitCategory.name + '/' + fileName
                }
                traitName = fileNamesArray[0]?.split('/')[1]?.split('.')[0] as string
            } else {
                // single file name for trait, default variant
                const fileName = fileNamesArray[0] as string
                traitName = fileName.split('.')[0] as string
                pngUrlMap['defaultVariant'] = cloudfrontFolderUrl + traitCategory.name + '/' + fileName
            }

            const trait = await prisma.trait.upsert({
                create: {
                    name: fileNameToName(traitName),
                    pngUrlMap,
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
                    pngUrlMap,
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
