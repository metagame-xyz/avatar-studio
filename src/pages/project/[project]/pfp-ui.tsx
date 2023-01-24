import PfpPreview from 'components/PfpPreview'
import Toast from 'components/Toast'
import TraitSelectionPanel from 'components/TraitSelectionPanel'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { isComboAllowed, pfpStateToRequestedTraits, springAnimation } from 'utils/index'
import { llamaPfpABI } from 'utils/llamaPfpABI'
import { trpc } from 'utils/trpc'
import type { CheckResponse, ToastData, TraitWithEarnedBool } from 'utils/types'
import { AddressZ } from 'utils/types'
import { useAccount, useContractWrite, usePrepareContractWrite, useSignMessage, useWaitForTransaction } from 'wagmi'

const PfpUI = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string

    const { address } = useAccount()
    // const { chain } = useNetwork() // TODO
    const chain = { name: 'goerli' }
    const { data: project } = trpc.project.getBySlug.useQuery(projectSlug, {
        enabled: !!projectSlug,
    })
    const { data: assetData } = trpc.member.traitsAchieved.useQuery({ projectSlug }, { enabled: !!projectSlug })

    const { data: existingNftMetadata } = trpc.member.nftMetadata.useQuery(
        {
            projectSlug,
            chainName: chain?.name || '',
        },
        { enabled: !!projectSlug && !!chain },
    )

    const { data: usedCombos } = trpc.project.getUsedNftCombos.useQuery(
        {
            projectSlug,
            chainName: chain?.name || '',
        },
        { enabled: !!projectSlug && !!chain },
    )

    // TODO
    const checkResponse: CheckResponse = {
        valid: true,
        signature: {
            r: `0x`,
            s: `0x`,
            _vs: 'TODO',
            recoveryParam: 1,
            v: 2,
            yParityAndS: 'ok',
            compact: 'ok',
        },
    }

    const [hasMintedNFT, setHasMintedNFT] = useState(!!existingNftMetadata)
    const [hideSelectionPanel, setHideSelectionPanel] = useState(false)
    const [pfpState, setPfpState] = useState<TraitWithEarnedBool[]>([])
    const [toast, setToast] = useState<ToastData>({
        open: false,
        message: '',
        type: 'error',
    })
    const [txHash, setTxHash] = useState<`0x${string}`>()
    const [mintEnabled, setMintEnabled] = useState(false)

    const [existingPfpState, setExistingPfpState] = useState<TraitWithEarnedBool[] | null>(null)

    // set existing pfp state if user has an nft
    useEffect(() => {
        existingNftMetadata?.traits && setExistingPfpState(existingNftMetadata?.traits)
    }, [existingNftMetadata])

    const actionType = hasMintedNFT ? 'Update' : 'Mint'

    // set initial pfpState
    useEffect(() => {
        if (existingNftMetadata?.traits && assetData) {
            setPfpState(existingNftMetadata.traits)
        } else if (assetData) {
            console.log('assetData', assetData)
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
            console.log('createNftMetadata', data)
        },
    })

    const { signature: metagameSignature } = checkResponse || {
        signature: {},
    }
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
    const contractAddressDirty = chain.name === 'mainnet' ? project?.contractAddress : project?.testContractAddress

    const contractAddress = AddressZ.parse(contractAddressDirty) as `0x${string}`

    // Minting functions
    const { config } = usePrepareContractWrite({
        address: contractAddress || '0x0000',
        abi: llamaPfpABI,
        functionName: 'mintWithSignature',
        args: [address as `0x${string}`, metagameSignature?.v, metagameSignature?.r, metagameSignature?.s],
        enabled: pfpState.length === 4,
    })

    const { data: mintData, write: mint } = useContractWrite(config)

    // note that mintStatus is the HTTP request, not the successful transaction on Ethereum
    // To see whether the txn was reverted, we need to check postMintData.status === 0
    const { data: postMintData, status: mintStatus } = useWaitForTransaction({
        hash: mintData?.hash,
    })

    useEffect(() => {
        if (mintStatus === 'loading') {
            setHideSelectionPanel(true)
            setTxHash(mintData?.hash)
        }

        if (mintStatus === 'success' && postMintData?.status === 1) {
            setHasMintedNFT(true)
            triggerSuccessToast('Your Llama NFT was minted successfully!')
        }

        if (mintStatus === 'error' || postMintData?.status === 0) {
            setHideSelectionPanel(false)
            triggerErrorToast('Something went wrong. Please try again.')
        }
    }, [mintStatus, mintData, postMintData])

    useEffect(() => {
        if (createNftMetadata.status === 'error') {
            // if (actionType === 'Update') {
            //     setPfpState(existingPfpState)
            // }
            triggerErrorToast('Something went wrong. Please try again.')
        }

        if (createNftMetadata.status === 'success' && actionType === 'Mint') {
            setMintEnabled(true)
            triggerSuccessToast("We're ready to mint your NFT")
        }
    }, [createNftMetadata.status, actionType, existingPfpState])

    const triggerErrorToast = (message: string) => {
        setToast({ message, open: true, type: 'error' })
        const timeout = setTimeout(() => {
            setToast((toast) => ({ ...toast, open: false }))
        }, 4000)

        return () => clearTimeout(timeout)
    }
    const triggerSuccessToast = (message: string) => {
        setToast({ message, open: true, type: 'success' })
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
                        mintStatus={postMintData?.status === 0 ? 'error' : mintStatus}
                        txHash={txHash}
                        openSeaLink={existingNftMetadata?.externalUrl || null}
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
                        createNftMetadataStatus={createNftMetadata.status}
                        mintEnabled={mintEnabled}
                        mintFunction={mint}
                        mintStatus={mintStatus}
                    />
                </motion.div>
            </div>
        </>
    )
}

export default PfpUI
