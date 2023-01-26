import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { PencilSquareIcon } from '@heroicons/react/24/solid'
import type { SignMessageArgs } from '@wagmi/core'
import AttributeSelector from 'components/AttributeSelector'
import Icon from 'components/Icon'
import Loader from 'components/Loader'
import Title from 'components/Title'
import Tooltip from 'components/Tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import isEqual from 'lodash.isequal'
import sparkles from 'public/icons/sparkles.svg'
import { pfpStateToRequestedTraits, springAnimation } from 'utils/index'
import type { TraitCategoryWithTraitsWithEarned, TraitWithEarnedBool } from 'utils/types'
import { ActionType, Status } from 'utils/types'

type TraitSelectionPanelProps = {
    actionType: ActionType
    assetData: TraitCategoryWithTraitsWithEarned[]
    existingPfpState: TraitWithEarnedBool[] | null
    pfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
    signMessage: (args?: SignMessageArgs | undefined) => void
    userIsSigning: boolean
    mintFunction: ((overrideConfig?: undefined) => void) | undefined
    createNftMetadataStatus: Status
    mintStatus: Status
    mintEnabled: boolean
    className?: string
}

const TraitSelectionPanel = ({
    actionType,
    assetData,
    existingPfpState,
    pfpState,
    updatePfpState,
    signMessage,
    userIsSigning,
    mintFunction,
    createNftMetadataStatus,
    mintStatus,
    mintEnabled,
    className = '',
}: TraitSelectionPanelProps) => {
    return (
        <div
            className={`relative col-span-1 flex w-full flex-col justify-between border-gray-800 ${
                className.length ? className : ''
            }`}
        >
            <div className="grid gap-y-4 overflow-y-scroll p-6">
                <div className="grid gap-y-4 text-center">
                    <Title level={3} className="font-title font-bold">
                        {actionType === 'Mint' ? 'Build your Avatar' : 'Update your Avatar'}
                    </Title>
                    <p className="text-md text-teal-50/75">Unlock more traits over time</p>
                </div>
                {assetData?.map((tc) => {
                    // only show modifiable traits once they've chosen their permanent traits (TODO might disappear between sign & mint)
                    return !!existingPfpState && !tc.isModifiable ? null : (
                        <AttributeSelector
                            key={tc.name}
                            traitCategory={tc}
                            backgroundTrait={assetData.find((t) => t.name === 'Body')?.traits[0] as TraitWithEarnedBool} // TODO no hardcode
                            pfpState={pfpState}
                            updatePfpState={updatePfpState}
                        />
                    )
                })}
            </div>

            <div className="sticky flex items-center justify-center gap-x-4 border-t-2 border-gray-800 py-6">
                {mintEnabled ? (
                    <AnimatePresence>
                        <motion.div
                            key="mint"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ springAnimation }}
                        >
                            <button
                                className="btn-primary relative flex items-center gap-x-2 disabled:opacity-40"
                                onClick={() => mintFunction?.()}
                                disabled={false} // TODO
                            >
                                {mintStatus === Status.loading ? (
                                    <Loader size="sm" />
                                ) : (
                                    <Icon size={2} image={sparkles} />
                                )}
                                Mint NFT
                            </button>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div>
                        <button
                            className="btn-primary relative flex items-center gap-x-2 disabled:opacity-40"
                            onClick={() =>
                                signMessage({
                                    message: JSON.stringify(pfpStateToRequestedTraits(pfpState)),
                                })
                            }
                            disabled={isEqual(pfpState, existingPfpState) || userIsSigning}
                        >
                            <>
                                {userIsSigning || createNftMetadataStatus === Status.loading ? (
                                    <Loader size="sm" />
                                ) : (
                                    <PencilSquareIcon className="w-5" />
                                )}
                                <span>{`${actionType === ActionType.mint ? 'Save' : 'Update'} Trait Choices`}</span>
                                {!existingPfpState && (
                                    <>
                                        <ExclamationCircleIcon className="h-4 w-4 opacity-70" />
                                        <Tooltip
                                            text="You must save your trait choices before you mint."
                                            withInfoIcon
                                        />
                                    </>
                                )}
                            </>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TraitSelectionPanel
