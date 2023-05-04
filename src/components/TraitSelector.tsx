import { ChevronRightIcon } from '@heroicons/react/24/outline'
import TraitImage from 'components/TraitImage'
import { debounce } from 'lodash'
import { useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { IsNewComboAllowed } from 'utils'
import { trpc } from 'utils/trpc'
import type { AssembledNftTraits, TraitCategoryWithTraitsWithEarned, TraitWithEarnedBool } from 'utils/types'
import { useNetwork } from 'wagmi'

type TraitSelectorProps = {
    traitCategory: TraitCategoryWithTraitsWithEarned
    pfpState: AssembledNftTraits
    updatePfpState: (trait: TraitWithEarnedBool) => void
    updatePreviewPfpState: (trait: TraitWithEarnedBool) => void
}

// hardcode if trait name is X, Y, then colorpicker = true
// hardcode color list, and color css classes, maybe grey border for some colors
// create color picker component. border for selected color
// filter traitOptions based on if the color is in the name of the trait
// update the name to remove the color from the name

const TraitSelector = ({ traitCategory, pfpState, updatePfpState, updatePreviewPfpState }: TraitSelectorProps) => {
    const { chain } = useNetwork() // TODO
    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        {
            chainNetwork: chain?.network || '',
        },
        { enabled: !!chain },
    )

    const [open, setOpen] = useState<boolean>(false)

    const { name, traits: traitOptions, isModifiable } = traitCategory

    const onMouseEnter = (trait: TraitWithEarnedBool) => {
        onMouseLeaveDebounced.cancel()
        updatePreviewPfpState(trait)
    }

    const onMouseLeave = (trait: TraitWithEarnedBool) => {
        const oldTrait = pfpState.find((t) => t.category === trait.category)
        if (oldTrait) updatePreviewPfpState(oldTrait)
    }

    const onMouseLeaveDebounced = debounce(onMouseLeave, 250)

    const hairColors = {
        Silver: 'bg-gray-500',
        Black: 'bg-black-500 border border-gray-700 border-2 p-1',
        Raven: 'bg-[#2C192E]',
        'Dark Brown': 'bg-yellow-950',
        Evergreen: 'bg-emerald-950',
        'Dark Blue': 'bg-blue-900',
        Blue: 'bg-blue-500',
        Indigo: 'bg-indigo-500',
        Purple: 'bg-purple-500',
        Dream: 'bg-violet-500',
        Magenta: 'bg-fuchsia-500',
        Orange: 'bg-orange-400',
        Gold: 'bg-[#604E15]',
        Emerald: 'bg-green-600',
    }

    const bangsColors = {
        Silver: 'bg-gray-500',
        Black: 'bg-black-500 border border-gray-700 border-2 p-1',
        Raven: 'bg-[#2C192E]',
        'Dark Brown': 'bg-yellow-950',
        Evergreen: 'bg-emerald-950',
        'Dark Blue': 'bg-blue-900',
        Blue: 'bg-blue-500',
        Aqua: 'bg-sky-500',
        Indigo: 'bg-indigo-500',
        Purple: 'bg-purple-500',
        Dream: 'bg-violet-500',
        'Electric Purple': 'bg-purple-400',
        Magenta: 'bg-fuchsia-500',
        Orange: 'bg-orange-400',
        Gold: 'bg-[#604E15]',
        Emerald: 'bg-green-600',
    }

    const eyeColors = {
        Space: 'bg-gray-900',
        Wicked: 'bg-[#2C192E]',
        Haze: 'bg-lime-700',
        Green: 'bg-green-500',
        Mango: 'bg-lime-200',
        Lime: 'bg-lime-500',
        Mint: 'bg-teal-500',
        Sea: 'bg-cyan-500',
        Blue: 'bg-blue-500',
        Purple: 'bg-purple-500',
        Dream: 'bg-violet-500',
        Lilac: 'bg-violet-300',
        Magenta: 'bg-fuchsia-500',
        Sunset: 'bg-fuchsia-400',
        Watermelon: 'bg-pink-300',
        Peach: 'bg-pink-300',
        Pink: 'bg-pink-400',
        Red: 'bg-red-500',
        Fire: 'bg-red-700',
        Orange: 'bg-orange-400',
        Yellow: 'bg-yellow-500',
    }

    const categoryColorMap: Record<string, Record<string, string>> = {
        Hair: hairColors,
        Bangs: bangsColors,
        Eyes: eyeColors,
    }

    const colors = categoryColorMap[name] || {}
    const defaultColor = Object.keys(colors)[0] || ''

    const coloredTraits = Object.keys(categoryColorMap)
    const useColorPicker = coloredTraits.includes(name)

    const [color, setColor] = useState<string>(defaultColor)

    const traitTypeHeader = isModifiable ? 'Upgradeable trait' : 'Permanent trait'
    const traitTypeText = isModifiable ? 'Can be changed at any time' : 'Cannot be changed after minting'
    const traitTypeStyle = isModifiable ? 'text-purple-300 border-purple-300' : 'text-yellow-300 border-yellow-300'
    const traitTypeBg = isModifiable ? 'bg-purple-300' : 'bg-yellow-300'

    const ColorPicker = () => {
        return (
            <div
                className="mt-4 grid items-baseline justify-items-center gap-3 px-2"
                style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(3rem, 1fr))`,
                }}
            >
                {Object.entries(colors).map(([colorName, colorClass]) => {
                    const isSelected = color === colorName
                    return (
                        <button key={colorName} onClick={() => setColor(colorName)}>
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className={`h-12 w-12 rounded-full ${colorClass} ${
                                        isSelected && 'outline outline-2 outline-teal-400'
                                    }`}
                                ></div>
                                <div className="text-xs text-gray-400">{colorName}</div>
                            </div>
                        </button>
                    )
                })}
            </div>
        )
    }

    // a function include the trait if the trait's name includes any of the
    const colorFilteredTraitOptions = useColorPicker
        ? traitOptions
              .filter((trait) => trait.name.includes(color))
              .filter((trait) => (color === 'Blue' ? !trait.name.includes('Dark Blue') : true)) // TODO hack, maybe require colors not to be have a substring of another color
              .filter((trait) => (color === 'Purple' ? !trait.name.includes('Electric Purple') : true))
              .map((trait) => ({ ...trait, displayName: trait.name.replace(color, '') }))
        : traitOptions.map((trait) => ({ ...trait, displayName: trait.name }))

    // if (useColorPicker) {
    //     console.log(name)
    //     console.log(colorFilteredTraitOptions.length)
    // }
    return (
        <div>
            <div
                className="flex w-full items-center justify-between rounded-lg px-4 py-3 hover:cursor-pointer  hover:bg-gray-900 focus:outline-none focus-visible:ring focus-visible:ring-teal-500 focus-visible:ring-opacity-75"
                onClick={() => setOpen(open === false ? true : false)}
            >
                <div className="flex flex-row items-center gap-3">
                    <div className={`h-4 w-4 rotate-45 transform ${traitTypeBg}`}></div>
                    <div className="justify-center text-center text-3xl font-bold sm:mb-0 sm:text-left">{name}</div>
                </div>

                <ChevronRightIcon
                    className={`h-8 w-8 transform transition-transform duration-300 ${
                        open ? 'rotate-90' : 'rotate-0'
                    } text-teal-500`}
                />
            </div>
            <AnimateHeight animateOpacity duration={300} height={open ? 'auto' : 0}>
                <div className="mt-1 flex flex-col items-center gap-x-2 px-3 py-2 md:flex-row">
                    <div className={`whitespace-nowrap rounded border-2 px-1 ${traitTypeStyle}`}>{traitTypeHeader}</div>
                    <div className="text-sm text-teal-50/50">{traitTypeText}</div>
                </div>
                {useColorPicker && <ColorPicker />}
                <div
                    className="mt-4 grid justify-items-center gap-4"
                    style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(7rem, 1fr))`,
                    }}
                >
                    {colorFilteredTraitOptions
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .sort((a, b) => (a.earned === b.earned ? 0 : a.earned ? -1 : 1))
                        .map((trait) => (
                            <TraitImage
                                key={`${trait.category} ${trait.displayName}`}
                                className="col-span-1"
                                trait={trait}
                                pfpState={pfpState}
                                // also select the first in the traitOptions if none are selected
                                selected={
                                    pfpState.filter((t) => t.name === trait.name && traitCategory.name === t.category)
                                        .length > 0
                                }
                                disabled={!IsNewComboAllowed(isModifiable, usedCombos, pfpState, trait)}
                                disabledMessage={
                                    trait.earned === false
                                        ? trait?.achievementsRequiredDescription ||
                                          "Sorry, you haven't unlocked this trait yet."
                                        : 'Sorry, someone else already has that combo!'
                                }
                                updatePfpState={updatePfpState}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeaveDebounced}
                            />
                        ))}
                </div>
            </AnimateHeight>
        </div>
    )
}

export default TraitSelector
