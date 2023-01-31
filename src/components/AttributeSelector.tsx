import Title from 'components/Title'
import TraitImage from 'components/TraitImage'
import { trpc } from 'utils/trpc'

import { IsNewComboAllowed } from 'utils'
import type { TraitCategoryWithTraitsWithEarned, TraitWithEarnedBool } from 'utils/types'
import { useNetwork } from 'wagmi'

type AttributeSelectorProps = {
    traitCategory: TraitCategoryWithTraitsWithEarned
    backgroundTrait: TraitWithEarnedBool
    pfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
}

const AttributeSelector = ({ traitCategory, backgroundTrait, pfpState, updatePfpState }: AttributeSelectorProps) => {
    const { chain } = useNetwork() // TODO
    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        {
            chainNetwork: chain?.network || '',
        },
        { enabled: !!chain },
    )

    const { name, traits: traitOptions, isModifiable } = traitCategory

    return (
        <div className="grid">
            <Title level={3} className="font-title mb-1 text-center font-bold sm:mb-0 sm:text-left">
                {name}
            </Title>
            {!isModifiable ? (
                <div className="mt-1 flex flex-col items-center gap-x-1 md:flex-row">
                    <div className=" whitespace-nowrap rounded border-2 border-yellow-300 px-1 text-yellow-300">
                        Permanent trait
                    </div>
                    <div className=" ml-1 text-sm text-teal-50/50">Cannot be changed after minting</div>
                </div>
            ) : null}
            {isModifiable ? (
                <div className="mt-1 flex flex-col items-center gap-x-1 md:flex-row">
                    <div className=" whitespace-nowrap rounded border-2 border-teal-300 px-1 text-teal-300">
                        Upgradeable trait
                    </div>
                    <div className=" ml-1 text-sm text-teal-50/50">Can be changed at any time</div>
                </div>
            ) : null}
            <div
                className="fill-28 mt-4 grid justify-items-center gap-4"
                style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(7rem, 1fr))`,
                }}
            >
                {traitOptions.map((trait, i) => (
                    <TraitImage
                        key={trait.name + i}
                        className={`col-span-1 ${i + 1 === traitOptions.length ? '' : ''}`}
                        trait={trait}
                        backgroundTrait={backgroundTrait}
                        // also select the first in the traitOptions if none are selected
                        selected={pfpState.filter((t) => t.name === trait.name).length > 0}
                        disabled={!IsNewComboAllowed(isModifiable, usedCombos, pfpState, trait)}
                        disabledMessage={
                            trait.earned === false
                                ? trait?.achievementsRequiredDescription ||
                                  "Sorry, you haven't unlocked this trait yet."
                                : 'Sorry, someone else already has that combo!'
                        }
                        updatePfpState={updatePfpState}
                    />
                ))}
            </div>
        </div>
    )
}

export default AttributeSelector
