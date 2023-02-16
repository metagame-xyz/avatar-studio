import { ArrowDownTrayIcon, HeartIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import Icon from 'components/Icon'
import ThreeDotsWave from 'components/ThreeDotsWave'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import opensea from 'public/icons/opensea.svg'
import upperRightArrow from 'public/icons/upperRightArrow.svg'
import { springAnimation } from 'utils/index'
import { trpc } from 'utils/trpc'
import type { TraitWithEarnedBool } from 'utils/types'
import { Status } from 'utils/types'

type PfpPreviewProps = {
    pfpState: TraitWithEarnedBool[]
    mintStatus: Status
    txHash?: string
    openSeaUrl?: string | null
}

const PfpPreview = ({ pfpState, mintStatus, txHash = '', openSeaUrl = '' }: PfpPreviewProps) => {
    // const { user: dynamicUser, authToken } = useDynamicContext()
    const { data: user } = trpc.member.me.useQuery()

    if (!user) return <></>
    // const [user, setUser] = React.useState({} as UserData)
    // const createImageDownload = async () => {
    //     const links = pfpState
    //         .map((attribute) =>
    //             getMetagameAssetDataFromName({
    //                 category: attribute.category,
    //                 name: attribute.name,
    //                 assetData: assetData,
    //             }),
    //         )
    //         .sort(
    //             (a, b) =>
    //                 attributeZIndexMapping[a.category].index -
    //                 attributeZIndexMapping?[b?.category].index,
    //         )
    //         .map(
    //             (attribute) =>
    //                 '/_next/image?url=' + attribute.pngLink + '&w=3840&q=75',
    //         )

    //     mergeImages(links, { crossOrigin: 'anonymous' }).then((b64: string) => {
    //         const a = document.createElement('a')
    //         a.href = b64
    //         a.download = `${user.firstName}'s Llama PFP.png`
    //         a.click()
    //     })
    // }

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
        <motion.div layout="position" className={`flex-column p-4`} transition={{ springAnimation }}>
            <div className="relative mx-auto flex aspect-square w-full overflow-hidden rounded-xl bg-ui-gray">
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
                                            href={`https://etherscan.io/tx/${txHash}`}
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
                                {mintStatus === Status.success && (
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
                                            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary"
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
                                            <CheckIcon className="absolute h-4 w-4 text-primary" />
                                        </motion.span>
                                    </>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <div className="absolute inset-0 z-[100] bg-gray-900 opacity-50" />
                    </div>
                )}
                {pfpState.map(({ name, category, pngUrl, zIndex }) => {
                    return <Image key={name} alt={`${name} ${category}`} src={pngUrl} style={{ zIndex }} fill />
                })}
            </div>
            {openSeaUrl && (
                <div className="mx-auto my-2 flex justify-center gap-3">
                    <a className="btn-ghost items-center gap-2" href={openSeaUrl} target="_blank" rel="noreferrer">
                        <Icon image={opensea} size={2} />
                        OpenSea
                    </a>
                    <button
                        className="btn-ghost items-center gap-2"
                        // onClick={createImageDownload} // TODO
                    >
                        <ArrowDownTrayIcon className="w-5" />
                        Download <span className="text-sm font-light text-gray-400">PNG</span>
                    </button>
                </div>
            )}
        </motion.div>
    )
}

export default PfpPreview
