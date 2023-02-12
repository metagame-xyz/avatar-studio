import type { AchievementCategory } from '@prisma/client'

type AchievementCategoriesListProps = {
    achievementCategories: AchievementCategory[]
}

const AchievementCategoriesList: React.FC<AchievementCategoriesListProps> = ({ achievementCategories }) => {
    return achievementCategories.length > 0 ? (
        <div>
            {achievementCategories.map(({ name, type, description }) => (
                <div className="mt-2 flex items-center" key={name}>
                    {name} {type} ({description})
                </div>
            ))}
        </div>
    ) : null
}

export default AchievementCategoriesList
