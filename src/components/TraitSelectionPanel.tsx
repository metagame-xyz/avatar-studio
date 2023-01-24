/* eslint-disable @typescript-eslint/ban-types */
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { PencilSquareIcon } from '@heroicons/react/24/solid'
import AttributeSelector from 'components/AttributeSelector'
import Icon from 'components/Icon'
import Loader from 'components/Loader'
import Title from 'components/Title'
import Tooltip from 'components/Tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import sparkles from 'public/icons/sparkles.svg'
import { cleanPfpStateForSubmission, springAnimation } from 'utils/index'
import type {
    MintStatus,
    TraitCategoryWithTraitsWithEarned,
    TraitWithEarnedBool,
} from 'utils/types'

type TraitSelectionPanelProps = {
    actionType: 'Mint' | 'Update'
    assetData: TraitCategoryWithTraitsWithEarned[]
    pfpState: TraitWithEarnedBool[]
    initialPfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
    signMessage: Function
    userIsSigning: boolean
    mintFunction: Function | undefined
    metagameStatus: MintStatus
    mintStatus: MintStatus
    mintEnabled: boolean
    className?: string
}

const TraitSelectionPanel = ({
    actionType,
    assetData,
    pfpState,
    initialPfpState,
    updatePfpState,
    signMessage,
    userIsSigning,
    mintFunction,
    metagameStatus,
    mintStatus,
    mintEnabled,
    className = '',
}: TraitSelectionPanelProps) => {
    const checkIfPfpChanged = () => {
        if (initialPfpState.length !== pfpState.length) return false

        return initialPfpState.every((trait1, index) => {
            const trait2 = pfpState[index] as TraitWithEarnedBool
            return (
                trait1.name === trait2.name &&
                trait1.category === trait2.category
            )
        })
    }

    return (
        <div
            className={`relative col-span-1 flex w-full flex-col justify-between border-gray-800 ${
                className.length ? className : ''
            }`}
        >
            <div className="grid gap-y-4 overflow-y-scroll p-6">
                <div className="grid gap-y-4 text-center">
                    <Title level={3} className="font-title font-bold">
                        {actionType === 'Mint'
                            ? 'Build your Avatar'
                            : 'Update your Avatar'}
                    </Title>
                    <p className="text-md text-teal-50/75">
                        Unlock more traits over time
                    </p>
                </div>
                {assetData?.map((tc) => (
                    <AttributeSelector
                        key={tc.name}
                        traitCategory={tc}
                        backgroundTrait={
                            assetData.find((t) => t.name === 'Body')
                                ?.traits[0] as TraitWithEarnedBool
                        } // TODO no hardcode
                        pfpState={pfpState}
                        updatePfpState={updatePfpState}
                    />
                ))}
            </div>

            <div className="sticky flex items-center justify-center gap-x-4 border-t-2 border-gray-800 py-6">
                {/* {!mintEnabled && !userIsSigning ? (
                    <AnimatePresence>
                        <div>
                            <button
                                className="btn-secondary flex items-center gap-x-2"
                                onClick={() => {
                                    resetPfpState(initialPfpState)
                                }}
                                disabled={
                                    actionType === 'Mint'
                                        ? false
                                        : checkIfPfpChanged()
                                }
                            >
                                <ArrowPathIcon className="w-5" />
                                Reset Choices
                            </button>
                        </div>
                    </AnimatePresence>
                ) : null} */}

                {actionType === 'Mint' ? (
                    mintEnabled ? (
                        <AnimatePresence>
                            <motion.div
                                key="mint"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ springAnimation }}
                            >
                                <button
                                    className="flex items-center gap-x-2 rounded"
                                    onClick={() => mintFunction?.()}
                                    disabled={pfpState.length !== 4}
                                >
                                    {mintStatus === 'loading' ? (
                                        <Loader size="sm" />
                                    ) : (
                                        <Icon size={2} image={sparkles} />
                                    )}
                                    Mint NFT
                                </button>
                            </motion.div>{' '}
                        </AnimatePresence>
                    ) : (
                        <div>
                            <button
                                className="btn-primary relative flex items-center gap-x-2 disabled:opacity-40"
                                onClick={() =>
                                    signMessage({
                                        message: JSON.stringify(
                                            cleanPfpStateForSubmission(
                                                pfpState,
                                            ),
                                        ),
                                    })
                                }
                                disabled={pfpState.length !== 4}
                            >
                                {userIsSigning ||
                                metagameStatus === 'loading' ? (
                                    <>
                                        {' '}
                                        <Loader size="sm" />
                                        <span>Sign</span>
                                    </>
                                ) : (
                                    <>
                                        <PencilSquareIcon className="w-5" />
                                        <span>Sign</span>
                                        <ExclamationCircleIcon className="h-4 w-4 opacity-70" />
                                        <Tooltip
                                            text="We need your signature before you can mint."
                                            withInfoIcon
                                        />
                                    </>
                                )}
                            </button>{' '}
                        </div>
                    )
                ) : (
                    <button
                        className="flex items-center gap-x-2 rounded"
                        onClick={() =>
                            signMessage({
                                message: JSON.stringify(
                                    cleanPfpStateForSubmission(pfpState),
                                ),
                            })
                        }
                        disabled={pfpState.length !== 4 || checkIfPfpChanged()}
                    >
                        {userIsSigning ? (
                            <Loader size="sm" />
                        ) : (
                            <Icon size={2} image={sparkles} />
                        )}
                        Update NFT
                    </button>
                )}
            </div>
        </div>
    )
}

export default TraitSelectionPanel
