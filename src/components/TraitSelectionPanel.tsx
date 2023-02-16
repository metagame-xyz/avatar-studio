import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { PencilSquareIcon } from '@heroicons/react/24/solid'
import type { SignMessageArgs } from '@wagmi/core'
import AttributeSelector from 'components/AttributeSelector'
import Icon from 'components/Icon'
import Loader from 'components/Loader'
import Tooltip from 'components/Tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'
import sparkles from 'public/icons/sparkles.svg'
import { areTraitsEqual, pfpStateToRequestedTraits, springAnimation } from 'utils/index'
import type { TraitCategoryWithTraitsWithEarned, TraitWithEarnedBool } from 'utils/types'
import { ActionType, Status } from 'utils/types'
import { useNetwork } from 'wagmi'

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
}: TraitSelectionPanelProps) => {
    const { chain } = useNetwork()
    const router = useRouter()
    const projectSlug = router.query.project as string

    return (
        <div className={`relative col-span-1 flex w-full flex-col justify-between`}>
            <div className="grid gap-y-4 py-6 pr-6 pl-4">
                {assetData?.map((tc) => {
                    // only show modifiable traits once they've chosen their permanent traits (TODO might disappear between sign & mint)
                    return !!existingPfpState && !tc.isModifiable ? null : (
                        <AttributeSelector
                            key={tc.name}
                            traitCategory={tc}
                            pfpState={pfpState}
                            updatePfpState={updatePfpState}
                        />
                    )
                })}
            </div>

            <div className="flex items-center justify-center gap-x-4 py-6">
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
                            onClick={() => {
                                const sendablePfpState =
                                    actionType == ActionType.mint
                                        ? pfpState
                                        : pfpState.filter((trait) => trait.isModifiable)
                                signMessage({
                                    message: JSON.stringify({
                                        requestedTraits: pfpStateToRequestedTraits(sendablePfpState),
                                        chainNetwork: chain?.network || 'ERROR',
                                        projectSlug,
                                    }),
                                })
                            }}
                            disabled={areTraitsEqual(pfpState, existingPfpState) || userIsSigning}
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
