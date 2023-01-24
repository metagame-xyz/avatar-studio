import Title from 'components/Title'
import TraitImage from 'components/TraitImage'

import type {
    TraitCategoryWithTraitsWithEarned,
    TraitWithEarnedBool,
} from 'utils/types'

type AttributeSelectorProps = {
    traitCategory: TraitCategoryWithTraitsWithEarned
    backgroundTrait: TraitWithEarnedBool
    pfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
    usedNonModifiableCombos?: string[]
}

const AttributeSelector = ({
    traitCategory,
    backgroundTrait,
    pfpState,
    updatePfpState,
    usedNonModifiableCombos = [],
}: AttributeSelectorProps) => {
    const { name, traits: traitOptions, isModifiable } = traitCategory
    // Disable already created Llama combos
    const selectedBodyObject = pfpState.filter((c) => c.name === 'Body')[0]
    const selectedBodyString = `${selectedBodyObject?.category}:${selectedBodyObject?.name}`

    const selectedEyesObject = pfpState.filter((c) => c.name === 'Eyes')[0]
    const selectedEyesString = `${selectedEyesObject?.category}:${selectedEyesObject?.name}`

    // TODO
    const determineIfDisabled = (option: TraitWithEarnedBool): boolean => {
        if (name === 'Body') {
            return usedNonModifiableCombos.includes(
                `Body:${option.name} ${selectedEyesString}`,
            )
        }
        if (name === 'Eyes') {
            return usedNonModifiableCombos.includes(
                `${selectedBodyString} Eyes:${option.name}`,
            )
        }
        return option.earned !== false ? false : true
    }

    return (
        <div className="grid">
            <Title level={3} className="font-title font-bold">
                {name}
            </Title>
            {!isModifiable ? (
                <div className="mt-1 flex flex-col items-center gap-x-1 md:flex-row">
                    <div className=" whitespace-nowrap rounded border-2 border-yellow-300 px-1 text-yellow-300">
                        Permanent trait
                    </div>
                    <div className=" ml-1 text-sm text-teal-50/50">
                        Cannot be changed after minting
                    </div>
                </div>
            ) : null}
            {isModifiable ? (
                <div className="mt-1 flex flex-col items-center gap-x-1 md:flex-row">
                    <div className=" whitespace-nowrap rounded border-2 border-teal-300 px-1 text-teal-300">
                        Upgradeable trait
                    </div>
                    <div className=" ml-1 text-sm text-teal-50/50">
                        Can be changed at any time
                    </div>
                </div>
            ) : null}
            <div
                className="fill-28 mt-4 grid gap-4"
                style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(7rem, 1fr))`,
                }}
            >
                {traitOptions.map((trait, i) => (
                    <TraitImage
                        key={trait.name + i}
                        className={`col-span-1 ${
                            i + 1 === traitOptions.length ? '' : ''
                        }`}
                        trait={trait}
                        backgroundTrait={backgroundTrait}
                        // also select the first in the traitOptions if none are selected
                        selected={
                            pfpState.filter((t) => t.name === trait.name)
                                .length > 0
                        }
                        disabled={determineIfDisabled(trait)}
                        disabledMessage={
                            trait.earned === false
                                ? trait?.achievementsRequiredDescription ||
                                  "Sorry, you haven't unlocked this trait yet."
                                : 'Sorry, someone else already has that llama!'
                        }
                        updatePfpState={updatePfpState}
                    />
                ))}
            </div>
        </div>
    )
}

export default AttributeSelector
