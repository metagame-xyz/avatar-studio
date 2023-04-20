import type { PrismaClient, Trait } from '@prisma/client'
import { LevelLogic } from '@prisma/client'
import type { MemberWithAProject, TraitCategoryWithTraitsWithEarned } from './types'

export const getMemberWithProject = async (
    prisma: PrismaClient,
    privyDID: string,
    projectSlug: string,
    network = 'sepolia',
): Promise<MemberWithAProject> => {
    const memberWithAProjectRaw = await prisma.user.findUniqueOrThrow({
        where: {
            privyDID,
        },
        include: {
            achievements: {
                where: {},
                include: {
                    achievement: {
                        include: {
                            traits: true,
                            achievementCategory: true,
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
            organizations: true,
        },
    })

    const project = memberWithAProjectRaw.projects[0]?.project
    // if (!project) throw new Error('Member not a part of this project')

    const memberWithAProject = {
        ...memberWithAProjectRaw,
        achievements: memberWithAProjectRaw.achievements.filter(
            (a) => a.achievement.achievementCategory.projectId === project?.id,
        ),
        project,
    } as MemberWithAProject

    return memberWithAProject
}

// export const getNetworkName = (chainNetwork: string) => (env.NODE_ENV === 'production' ? chainNetwork : 'sepolia')
export const getNetworkName = (chainNetwork: string) => chainNetwork

export const hasCorrectLevelForTrait = (trait: Trait, level: number) => {
    if (!trait.levelRequired) return false
    switch (trait.levelLogic) {
        case LevelLogic.EQUAL_TO:
            return level === trait.levelRequired
        case LevelLogic.GREATER_THAN_OR_EQUAL_TO:
            return level >= trait.levelRequired
        case LevelLogic.LESS_THAN_OR_EQUAL_TO:
            return level <= trait.levelRequired
    }
}

export const getEarnedTraits = (member: MemberWithAProject): TraitCategoryWithTraitsWithEarned[] => {
    const { project } = member
    if (!project) throw new Error('Project not found')

    const achievements = member.achievements
        .filter((memberAchievement) => !!memberAchievement.status)
        .flatMap((a) => a.achievement)

    // get all traits from the specific project that have been earned by this member via specific achievements
    const earnedTraits = achievements.flatMap((a) => a.traits)

    // get traits that have been earned via level logic
    const levelLogicTraits = project.traitCategories.flatMap((tc) => tc.traits).filter((t) => !!t.levelLogic)

    levelLogicTraits.forEach((t) => {
        const level = achievements.find((a) => a.achievementCategoryId === t.achievementCategoryId)?.level
        if (level && hasCorrectLevelForTrait(t, level)) {
            earnedTraits.push(t)
        }
    })

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
