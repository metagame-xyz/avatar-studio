import { ChevronRightIcon } from '@heroicons/react/24/outline'
import TraitImage from 'components/TraitImage'
import { useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { IsNewComboAllowed } from 'utils'
import { trpc } from 'utils/trpc'
import type { TraitCategoryWithTraitsWithEarned, TraitWithEarnedBool } from 'utils/types'
import { useNetwork } from 'wagmi'

type AttributeSelectorProps = {
    traitCategory: TraitCategoryWithTraitsWithEarned
    pfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
}

const AttributeSelector = ({ traitCategory, pfpState, updatePfpState }: AttributeSelectorProps) => {
    const { chain } = useNetwork() // TODO
    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        {
            chainNetwork: chain?.network || '',
        },
        { enabled: !!chain },
    )

    const [open, setOpen] = useState<boolean>(false)

    const { name, traits: traitOptions, isModifiable } = traitCategory

    const traitTypeHeader = isModifiable ? 'Upgradeable trait' : 'Permanent trait'
    const traitTypeText = isModifiable ? 'Can be changed at any time' : 'Cannot be changed after minting'
    const traitTypeStyle = isModifiable ? 'text-purple-300 border-purple-300' : 'text-yellow-300 border-yellow-300'
    const traitTypeBg = isModifiable ? 'bg-purple-300' : 'bg-yellow-300'

    return (
        <div>
            <div
                className="flex w-full items-center justify-between rounded-lg px-4 py-3  hover:bg-gray-900 focus:outline-none focus-visible:ring focus-visible:ring-teal-500 focus-visible:ring-opacity-75"
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
                <div
                    className="fill-28 mt-4 grid justify-items-center gap-4"
                    style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(7rem, 1fr))`,
                    }}
                >
                    {traitOptions.map((trait, i) => (
                        <TraitImage
                            key={`${trait.name} ${i}`}
                            className={`col-span-1 ${i + 1 === traitOptions.length ? '' : ''}`}
                            trait={trait}
                            pfpState={pfpState}
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
            </AnimateHeight>
        </div>
    )
}

export default AttributeSelector
