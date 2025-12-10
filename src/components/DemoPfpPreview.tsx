import { ArrowDownTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import Icon from 'components/Icon'
import { AnimatePresence, motion } from 'framer-motion'
import mergeImages from 'merge-images'
import Image from 'next/image'
import sparkles from 'public/icons/sparkles.svg'
import { useEffect, useState } from 'react'
import { areTraitsEqual, springAnimation } from 'utils/index'
import type { AssembledNftTraits } from 'utils/types'
import { Status } from 'utils/types'
import Loader from './Loader'
import Loading from './Loading'

type DemoPfpPreviewProps = {
    pfpState: AssembledNftTraits
    previewPfpState: AssembledNftTraits
    existingPfpState: AssembledNftTraits | null
    onSave: () => void
    saveStatus: Status
    projectName: string
    hasSaved: boolean
}

const DemoPfpPreview = ({
    pfpState,
    previewPfpState,
    existingPfpState,
    onSave,
    saveStatus,
    projectName,
    hasSaved,
}: DemoPfpPreviewProps) => {
    const [imagesLoadedCount, setImagesLoaded] = useState<number>(0)
    const [allImagesLoaded, setAllImagesLoaded] = useState<boolean>(false)

    useEffect(() => {
        if (imagesLoadedCount === previewPfpState.length) setAllImagesLoaded(true)
    }, [imagesLoadedCount, previewPfpState.length])

    const createImageDownload = async () => {
        if (!existingPfpState) return
        const links = existingPfpState
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((trait) => '/_next/image?url=' + trait.pngUrl.replace(/&/g, encodeURIComponent('&')) + '&w=3840&q=75')

        mergeImages(links, { crossOrigin: 'anonymous' })
            .then((b64: string) => {
                const a = document.createElement('a')
                a.href = b64
                a.download = `${projectName}.png`
                a.click()
            })
    }

    const isChanged = !areTraitsEqual(pfpState, existingPfpState)
    const buttonText = hasSaved ? 'Update Avatar' : 'Save Avatar'

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
                        {saveStatus === Status.loading && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                                <div className="rounded-full bg-white/20 px-6 py-3 text-white">
                                    <span className="flex items-center gap-2">
                                        <Loader size="sm" />
                                        Saving...
                                    </span>
                                </div>
                            </div>
                        )}
                        <AnimatePresence initial={false}>
                            {previewPfpState.map(({ name, category, pngUrl, zIndex }) => {
                                return (
                                    <div
                                        key={category + ' ' + name}
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
                                    </div>
                                )
                            })}
                        </AnimatePresence>
                    </div>

                    {hasSaved && (
                        <div className="mx-auto my-2 flex flex-wrap gap-3">
                            <button
                                type="button"
                                className="btn-ghost items-center gap-2"
                                onClick={createImageDownload}
                                disabled={isChanged}
                            >
                                <ArrowDownTrayIcon className="w-5" />
                                Download <span className="text-sm font-light text-gray-400">png</span>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-center py-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="save"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ springAnimation }}
                            >
                                <button
                                    type="button"
                                    className="btn-primary relative flex items-center gap-x-2 disabled:opacity-40"
                                    onClick={onSave}
                                    disabled={!isChanged || saveStatus === Status.loading}
                                >
                                    {saveStatus === Status.loading ? (
                                        <Loader size="sm" className="text-black" />
                                    ) : hasSaved ? (
                                        <PencilSquareIcon className="w-5" />
                                    ) : (
                                        <Icon size={2} image={sparkles} />
                                    )}
                                    <span>{buttonText}</span>
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </>
    )
}

export default DemoPfpPreview
