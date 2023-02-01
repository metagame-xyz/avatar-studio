import type { PrismaClient, Trait } from '@prisma/client'
import type { MemberWithAProject, TraitCategoryWithTraitsWithEarned } from './types'

export const getMemberWithProject = (
    prisma: PrismaClient,
    privyDID: string,
    projectSlug: string,
    network = 'goerli',
): Promise<MemberWithAProject> => {
    return prisma.user.findUniqueOrThrow({
        where: {
            privyDID,
        },
        include: {
            achievements: {
                include: {
                    achievement: {
                        include: {
                            traits: true,
                        },
                    },
                },
            },
            projects: {
                where: {
                    projectSlug,
                },
                include: {
                    project: {
                        include: {
                            traitCategories: {
                                include: {
                                    traits: true,
                                },
                            },
                            organization: true,
                        },
                    },
                },
            },
            nftMetadata: {
                where: {
                    network,
                    projectSlug,
                },
                include: {
                    traits: { include: { traitCategory: true } },
                },
                orderBy: { timestamp: 'desc' },
            },
        },
    }) as Promise<MemberWithAProject>
}

// export const getNetworkName = (chainNetwork: string) => (env.NODE_ENV === 'production' ? chainNetwork : 'goerli')
export const getNetworkName = (chainNetwork: string) => chainNetwork

export const getEarnedTraits = (member: MemberWithAProject): TraitCategoryWithTraitsWithEarned[] => {
    const project = member.projects[0]?.project
    if (!project) throw new Error('Project not found')
    // get all traits from the specific project that have been earned by this member
    const earnedTraits = member.achievements
        .reduce((acc, a) => {
            return [...acc, ...a.achievement.traits]
        }, [] as Trait[])
        .filter((t) => t.projectId === project.id)

    const earnedTraitIdSet = new Set(earnedTraits.map((t) => t.id))

    // go through all the traits in each of the TraitCategories and add an earned boolean property if the trait has been earned

    const traitsWithEarnedProperty: TraitCategoryWithTraitsWithEarned[] = project.traitCategories.map((tc) => {
        return {
            ...tc,
            traits: tc.traits.map((t) => {
                return {
                    ...t,
                    category: tc.name,
                    zIndex: tc.zIndex,
                    earned: tc.isDefaultAchieved || t.isDefaultAchieved || earnedTraitIdSet.has(t.id),
                    isModifiable: tc.isModifiable,
                }
            }),
        }
    })

    if (!traitsWithEarnedProperty) throw new Error('No traits found')
    return traitsWithEarnedProperty
        .sort((a, b) => a.zIndex - b.zIndex)
        .sort((a, b) => Number(a.isModifiable) - Number(b.isModifiable))
}
