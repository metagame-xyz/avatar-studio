import type { AchievementCategoryWithAs } from 'utils/types'

type AchievementCategoriesListProps = {
    achievementCategories: AchievementCategoryWithAs[]
}

const AchievementCategoriesList: React.FC<AchievementCategoriesListProps> = ({ achievementCategories }) => {
    return achievementCategories.length > 0 ? (
        <div className="flex flex-col gap-4">
            {achievementCategories.map(({ name, description, achievements }) => {
                const desc = description ? ` (${description})` : ''
                const options = achievements.map(({ name }) => {
                    return (
                        <div key={name} className=" rounded-lg bg-gray-600 px-2 text-teal-50">
                            {name}
                        </div>
                    )
                })
                return (
                    <div key={name}>
                        <div className="px-1 pb-2 text-xl">{`${name}${desc}`}</div>
                        <div className="flex flex-row flex-wrap gap-2"> {options} </div>
                    </div>
                )
            })}
        </div>
    ) : null
}

export default AchievementCategoriesList
