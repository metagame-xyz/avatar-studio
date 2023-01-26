import PfpPreview from 'components/PfpPreview'
import Toast from 'components/Toast'
import TraitSelectionPanel from 'components/TraitSelectionPanel'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { getOpenseaUrl, isComboAllowed, pfpStateToRequestedTraits, springAnimation } from 'utils/index'
import { llamaPfpABI } from 'utils/llamaPfpABI'
import { trpc } from 'utils/trpc'
import type { Signature, ToastData, TraitWithEarnedBool } from 'utils/types'
import { ActionType, Status } from 'utils/types'
import {
    goerli,
    useAccount,
    useContractWrite,
    usePrepareContractWrite,
    useSignMessage,
    useWaitForTransaction,
} from 'wagmi'

const PfpUI = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string

    const { address } = useAccount()
    // const { chain } = useNetwork() // TODO
    const chain = goerli
    const { data: project } = trpc.project.getProject.useQuery()
    const { data: assetData } = trpc.member.traitsAchieved.useQuery({ projectSlug }, { enabled: !!projectSlug })

    const { data: existingNftMetadata } = trpc.member.nftMetadata.useQuery(
        {
            projectSlug,
            chainName: chain?.name || '',
        },
        { enabled: !!projectSlug && !!chain },
    )

    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        { chainName: chain?.name || '' },
        { enabled: !!projectSlug && !!chain },
    )

    const [hasMintedNFT, setHasMintedNFT] = useState(!!existingNftMetadata)
    const [hideSelectionPanel, setHideSelectionPanel] = useState(false)
    const [pfpState, setPfpState] = useState<TraitWithEarnedBool[]>([])
    const [toast, setToast] = useState<ToastData>({
        open: false,
        message: '',
        type: Status.error,
    })
    const [txHash, setTxHash] = useState<`0x${string}`>()
    const [mintEnabled, setMintEnabled] = useState(false)
    const [signatureForMint, setSignatureForMint] = useState<Signature>()

    const [existingPfpState, setExistingPfpState] = useState<TraitWithEarnedBool[] | null>(null)

    // set existing pfp state if user has an nft
    useEffect(() => {
        existingNftMetadata?.traits && setExistingPfpState(existingNftMetadata?.traits)
        existingNftMetadata && setHasMintedNFT(true)
    }, [existingNftMetadata])

    const actionType = hasMintedNFT ? ActionType.update : ActionType.mint

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
            console.log('defaultPfpState', defaultPfpState)
            setPfpState(defaultPfpState)
        }
    }, [assetData, existingNftMetadata?.traits, usedCombos])

    const createNftMetadata = trpc.member.createNftMetadata.useMutation({
        onSuccess: (data) => {
            setSignatureForMint(data)
            console.log('signatureForMint:', data)
        },
    })

    // Signing transaction (pre-mint & for updating pfp)
    const {
        error: signError,
        isLoading: userIsSigning,
        signMessage,
    } = useSignMessage({
        onSuccess(data) {
            createNftMetadata.mutate({
                projectSlug,
                requestedTraits: pfpStateToRequestedTraits(pfpState),
                chainName: chain?.name || '',
                signature: data,
            })
        },
    })

    useEffect(() => {
        if (signError) {
            triggerErrorToast('Error signing message.')
        }
    }, [signError])

    // TODO maybe un-hardcode?
    const contractAddress = chain?.name === 'mainnet' ? project?.contractAddress : project?.testContractAddress

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

    const { data: txResult, write: mint } = useContractWrite(config)

    // note that mintStatus is the HTTP request, not the successful transaction on Ethereum
    // To see whether the txn was reverted, we need to check postMintData.status === 0
    const { data: txReceipt, status: mintStatus } = useWaitForTransaction({
        hash: txResult?.hash,
    })

    useEffect(() => {
        if (mintStatus === Status.loading) {
            setHideSelectionPanel(true)
            setTxHash(txResult?.hash)
        }

        if (mintStatus === Status.success && txReceipt?.status === 1) {
            setHasMintedNFT(true)
            triggerSuccessToast(`Your ${project?.name} NFT was minted successfully!`)
        }

        if (mintStatus === Status.error || txReceipt?.status === 0) {
            setHideSelectionPanel(false)
            triggerErrorToast('Something went wrong. Please try again.')
        }
    }, [mintStatus, txResult, txReceipt, project])

    useEffect(() => {
        if (createNftMetadata.status === Status.error) {
            // if (actionType === 'Update') {
            //     setPfpState(existingPfpState)
            // }
            triggerErrorToast('Something went wrong. Please try again.')
        }

        if (createNftMetadata.status === Status.success && actionType === ActionType.mint) {
            setMintEnabled(true)
            triggerSuccessToast('You may mint your NFT now')
        }
    }, [createNftMetadata.status, actionType, existingPfpState])

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

    if (!assetData) return <div>Loading...</div>

    console.log(
        'chain',
        chain,
        'contractAddress',
        contractAddress,
        'existingNftMetadata?.tokenId',
        existingNftMetadata?.tokenId,
    )
    const openseaUrl = getOpenseaUrl(chain, contractAddress, existingNftMetadata?.tokenId)

    console.log('openseaUrl', openseaUrl)

    return (
        <>
            <Toast data={toast} setData={setToast} />
            <div className="grid grid-cols-2 lg:h-[calc(100vh_-_96px)]">
                <motion.div
                    layout
                    animate={{ width: hideSelectionPanel ? '100vw' : '' }}
                    transition={springAnimation}
                    className="lg:h-[calc(100vh_-_96px)]"
                >
                    <PfpPreview
                        pfpState={pfpState}
                        className="lg:h-[calc(100vh_-_96px)]"
                        mintStatus={txReceipt?.status === 0 ? Status.error : (mintStatus as Status)}
                        txHash={txHash}
                        openSeaUrl={openseaUrl}
                    />
                </motion.div>

                <motion.div animate={{ x: hideSelectionPanel ? '100%' : '0' }} transition={springAnimation}>
                    <TraitSelectionPanel
                        pfpState={pfpState}
                        assetData={assetData}
                        existingPfpState={existingPfpState}
                        updatePfpState={updatePfpState}
                        className="lg:h-[calc(100vh_-_96px)]"
                        actionType={actionType}
                        signMessage={signMessage}
                        userIsSigning={userIsSigning}
                        createNftMetadataStatus={createNftMetadata.status as Status}
                        mintEnabled={mintEnabled}
                        mintFunction={mint}
                        mintStatus={mintStatus as Status}
                    />
                </motion.div>
            </div>
        </>
    )
}

export default PfpUI
