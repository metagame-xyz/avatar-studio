import { useState } from 'react'
import type { AchievementCategoryWithAs } from 'utils/types'
import ToggleWithIcon from './Toggle'

type Props = {
    achievementCategories: AchievementCategoryWithAs[]
}

export const AchievementCriteriaToggle = ({ achievementCategories }: Props) => {
    const [enabled, setEnabled] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState(achievementCategories[0] || null)
    const [selectedAchievement, setSelectedAchievement] = useState(achievementCategories[0]?.achievements[0] || null)

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const category = achievementCategories.find((ac) => ac.id === Number(event.target.value)) || null
        setSelectedCategory(category)
        setSelectedAchievement(category?.achievements[0] || null)
    }
    const handleAchievementChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const achievement = selectedCategory?.achievements.find((a) => a.id === Number(event.target.value)) || null
        setSelectedAchievement(achievement)
    }
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-4">
                <div className="flex text-xl">Earnable</div>
                <ToggleWithIcon enabled={enabled} setEnabled={setEnabled} />
            </div>
            {enabled && (
                <div className="flex gap-4">
                    <select className="bg-black" value={selectedCategory?.id} onChange={handleCategoryChange}>
                        {achievementCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center text-xl">is</div>
                    <select className="bg-black" value={selectedAchievement?.id} onChange={handleAchievementChange}>
                        {selectedCategory?.achievements.map((achievement) => (
                            <option key={achievement.id} value={achievement.id}>
                                {achievement.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    )
}
