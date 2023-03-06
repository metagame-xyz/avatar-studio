import type { AchievementCategoryWithAs } from 'utils/types'

type AchievementCategoriesListProps = {
    achievementCategories: AchievementCategoryWithAs[]
}

const AchievementCategoriesList: React.FC<AchievementCategoriesListProps> = ({ achievementCategories }) => {
    return achievementCategories.length > 0 ? (
        <div className="flex flex-col gap-4">
            {achievementCategories.map(({ name, description, achievements }) => {
                const desc = description ? ` (${description})` : ''
                const options = achievements ? `${achievements.map((a) => a.name).join(', ')}` : ''
                return (
                    <div key={name}>
                        <div className="text-lg">{`${name}${desc}`}</div>
                        {options && options}
                    </div>
                )
            })}
        </div>
    ) : null
}

export default AchievementCategoriesList
