import { AchievementType, LevelLogic } from '@prisma/client'
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
    const connectLevelAchievement = trpc.trait.connectLevelAchievement.useMutation({})
    const makeTraitComplimentary = trpc.trait.toggleTraitComplimentary.useMutation({})

    const [earnable, setEarnable] = useState(
        trait.achievementsRequired.length > 0 || !!trait.levelLogic || !!trait.isDefaultAchieved,
    )
    const [isComplimentary, setIsComplimentary] = useState(!!trait.isDefaultAchieved)

    const levelCategoryId = trait.levelCategory?.id
    const specificAchievementCategoryId = trait.achievementsRequired[0]?.achievementCategoryId
    const existingCategory = achievementCategoryOptions.find(
        (ac) => ac.id === (levelCategoryId || specificAchievementCategoryId),
    )

    const existingAchievement = trait.achievementsRequired[0]

    const [selectedCategory, setSelectedCategory] = useState(existingCategory || achievementCategoryOptions[0] || null)
    const [selectedAchievement, setSelectedAchievement] = useState(existingAchievement || null)
    const [selectedLevel, setSelectedLevel] = useState(trait.levelRequired || undefined)
    const [selectedLevelLogic, setSelectedLevelLogic] = useState(
        trait.levelLogic || LevelLogic.GREATER_THAN_OR_EQUAL_TO,
    )

    // console.log('selectedCategory', selectedCategory)

    const handleSetEarnable = (earnable: boolean) => {
        if (!earnable) {
            removeAchievement.mutate({ traitId: trait.id })
            setSelectedCategory(existingCategory || achievementCategoryOptions[0] || null)
            setSelectedAchievement(null)
            setSelectedLevel(undefined)
        }
        setEarnable(earnable)
    }

    const handleSetIsComplimentary = (isComplimentary: boolean) => {
        makeTraitComplimentary.mutate({ traitId: trait.id, isComplimentary })

        setSelectedCategory(existingCategory || achievementCategoryOptions[0] || null)
        setSelectedAchievement(null)
        setSelectedLevel(undefined)
        setIsComplimentary(isComplimentary)
    }

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const category = achievementCategoryOptions.find((ac) => ac.id === Number(event.target.value)) || null
        setSelectedCategory(category)
        setSelectedAchievement(null)
        setSelectedLevel(undefined)
        removeAchievement.mutate({ traitId: trait.id })
    }
    const handleAchievementChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const achievement = selectedCategory?.achievements.find((a) => a.id === Number(event.target.value)) || null
        setSelectedAchievement(achievement)
        if (achievement) {
            connectAchievement.mutate({
                traitId: trait.id,
                achievementId: achievement.id,
                achievementsRequiredDescription: `requires ${achievement.name}`,
            })
        } else {
            removeAchievement.mutate({ traitId: trait.id })
        }
    }

    const handleLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const level = event.target.valueAsNumber

        setSelectedLevel(level)

        if (level && selectedLevelLogic && selectedCategory) {
            connectLevelAchievement.mutate({
                traitId: trait.id,
                levelRequired: level,
                levelLogic: selectedLevelLogic,
                levelCategoryId: selectedCategory.id,
                achievementsRequiredDescription: `requires ${selectedCategory?.name} ${levelLogicString[selectedLevelLogic]} ${level}`,
            })
        } else {
            removeAchievement.mutate({ traitId: trait.id })
        }
    }

    const handleLevelLogicChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const levelLogic = LevelLogic[event.target.value as keyof typeof LevelLogic]

        setSelectedLevelLogic(levelLogic)

        if (selectedLevel && levelLogic && selectedCategory) {
            connectLevelAchievement.mutate({
                traitId: trait.id,
                levelRequired: selectedLevel,
                levelLogic: levelLogic,
                levelCategoryId: selectedCategory.id,
                achievementsRequiredDescription: `requires ${selectedCategory?.name} ${levelLogicString[levelLogic]} ${selectedLevel}`,
            })
        } else {
            removeAchievement.mutate({ traitId: trait.id })
        }
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

    const levelLogicString = {
        [LevelLogic.GREATER_THAN_OR_EQUAL_TO]: '≥',
        [LevelLogic.LESS_THAN_OR_EQUAL_TO]: '≤',
        [LevelLogic.EQUAL_TO]: '=',
        [LevelLogic.MORE_THAN_OR_EQUAL_TO]: '≥',
    }

    const gtoet = '≥'
    const ltoet = '≤'
    const eq = '='

    const LevelAchievementSelector = () => (
        <>
            <select className="bg-black" value={selectedLevelLogic} onChange={handleLevelLogicChange}>
                <option key={gtoet} value={LevelLogic.GREATER_THAN_OR_EQUAL_TO}>
                    {gtoet}
                </option>
                <option key={ltoet} value={LevelLogic.LESS_THAN_OR_EQUAL_TO}>
                    {ltoet}
                </option>
                <option key={eq} value={LevelLogic.EQUAL_TO}>
                    {eq}
                </option>
            </select>
            {/* <div className="flex items-center text-xl">{`is ${mtoet}`}</div> */}
            <input className="bg-black" value={selectedLevel} onChange={handleLevelChange} type="number" step="1" />
        </>
    )

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-4">
                <div className="flex text-xl">Earnable</div>
                <ToggleWithIcon enabled={earnable} setEnabled={handleSetEarnable} />
            </div>
            {earnable && (
                <div className="flex gap-4">
                    <div className="flex text-xl">Complimentary</div>
                    <ToggleWithIcon enabled={isComplimentary} setEnabled={handleSetIsComplimentary} />
                </div>
            )}
            {earnable && !isComplimentary && (
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
