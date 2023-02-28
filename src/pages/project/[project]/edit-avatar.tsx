import FullPageLoading from 'components/FullPageLoading'
import Modal from 'components/Modal'
import PfpPreview from 'components/PfpPreview'
import Shell from 'components/Shell'
import Title from 'components/Title'
import Toast from 'components/Toast'
import TraitSelectionPanel from 'components/TraitSelectionPanel'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { NETWORK } from 'utils/constants'
import {
    getDecodedTransferEvent,
    getOpenseaUrl,
    isComboAllowed,
    pfpStateToRequestedTraits,
    springAnimation,
} from 'utils/index'
import { llamaPfpABI } from 'utils/llamaPfpABI'
import { trpc } from 'utils/trpc'
import type { Signature, ToastData, TraitWithEarnedBool } from 'utils/types'
import { ActionType, Status } from 'utils/types'
import {
    goerli,
    mainnet,
    useAccount,
    useContractWrite,
    useNetwork,
    usePrepareContractWrite,
    useSignMessage,
    useWaitForTransaction,
} from 'wagmi'

const EditAvatar = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string

    const { address } = useAccount()
    const { chain } = useNetwork()
    // const { chains, error, isLoading, pendingChainId, switchNetwork } = useSwitchNetwork()
    // console.log('switchNetwork', switchNetwork)
    const switchChainRef = useRef(null)
    const trpcUtils = trpc.useContext()

    const { data: project } = trpc.project.getProject.useQuery()
    const { data: assetData } = trpc.member.traitsAchieved.useQuery({ projectSlug }, { enabled: !!projectSlug })

    const correctChain = [goerli, mainnet].find((chain) => chain.network === NETWORK) || goerli
    const [isChainModalOpen, setIsChainModalOpen] = useState<boolean>(!!(chain?.id !== correctChain?.id))
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
    // console.log(existingNftMetadata)

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
    const [existingPfpState, setExistingPfpState] = useState<TraitWithEarnedBool[] | null>(null)
    // set existing pfp state if user has an nft
    // set nft state (data in db, and then also if minted and has a tokenId)
    useEffect(() => {
        existingNftMetadata?.traits && setExistingPfpState(existingNftMetadata?.traits)
        existingNftMetadata?.tokenId && setNftState(NftState.hasDataAndNft)

        !existingNftMetadata?.tokenId && existingNftMetadata && setNftState(NftState.hasDataNoNft)
        !existingNftMetadata && setNftState(NftState.noDataNoNft)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingNftMetadata])

    const [pfpState, setPfpState] = useState<TraitWithEarnedBool[]>([])
    const [toast, setToast] = useState<ToastData>({
        open: false,
        message: '',
        type: Status.error,
    })
    const [txHash, setTxHash] = useState<`0x${string}`>()
    const [signatureForMint, setSignatureForMint] = useState<Signature>()

    const actionType = nftState === NftState.hasDataAndNft ? ActionType.update : ActionType.mint

    // set initial pfpState
    useEffect(() => {
        if (existingNftMetadata?.traits && assetData) {
            setPfpState(existingNftMetadata.traits)
        } else if (assetData) {
            let i = 0
            let defaultPfpState = assetData
                ?.filter((tc) => !tc.isModifiable)
                .map((traitCategory) => traitCategory.traits[i] as TraitWithEarnedBool) as TraitWithEarnedBool[]

            let safety = 0
            while (!isComboAllowed(usedCombos, defaultPfpState)) {
                // create a new combo for defaultPfPState if taken
                defaultPfpState = assetData
                    ?.filter((tc) => !tc.isModifiable)
                    .map((traitCategory) => {
                        i = (i + 1) % traitCategory.traits.length
                        return traitCategory.traits[i] as TraitWithEarnedBool
                    }) as TraitWithEarnedBool[]

                safety++
                if (safety > 144) throw new Error('Could not find an allowed combo. Call Brenner')
            }
            setPfpState(defaultPfpState)
        }
    }, [assetData, existingNftMetadata?.traits, usedCombos])

    // Signing transaction (pre-mint & for updating pfp)
    const { isLoading: userIsSigning, signMessage } = useSignMessage({
        onSuccess(data) {
            const sendablePfpState =
                actionType == ActionType.mint ? pfpState : pfpState.filter((trait) => trait.isModifiable)
            createNftMetadata.mutate({
                projectSlug,
                requestedTraits: pfpStateToRequestedTraits(sendablePfpState),
                chainNetwork: network,
                signature: data,
            })
        },
        onError(error) {
            console.error(error)
            triggerErrorToast('Error signing message.')
        },
    })

    // upload data to db
    const createNftMetadata = trpc.member.createNftMetadata.useMutation({
        onSuccess: (data) => {
            setSignatureForMint(data)
            setNftState(NftState.hasDataNoNft)
            triggerSuccessToast('You may mint your NFT now')
            trpcUtils.member.nftMetadata.invalidate()
        },
        onError: (error) => {
            triggerErrorToast(error.message)
        },
    })
    // TODO maybe un-hardcode homestead?
    const contractAddress = network === 'homestead' ? project?.contractAddress : project?.testContractAddress
    const placeholderHex = '0x00' as `0x${string}`

    // Minting functions
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
    const { data: txReceipt, status: mintStatus } = useWaitForTransaction({
        hash: txResponse?.hash,
        onSuccess(data) {
            const { tokenId } = getDecodedTransferEvent(data.logs, llamaPfpABI)
            console.log('tokenId:', tokenId)
            addTokenId.mutate({
                tokenId,
                projectSlug,
                network: network,
            })
        },
        onError(error) {
            console.log('error:', error)
            triggerErrorToast(`Something went wrong. Please try again.`)
        },
    })

    const addTokenId = trpc.nftMetadata.addTokenId.useMutation({
        onSuccess: () => {
            trpcUtils.member.nftMetadata.invalidate()
            setNftState(NftState.hasDataAndNft)
            triggerSuccessToast(`Your ${project?.name} NFT was minted successfully!`)
        },
    })

    const triggerErrorToast = (message: string) => {
        setToast({ message, open: true, type: Status.error })
        const timeout = setTimeout(() => {
            setToast((toast) => ({ ...toast, open: false }))
        }, 4000)

        return () => clearTimeout(timeout)
    }

    const triggerSuccessToast = (message: string) => {
        setToast({ message, open: true, type: Status.success })
        const timeout = setTimeout(() => {
            setToast((toast) => ({ ...toast, open: false }))
        }, 4000)

        return () => clearTimeout(timeout)
    }

    const updatePfpState = (trait: TraitWithEarnedBool): void => {
        if (!trait.category) {
            setPfpState([])
        }
        const updatedState = pfpState.filter((t) => t.category !== trait.category)
        setPfpState([...updatedState, trait])
        return
    }

    if (!assetData || !chain) return <FullPageLoading />

    // console.log(chain, contractAddress, existingNftMetadata?.tokenId)
    const openseaUrl = getOpenseaUrl(chain, contractAddress, existingNftMetadata?.tokenId)

    const Header = () => {
        return (
            <>
                <Toast data={toast} setData={setToast} />
                <div className="mx-auto flex items-center justify-center">
                    <div className="grid gap-y-2 text-center">
                        <Title level={3} className="font-title font-bold">
                            {actionType === 'Mint' ? 'Build your Avatar' : 'Update your Avatar'}
                        </Title>
                        <p className="text-md text-teal-50/75">Unlock more traits over time</p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Modal
                open={isChainModalOpen}
                setOpen={setIsChainModalOpen}
                title={`Please switch to ${correctChain?.network}`}
                onClick={function (): void {
                    throw new Error('Function not implemented.')
                }}
                onClickText={''}
                initialFocusRef={switchChainRef}
                hideButtons={true}
            >
                <div className="flex flex-col items-center justify-center">
                    {/* <button
                        className="btn-primary"
                        disabled={!switchNetwork}
                        onClick={() => switchNetwork?.(correctChain.id)}
                        ref={switchChainRef}
                    >
                        {correctChain.name}
                        {isLoading && pendingChainId === correctChain.id && ` (switching)`}
                    </button> */}
                </div>
            </Modal>
            <Shell Header={<Header />} pageTitle="edit avatar" leftWidth="half">
                <motion.div layout transition={springAnimation} className="sticky top-0">
                    <PfpPreview
                        pfpState={pfpState}
                        mintStatus={txReceipt?.status === 0 ? Status.error : (mintStatus as Status)}
                        txHash={txHash}
                        openSeaUrl={openseaUrl}
                    />
                </motion.div>
                <motion.div transition={springAnimation}>
                    <TraitSelectionPanel
                        pfpState={pfpState}
                        assetData={assetData}
                        existingPfpState={existingPfpState}
                        updatePfpState={updatePfpState}
                        actionType={actionType}
                        signMessage={signMessage}
                        userIsSigning={userIsSigning}
                        createNftMetadataStatus={createNftMetadata.status as Status}
                        mintEnabled={nftState === NftState.hasDataNoNft}
                        mintFunction={mint}
                        mintStatus={mintStatus as Status}
                    />
                </motion.div>
            </Shell>
        </>
    )
}

export default EditAvatar
