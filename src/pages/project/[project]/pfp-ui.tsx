import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import PfpPreview from 'components/PfpPreview'
import Toast from 'components/Toast'
import TraitSelectionPanel from 'components/TraitSelectionPanel'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import React from 'react'
import {
    cleanPfpStateForSubmission,
    isComboAllowed,
    springAnimation,
} from 'utils/index'
import { llamaPfpABI } from 'utils/llamaPfpABI'
import { trpc } from 'utils/trpc'
import type { CheckResponse, ToastData, TraitWithEarnedBool } from 'utils/types'
import {
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
    const chain = { name: 'goerli' }
    const { data: assetData } = trpc.member.traitsAchieved.useQuery(
        { projectSlug },
        { enabled: !!projectSlug },
    )

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

    const [hasMintedNFT, setHasMintedNFT] = React.useState(
        !!existingNftMetadata,
    )
    const [hideSelectionPanel, setHideSelectionPanel] = React.useState(false)
    const [pfpState, setPfpState] = React.useState<TraitWithEarnedBool[]>([])
    const [toast, setToast] = React.useState<ToastData>({
        open: false,
        message: '',
        type: 'error',
    })
    const [txHash, setTxHash] = React.useState<`0x${string}`>()
    const [mintEnabled, setMintEnabled] = React.useState(false)

    const [existingPfpState, setExistingPfpState] = React.useState<
        TraitWithEarnedBool[] | null
    >(null)

    React.useEffect(() => {
        existingNftMetadata?.traits &&
            setExistingPfpState(existingNftMetadata?.traits)
    }, [existingNftMetadata])

    const actionType = hasMintedNFT ? 'Update' : 'Mint'

    // set initial pfpState
    React.useEffect(() => {
        if (existingNftMetadata?.traits && assetData) {
            setPfpState(existingNftMetadata.traits)
        } else if (assetData) {
            console.log('assetData', assetData)
            let i = 0
            let defaultPfpState = assetData
                ?.filter((tc) => !tc.isModifiable)
                .map(
                    (traitCategory) =>
                        traitCategory.traits[i] as TraitWithEarnedBool,
                ) as TraitWithEarnedBool[]

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
                if (safety > 144)
                    throw new Error(
                        'Could not find an allowed combo. Call Brenner',
                    )
            }
            console.log('defaultPfpState', defaultPfpState)
            setPfpState(defaultPfpState)
        }
    }, [assetData, existingNftMetadata?.traits, usedCombos])

    // Signing transaction (pre-mint & for updating pfp)
    const {
        error: signError,
        isLoading: userIsSigning,
        signMessage,
    } = useSignMessage({
        onSuccess(data) {
            mutation.mutate({ signature: data })
        },
    })

    const { signature: metagameSignature } = checkResponse || {
        signature: {},
    }

    React.useEffect(() => {
        if (signError) {
            triggerErrorToast('Error signing message.')
        }
    }, [signError])

    // Minting functions
    const { config } = usePrepareContractWrite({
        address: '0xc2a7079c589405d31cf0f3473b5be1ca2e6efae1', // test contract (allows 100 mints/address) - test contract with limited mints (0x9Ef619726DcD94354882D06DEd4601edc2f868eb)
        abi: llamaPfpABI,
        functionName: 'mintWithSignature',
        args: [
            address as `0x${string}`,
            metagameSignature?.v,
            metagameSignature?.r,
            metagameSignature?.s,
        ],
        enabled: pfpState.length === 4,
    })

    const { data: mintData, write: mint } = useContractWrite(config)

    // note that mintStatus is the HTTP request, not the successful transaction on Ethereum
    // To see whether the txn was reverted, we need to check postMintData.status === 0
    const { data: postMintData, status: mintStatus } = useWaitForTransaction({
        hash: mintData?.hash,
    })

    const updateMetagameData = async ({
        signature,
    }: {
        signature: `0x${string}`
    }) => {
        return axios.post('http://localhost:3001/api/llama/updatePfp', {
            // TODO
            llamaUserId: 'A_LLAMA_USER_ID', // TODO
            requestedLayers: cleanPfpStateForSubmission(pfpState),
            jwt: 'AN_AUTH_TOKEN', // TODO
            signature: signature,
            userAddress: address,
        })
    }

    React.useEffect(() => {
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

    const mutation = useMutation({ mutationFn: updateMetagameData })

    React.useEffect(() => {
        if (mutation.status === 'error') {
            // if (actionType === 'Update') {
            //     setPfpState(existingPfpState)
            // }
            triggerErrorToast('Something went wrong. Please try again.')
        }

        if (mutation.status === 'success' && actionType === 'Mint') {
            setMintEnabled(true)
            triggerSuccessToast("We're ready to mint your Llama PFP!")
        }
    }, [mutation.status, actionType, existingPfpState])

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
        const updatedState = pfpState.filter(
            (t) => t.category !== trait.category,
        )
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
                        mintStatus={
                            postMintData?.status === 0 ? 'error' : mintStatus
                        }
                        txHash={txHash}
                        openSeaLink={existingNftMetadata?.externalUrl || null}
                    />
                </motion.div>

                <motion.div
                    animate={{ x: hideSelectionPanel ? '100%' : '0' }}
                    transition={springAnimation}
                >
                    <TraitSelectionPanel
                        pfpState={pfpState}
                        assetData={assetData}
                        existingPfpState={existingPfpState}
                        updatePfpState={updatePfpState}
                        className="lg:h-[calc(100vh_-_96px)]"
                        actionType={actionType}
                        signMessage={signMessage}
                        userIsSigning={userIsSigning}
                        metagameStatus={mutation.status}
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
