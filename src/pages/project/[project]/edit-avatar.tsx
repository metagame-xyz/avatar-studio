import FullPageLoading from 'components/FullPageLoading'
import Loading from 'components/Loading'
import Modal from 'components/Modal'
import PfpPreview from 'components/PfpPreview'
import Shell from 'components/Shell'
import Title from 'components/Title'
import TraitSelector from 'components/TraitSelector'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    areTraitArraysEqual,
    getDecodedTransferEvent,
    getOpenseaUrl,
    isComboAllowed,
    pfpStateToRequestedTraits,
    springAnimation,
    traitsToAssembledNftTraits,
} from 'utils'
import { NETWORK } from 'utils/constants'
import { llamaPfpABI } from 'utils/llamaPfpABI'
import { trpc } from 'utils/trpc'
import type { AssembledNftTraits, Signature, Status, TraitWithEarnedBool } from 'utils/types'
import { AllowedAction } from 'utils/types'
import {
    mainnet,
    useAccount,
    useContractWrite,
    useNetwork,
    usePrepareContractWrite,
    useSignMessage,
    useSwitchNetwork,
    useWaitForTransaction,
} from 'wagmi'
import { sepolia } from 'wagmi/chains'

const EditAvatar = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string

    const { address } = useAccount()
    const { chain } = useNetwork()
    const { isLoading, pendingChainId, switchNetwork } = useSwitchNetwork()
    const switchChainRef = useRef(null)
    const trpcUtils = trpc.useContext()

    const { data: project } = trpc.project.getProject.useQuery()
    const { data: assetData } = trpc.member.traitsAchieved.useQuery({ projectSlug }, { enabled: !!projectSlug })

    const correctChain = [sepolia, mainnet].find((chain) => chain.network === NETWORK) || sepolia
    const [isChainModalOpen, setIsChainModalOpen] = useState<boolean>(!!(chain?.id !== correctChain?.id))
    const [isUpdatingTraitsModalOpen, setIsUpdatingTraitsModalOpen] = useState<boolean>(false)
    useEffect(() => {
        setIsChainModalOpen(chain?.id !== correctChain?.id)
    }, [correctChain, chain])

    const network = chain?.network || ''

    const { data: existingNftMetadata } = trpc.member.nftMetadata.useQuery(
        {
            projectSlug,
            chainNetwork: network,
        },
        { enabled: !!projectSlug && !!chain },
    )

    const { data: signature } = trpc.member.getSignature.useQuery(
        { projectSlug, chainNetwork: network },
        { enabled: !!projectSlug && !!existingNftMetadata },
    )

    useEffect(() => {
        if (signature) setSignatureForMint(signature)
    }, [signature])

    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        { chainNetwork: network },
        { enabled: !!projectSlug && !!chain },
    )

    // TODO this will be cleaner if you use this instead
    const enum NftState {
        noDataNoNft = 'noDataNoNFT',
        hasDataNoNft = 'hasDataNoNFT',
        hasDataAndNft = 'noDataOrNFT',
    }

    const [nftState, setNftState] = useState<NftState>(NftState.noDataNoNft)
    const [allowedAction, setAllowedAction] = useState<AllowedAction>(AllowedAction.create)
    const [existingPfpState, setExistingPfpState] = useState<AssembledNftTraits | null>(null)
    // set existing pfp state if user has an nft
    // set nft state (data in db, and then also if minted and has a tokenId)
    useEffect(() => {
        existingNftMetadata?.traits && setExistingPfpState(existingNftMetadata?.traits)

        // user already has an nft, as shown by having a tokenId
        if (existingNftMetadata?.tokenId) {
            setNftState(NftState.hasDataAndNft)
            setAllowedAction(AllowedAction.update)
        }

        // user has data in db, so ready to mint, but no tokenId yet
        if (existingNftMetadata && !existingNftMetadata?.tokenId) {
            setNftState(NftState.hasDataNoNft)

            const statesAreSame = areTraitArraysEqual(existingNftMetadata?.traits, pfpState)
            setAllowedAction(statesAreSame ? AllowedAction.mint : AllowedAction.update)
        }

        // user has no data in db, so not ready to mint
        if (!existingNftMetadata) {
            setNftState(NftState.noDataNoNft)
            setAllowedAction(AllowedAction.create)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingNftMetadata])

    const [pfpState, setPfpState] = useState<AssembledNftTraits>([])
    const [txHash, setTxHash] = useState<`0x${string}`>()
    const [signatureForMint, setSignatureForMint] = useState<Signature>()

    // upload data to db
    const createOrUpdateNftMetadata = trpc.member.createOrUpdateNftMetadata.useMutation({
        onSuccess: (data) => {
            if (nftState === NftState.hasDataAndNft) {
                toast.success(`Your ${project?.name} updated!`)
            }
            if ([NftState.hasDataNoNft, NftState.noDataNoNft].includes(nftState)) {
                setSignatureForMint(data)
                setNftState(NftState.hasDataNoNft)
                setAllowedAction(AllowedAction.mint)
                toast.success(`You may mint your ${project?.name} now`)
            }
            setIsUpdatingTraitsModalOpen(false)
            trpcUtils.member.nftMetadata.invalidate()
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

    // set initial pfpState
    useEffect(() => {
        if (existingNftMetadata?.traits && assetData && !createOrUpdateNftMetadata.isLoading) {
            setPfpState(existingNftMetadata.traits)
        } else if (assetData && !pfpState.length && usedCombos) {
            let defaultPfpState: AssembledNftTraits | undefined = undefined

            let safety = 0
            while (!isComboAllowed(usedCombos, defaultPfpState)) {
                // create a new combo for defaultPfPState if taken
                defaultPfpState = traitsToAssembledNftTraits(
                    assetData
                        .map((traitCategory) => {
                            const earnedTraits = traitCategory.traits.filter((t) => t.earned)
                            if (!earnedTraits.length) return null
                            const i = Math.floor(Math.random() * earnedTraits.length)
                            return earnedTraits[i] as TraitWithEarnedBool
                        })
                        .filter((t) => !!t) as TraitWithEarnedBool[],
                )

                safety++
                if (safety > 144) throw new Error('Could not find an allowed combo. Call Brenner')
            }
            if (!defaultPfpState) throw new Error('defaultPfpState is undefined. Call Brenner')
            setPfpState(defaultPfpState)
        }
    }, [assetData, createOrUpdateNftMetadata.isLoading, existingNftMetadata?.traits, pfpState.length, usedCombos])

    // Signing transaction (pre-mint & for updating pfp)
    const { isLoading: userIsSigning, signMessage } = useSignMessage({
        onSuccess(data) {
            const sendablePfpState =
                allowedAction == AllowedAction.create ? pfpState : pfpState.filter((trait) => trait.isModifiable)

            setIsUpdatingTraitsModalOpen(true)

            createOrUpdateNftMetadata.mutate({
                projectSlug,
                requestedTraits: pfpStateToRequestedTraits(sendablePfpState),
                chainNetwork: network,
                signature: data,
            })
        },
        onError(error) {
            console.error(error)
            toast.error('Error signing message.')
        },
    })

    // TODO maybe un-hardcode homestead?
    const contractAddress = network === 'homestead' ? project?.contractAddress : project?.testContractAddress
    const placeholderHex = '0x00' as `0x${string}`

    // Minting functions

    const [preventingMintError, setPreventingMintError] = useState<string | null>(null)
    const { config } = usePrepareContractWrite({
        address: contractAddress as `0x${string}`,
        abi: llamaPfpABI,
        functionName: 'mintWithSignature',
        args: [
            address as `0x${string}`,
            signatureForMint?.v || 0,
            signatureForMint?.r || placeholderHex,
            signatureForMint?.s || placeholderHex,
        ],
        enabled: !!contractAddress && !!signatureForMint,
        onSuccess: () => {
            setPreventingMintError(null)
        },
        onError: (error: any) => {
            const message = (error.error?.message || error.message).toString() as string
            toast.error(message)
            setPreventingMintError(error.error.message)
        },
    })

    const { data: txResponse, write: mint } = useContractWrite({
        ...config,
        onSuccess: (txResult) => {
            console.log('txResult:', txResult)
            setTxHash(txResult.hash)
        },
    })

    // note that mintStatus is the HTTP request, not the successful transaction on Ethereum
    // To see whether the txn was reverted, we need to check postMintData.status === 0
    const { status: mintStatus } = useWaitForTransaction({
        hash: txResponse?.hash,
        onSuccess(txReceipt) {
            if (txReceipt.status === 0) {
                toast.error('Transaction reverted. Please try again.')
            } else {
                const { tokenId } = getDecodedTransferEvent(txReceipt.logs, llamaPfpABI)
                console.log('tokenId:', tokenId)
                addTokenId.mutate({
                    tokenId,
                    projectSlug,
                    network: network,
                })
            }
        },
        onError(error) {
            console.log('error:', error)
            toast.error(`Something went wrong. Please try again.`)
        },
    })

    const addTokenId = trpc.nftMetadata.addTokenId.useMutation({
        onSuccess: () => {
            trpcUtils.member.nftMetadata.invalidate()
            setNftState(NftState.hasDataAndNft)
            toast.success(`Your ${project?.name} was minted successfully!`)
        },
    })

    const updatePfpState = (newTrait: TraitWithEarnedBool): void => {
        if (!newTrait.category) {
            setPfpState([])
        }
        const oldStateMinusNewTrait = pfpState.filter((t) => t.category !== newTrait.category)
        const updatedState = [...oldStateMinusNewTrait, newTrait]

        const statesAreSame = areTraitArraysEqual(updatedState, existingNftMetadata?.traits)

        const stateToActionMap = {
            [NftState.noDataNoNft]: AllowedAction.create,
            [NftState.hasDataNoNft]: statesAreSame ? AllowedAction.mint : AllowedAction.update,
            [NftState.hasDataAndNft]: AllowedAction.update,
        }
        setAllowedAction(stateToActionMap[nftState])

        setPfpState(traitsToAssembledNftTraits([...oldStateMinusNewTrait, newTrait]))
        return
    }

    if (!assetData || !chain) return <FullPageLoading />

    const openseaUrl = getOpenseaUrl(chain, contractAddress, existingNftMetadata?.tokenId)

    const Header = () => {
        return (
            <>
                <div className="mx-auto flex items-center justify-center">
                    <div className="grid gap-y-2 text-center">
                        <Title level={3} className="font-title font-bold">
                            {project
                                ? allowedAction === AllowedAction.update
                                    ? `Update your ${project.name}`
                                    : `Create your ${project.name}`
                                : null}
                        </Title>
                        <p className="text-md text-teal-50/75">Earn more traits over time</p>
                    </div>
                </div>
            </>
        )
    }

    const actionCopy = allowedAction === AllowedAction.update ? 'Updating' : 'Creating'

    return (
        <>
            <Modal
                open={isChainModalOpen}
                setOpen={setIsChainModalOpen}
                title={`Please switch to ${correctChain?.network}`}
                initialFocusRef={switchChainRef}
                hideButtons
            >
                <div className="flex flex-col items-center justify-center">
                    <button
                        className="btn-primary"
                        disabled={!switchNetwork}
                        onClick={() => switchNetwork?.(correctChain.id)}
                        ref={switchChainRef}
                    >
                        {correctChain.name}
                        {isLoading && pendingChainId === correctChain.id && ` (switching)`}
                    </button>
                </div>
            </Modal>
            <Modal
                open={isUpdatingTraitsModalOpen}
                setOpen={setIsUpdatingTraitsModalOpen}
                hideButtons
                uncloseable
                className="flex h-64 max-w-screen-md flex-col justify-center"
            >
                <div className="flex h-auto flex-col justify-center gap-6 text-left">
                    <div className="text-center text-2xl">{`${actionCopy} your ${project?.name}`}</div>
                    <div className="text-lg">
                        {`${actionCopy} your ${project?.name} takes time. ${
                            !(allowedAction === AllowedAction.update)
                                ? `Once it's done being assembled, you will be able to mint it! `
                                : ''
                        }${project?.name} is complicated to assemble, this may take up to 2 minutes. `}
                    </div>
                    <Loading />
                </div>
            </Modal>
            <Shell Header={<Header />} pageTitle={project?.name || 'loading...'} leftWidth="half">
                <motion.div layout transition={springAnimation} className="sticky top-0">
                    <PfpPreview
                        pfpState={pfpState}
                        txHash={txHash}
                        openSeaUrl={openseaUrl}
                        existingPfpState={existingPfpState}
                        signMessage={signMessage}
                        userIsSigning={userIsSigning}
                        createNftMetadataStatus={createOrUpdateNftMetadata.status as Status}
                        allowedAction={allowedAction}
                        mintFunction={mint}
                        mintStatus={mintStatus as Status}
                        projectName={project?.name || ''}
                        contractAddress={contractAddress}
                        preventingMintError={preventingMintError}
                    />
                </motion.div>
                <motion.div transition={springAnimation}>
                    <div className={`relative flex w-full flex-col justify-between gap-4 py-2`}>
                        <div className="grid gap-y-2">
                            {assetData
                                ?.sort((a, b) => a.zIndex - b.zIndex)
                                .map((tc) => {
                                    // only show modifiable traits once they've chosen their permanent traits (TODO might disappear between sign & mint)
                                    return !!existingPfpState && !tc.isModifiable ? null : (
                                        <TraitSelector
                                            key={tc.name}
                                            traitCategory={tc}
                                            pfpState={pfpState}
                                            updatePfpState={updatePfpState}
                                        />
                                    )
                                })}
                        </div>
                    </div>
                </motion.div>
            </Shell>
        </>
    )
}

export default EditAvatar
