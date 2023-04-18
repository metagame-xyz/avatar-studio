import type { Achievement, AchievementCategory, MemberAchievements, Trait } from '@prisma/client'

type MemberAchievementsListProps = {
    memberAchievements: (MemberAchievements & {
        achievement: Achievement & {
            traits: Trait[]
            achievementCategory: AchievementCategory
        }
    })[]
}

type AchievementsByCategory = AchievementCategory & {
    achievements: Achievement[]
}

const groupMemberAchievementsByCategory = (
    memberAchievements: MemberAchievementsListProps['memberAchievements'],
): AchievementsByCategory[] => {
    const categoryMap = memberAchievements.reduce((map, memberAchievement) => {
        const { achievementCategory: category } = memberAchievement.achievement
        const categoryId = category.id

        if (!map[categoryId]) {
            map[categoryId] = { ...category, achievements: [] }
        }

        map[categoryId]?.achievements.push(memberAchievement.achievement)

        return map
    }, [] as AchievementsByCategory[])

    return Object.values(categoryMap).reduce((result, { achievements, ...category }) => {
        const existingCategoryIndex = result.findIndex((resultCategory) => resultCategory.id === category.id)

        if (existingCategoryIndex === -1) {
            result.push({ ...category, achievements })
        } else {
            result[existingCategoryIndex]?.achievements?.push(...achievements)
        }

        return result
    }, [] as AchievementsByCategory[])
}

const MemberAchievementsList: React.FC<MemberAchievementsListProps> = ({ memberAchievements }) => {
    const achievementsByCategory = groupMemberAchievementsByCategory(memberAchievements)
    return achievementsByCategory.length > 0 ? (
        <div className="flex flex-col gap-4">
            {achievementsByCategory.map(({ name, description, achievements }) => {
                const desc = description ? ` (${description})` : ''
                const options = achievements.map(({ name }) => {
                    return (
                        <span key={name} className="flex h-7 items-center rounded-lg bg-gray-600 px-2 text-teal-50">
                            {name}
                        </span>
                    )
                })
                return (
                    <div key={name}>
                        <div className="flex flex-row flex-wrap items-center gap-2 px-1 pb-2 text-xl">
                            <div className="">{`${name}${desc}:`}</div>
                            <div className="flex gap-2 text-base">{options}</div>
                        </div>
                        {/* <div className="flex flex-row flex-wrap gap-2"> {options} </div> */}
                    </div>
                )
            })}
        </div>
    ) : null
}

export default MemberAchievementsList
