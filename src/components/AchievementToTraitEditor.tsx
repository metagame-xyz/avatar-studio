import { ChevronRightIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useState } from 'react'
import AnimateHeight from 'react-animate-height'
import type { AchievementCategoryWithAs, TraitCategoryWitTraits } from 'utils/types'
import { AchievementCriteriaToggle } from './AchievementCriteriaSelector'

type AchievementToTraitEditorProps = {
    traitCategory: TraitCategoryWitTraits
    achievementCategories: AchievementCategoryWithAs[]
}

const AchievementToTraitEditor = ({ traitCategory, achievementCategories }: AchievementToTraitEditorProps) => {
    const [open, setOpen] = useState<boolean>(false)

    const { name, traits } = traitCategory

    return (
        <div>
            <div
                className="flex w-full items-center justify-between rounded-lg px-4 py-3 hover:cursor-pointer  hover:bg-gray-900 focus:outline-none focus-visible:ring focus-visible:ring-teal-500 focus-visible:ring-opacity-75"
                onClick={() => setOpen(open === false ? true : false)}
            >
                <div className="justify-center text-center text-2xl font-bold sm:mb-0 sm:text-left">{name}</div>

                <ChevronRightIcon
                    className={`h-8 w-8 transform transition-transform duration-300 ${
                        open ? 'rotate-90' : 'rotate-0'
                    } text-teal-500`}
                />
            </div>
            <AnimateHeight animateOpacity duration={300} height={open ? 'auto' : 0}>
                <div className="flex flex-col divide-y border-y">
                    {traits
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .sort((a, b) =>
                            a.achievementsRequired.length === b.achievementsRequired.length
                                ? 0
                                : a.achievementsRequired.length
                                ? -1
                                : 1,
                        )
                        .sort((a, b) =>
                            a.isDefaultAchieved === b.isDefaultAchieved ? 0 : a.isDefaultAchieved ? -1 : 1,
                        )
                        .map((t, i) => (
                            <div key={`${t.name} ${i}`} className="flex gap-4 py-4">
                                <div className="flex">
                                    <Image
                                        width={112}
                                        height={112}
                                        key={`${t.name} ${i}`}
                                        alt={`${t.traitCategoryName} ${t.name}`}
                                        src={t.pngUrl}
                                        className="my-auto"
                                    />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="py-2 text-xl">Trait Name: {t.name}</div>
                                    <AchievementCriteriaToggle
                                        achievementCategoryOptions={achievementCategories}
                                        trait={t}
                                    />
                                </div>
                            </div>
                        ))}
                </div>
            </AnimateHeight>
        </div>
    )
}

export default AchievementToTraitEditor
