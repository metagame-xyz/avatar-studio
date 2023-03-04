import { AchievementType } from '@prisma/client'
import { useState } from 'react'
import { trpc } from 'utils/trpc'
import type { AchievementCategoryWithAs, TraitWithAchievements } from 'utils/types'
import ToggleWithIcon from './Toggle'

type Props = {
    achievementCategoryOptions: AchievementCategoryWithAs[]
    trait: TraitWithAchievements
}

export const AchievementCriteriaToggle = ({ achievementCategoryOptions, trait }: Props) => {
    const connectAchievement = trpc.trait.connectAchievement.useMutation({})
    const removeAchievement = trpc.trait.removeAchievement.useMutation({})
    const [enabled, setEnabled] = useState(trait.achievementsRequired.length > 0)

    const levelCategoryId = trait.levelCategory?.id
    const specificAchievementCategoryId = trait.achievementsRequired[0]?.achievementCategoryId
    const existingCategory = achievementCategoryOptions.find(
        (ac) => ac.id === (levelCategoryId || specificAchievementCategoryId),
    )

    const existingAchievement = trait.achievementsRequired[0]

    const [selectedCategory, setSelectedCategory] = useState(existingCategory || achievementCategoryOptions[0] || null)
    const [selectedAchievement, setSelectedAchievement] = useState(existingAchievement || null)
    const [selectedLevel, setSelectedLevel] = useState(trait.levelRequired || undefined)

    // console.log('selectedCategory', selectedCategory)

    const handleSetEnabled = (enabled: boolean) => {
        if (!enabled) {
            removeAchievement.mutate({ traitId: trait.id })
            setSelectedCategory(existingCategory || achievementCategoryOptions[0] || null)
            setSelectedAchievement(null)
        }
        setEnabled(enabled)
    }

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const category = achievementCategoryOptions.find((ac) => ac.id === Number(event.target.value)) || null
        setSelectedCategory(category)
        setSelectedAchievement(null)
    }
    const handleAchievementChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const achievement = selectedCategory?.achievements.find((a) => a.id === Number(event.target.value)) || null
        setSelectedAchievement(achievement)
        if (achievement) {
            connectAchievement.mutate({
                traitId: trait.id,
                achievementId: achievement.id,
                achievementsRequiredDescription: achievement.name,
            })
        } else {
            removeAchievement.mutate({ traitId: trait.id })
        }
    }

    // TODO
    const handleLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // const achievement = selectedCategory?.achievements.find((a) => a.id === Number(event.target.value)) || null
        setSelectedLevel(event.target.valueAsNumber)
    }

    const SpecificAchievementSelector = () => (
        <>
            <div className="flex items-center text-xl">is</div>
            <select className="bg-black" value={selectedAchievement?.id} onChange={handleAchievementChange}>
                <option key={'null'} value={undefined}></option>
                {selectedCategory?.achievements.map((achievement) => (
                    <option key={achievement.id} value={achievement.id}>
                        {achievement.name}
                    </option>
                ))}
            </select>
        </>
    )

    const mtoet = '≥'
    const ltoet = '≤'

    const LevelAchievementSelector = () => (
        <>
            <div className="flex items-center text-xl">{`is ${mtoet}`}</div>
            <input className="bg-black" value={selectedLevel} onChange={handleLevelChange} type="number" step="1" />
        </>
    )

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-4">
                <div className="flex text-xl">Earnable</div>
                <ToggleWithIcon enabled={enabled} setEnabled={handleSetEnabled} />
            </div>
            {enabled && (
                <div className="flex gap-4">
                    <select className="bg-black" value={selectedCategory?.id} onChange={handleCategoryChange}>
                        {achievementCategoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    {selectedCategory?.type === AchievementType.LEVEL ? (
                        <LevelAchievementSelector />
                    ) : (
                        <SpecificAchievementSelector />
                    )}
                </div>
            )}
        </div>
    )
}
