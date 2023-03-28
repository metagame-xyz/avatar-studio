import { ArrowDownTrayIcon, ExclamationCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { SignMessageArgs } from '@wagmi/core'
import Icon from 'components/Icon'
import ThreeDotsWave from 'components/ThreeDotsWave'
import Tooltip from 'components/Tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import mergeImages from 'merge-images'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import opensea from 'public/icons/opensea.svg'
import sparkles from 'public/icons/sparkles.svg'
import upperRightArrow from 'public/icons/upperRightArrow.svg'
import { useEffect, useState } from 'react'
import { networkStrings } from 'utils/constants'
import { areTraitsEqual, pfpStateToRequestedTraits, springAnimation } from 'utils/index'
import type { AssembledNftTraits } from 'utils/types'
import { AllowedAction, Status } from 'utils/types'
import { useNetwork } from 'wagmi'
import Loader from './Loader'
import Loading from './Loading'

type PfpPreviewProps = {
    pfpState: AssembledNftTraits
    txHash?: string
    openSeaUrl?: string | null
    signMessage: (args?: SignMessageArgs | undefined) => void
    userIsSigning: boolean
    existingPfpState: AssembledNftTraits | null
    mintFunction: ((overrideConfig?: undefined) => void) | undefined
    createNftMetadataStatus: Status
    mintStatus: Status
    allowedAction: AllowedAction
    projectName: string
}

const PfpPreview = ({
    pfpState,
    txHash = '',
    openSeaUrl = '',
    signMessage,
    userIsSigning,
    mintFunction,
    createNftMetadataStatus,
    mintStatus,
    existingPfpState,
    allowedAction,
    projectName,
}: PfpPreviewProps) => {
    // const { user: dynamicUser, authToken } = useDynamicContext()
    // const { data: user } = trpc.member.me.useQuery()
    const { chain } = useNetwork()
    const router = useRouter()
    const projectSlug = router.query.project as string

    const [imagesLoadedCount, setImagesLoaded] = useState<number>(0)
    const [allImagesLoaded, setAllImagesLoaded] = useState<boolean>(false)

    useEffect(() => {
        if (imagesLoadedCount === pfpState.length) setAllImagesLoaded(true)
    }, [imagesLoadedCount, pfpState.length])

    // if (!user) return <></>
    // const [user, setUser] = React.useState({} as UserData)

    const createImageDownload = async () => {
        if (!existingPfpState) return
        const links = existingPfpState
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((trait) => '/_next/image?url=' + trait.pngUrl + '&w=3840&q=75')

        mergeImages(links, { crossOrigin: 'anonymous' }).then((b64: string) => {
            const a = document.createElement('a')
            a.href = b64
            a.download = `${projectName}.png`
            a.click()
        })
    }

    const variants = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore (tailwind typing issue)
        Minting: {
            backgroundColor: 'rgb(17, 24, 39, 0.2)', // TODO
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore (tailwind typing issue)
        Success: { backgroundColor: '#6a45ec' }, // TODO
    }

    return (
        <>
            <motion.div layout="position" className="flex-column p-4" transition={{ springAnimation }}>
                {!allImagesLoaded && (
                    <div className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-xl bg-ui-gray">
                        <Loading />
                    </div>
                )}
                <div className={`${allImagesLoaded ? 'flex flex-col gap-4' : 'hidden'}`}>
                    <div className={`relative mx-auto flex aspect-square w-full overflow-hidden rounded-xl bg-ui-gray`}>
                        {(mintStatus === Status.loading || mintStatus === Status.success) && (
                            <div className="relative flex h-full w-full items-center justify-center">
                                <motion.div
                                    layout
                                    className="z-[101] rounded-full border-2 border-white bg-opacity-20"
                                    variants={variants}
                                    animate={mintStatus}
                                    transition={{ springAnimation }}
                                >
                                    <AnimatePresence>
                                        {mintStatus === Status.loading && (
                                            <motion.div
                                                className="overflow-hidden rounded-full"
                                                initial={{ width: '64px', opacity: 0 }}
                                                animate={{ width: 'auto', opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ springAnimation }}
                                            >
                                                <Link
                                                    href={`https://${networkStrings.etherscan}etherscan.io/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-title flex items-center px-8 py-3 text-lg text-white transition-all duration-100 ease-in-out hover:bg-gray-900 hover:bg-opacity-40"
                                                >
                                                    <span>Minting</span>
                                                    <ThreeDotsWave />
                                                    <motion.span
                                                        initial={{
                                                            opacity: 0,
                                                            scale: 0.5,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                        }}
                                                        transition={{
                                                            duration: 0.05,
                                                            type: 'spring',
                                                            stiffness: 100,
                                                            damping: 15,
                                                            mass: 1,
                                                        }}
                                                    >
                                                        <Icon className="ml-3" image={upperRightArrow} size={0} />
                                                    </motion.span>
                                                </Link>
                                            </motion.div>
                                        )}
                                        {/* {mintStatus === Status.success && (
                                            <>
                                                <motion.span
                                                    initial={{
                                                        width: '124px',
                                                        opacity: 0,
                                                    }}
                                                    animate={{
                                                        width: '64px',
                                                        opacity: 1,
                                                    }}
                                                    exit={{ width: 0, opacity: 0 }}
                                                    className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-teal-300"
                                                    transition={{ springAnimation }}
                                                >
                                                    <motion.span
                                                        initial={{
                                                            opacity: 0,
                                                            scale: 0.5,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                        }}
                                                        transition={{
                                                            duration: 0.05,
                                                            type: 'spring',
                                                            stiffness: 100,
                                                            damping: 15,
                                                            mass: 1,
                                                        }}
                                                    >
                                                        <HeartIcon className="h-8 w-8 fill-white" />
                                                    </motion.span>
                                                    <CheckIcon className="absolute h-4 w-4 text-teal-300" />
                                                </motion.span>
                                            </>
                                        )} */}
                                    </AnimatePresence>
                                </motion.div>
                                {/* <div className="absolute inset-0 z-[100] bg-gray-900 opacity-50" /> */}
                            </div>
                        )}
                        <AnimatePresence initial={false}>
                            {pfpState.map(({ name, category, pngUrl, zIndex }) => {
                                return (
                                    <motion.div
                                        key={category + ' ' + name}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{ zIndex }}
                                    >
                                        <Image
                                            onLoad={() => {
                                                setImagesLoaded((prev) => ++prev)
                                            }}
                                            key={category + ' ' + name}
                                            alt={`${name} ${category}`}
                                            src={pngUrl}
                                            fill
                                            priority
                                        />
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                    {openSeaUrl && (
                        <div className="mx-auto my-2 flex justify-center gap-3">
                            <a
                                className="btn-ghost items-center gap-2"
                                href={openSeaUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Icon image={opensea} size={2} />
                                OpenSea
                            </a>
                            <button className="btn-ghost items-center gap-2" onClick={createImageDownload}>
                                <ArrowDownTrayIcon className="w-5" />
                                Download <span className="text-sm font-light text-gray-400">PNG</span>
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-center py-4">
                        <AnimatePresence mode="wait">
                            {allowedAction === AllowedAction.mint ? (
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
                                        disabled={mintStatus === Status.loading} // TODO
                                    >
                                        {mintStatus === Status.loading ? (
                                            <Loader size="sm" />
                                        ) : (
                                            <Icon size={2} image={sparkles} />
                                        )}
                                        Mint NFT
                                    </button>
                                </motion.div>
                            ) : (
                                <div>
                                    <motion.div
                                        key="mint"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ springAnimation }}
                                    >
                                        <button
                                            className="btn-primary relative flex items-center gap-x-2 disabled:opacity-40"
                                            onClick={() => {
                                                const sendablePfpState =
                                                    allowedAction == AllowedAction.create
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
                                            disabled={
                                                areTraitsEqual(pfpState, existingPfpState) ||
                                                userIsSigning ||
                                                createNftMetadataStatus === Status.loading
                                            }
                                        >
                                            <>
                                                {userIsSigning || createNftMetadataStatus === Status.loading ? (
                                                    <Loader size="sm" className="text-black" />
                                                ) : (
                                                    <PencilSquareIcon className="w-5" />
                                                )}
                                                <span>{`${allowedAction} Trait Choices`}</span>
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
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </>
    )
}

export default PfpPreview
