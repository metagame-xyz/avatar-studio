import Image from 'next/image'

import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from 'components/Tooltip'
import type { TraitWithEarnedBool } from 'utils/types'

type TraitImageProps = {
    trait: TraitWithEarnedBool
    backgroundTrait: TraitWithEarnedBool
    updatePfpState: (trait: TraitWithEarnedBool) => void
    selected: boolean
    disabled?: boolean
    disabledMessage?: string
    className?: string
}

const TraitImage = ({
    trait,
    backgroundTrait,
    updatePfpState,
    selected,
    disabled = false,
    disabledMessage = '',
    className,
}: TraitImageProps) => {
    const { name, category, earned, pngUrl, zIndex } = trait

    // const [mergedImages, setMergedImages] = React.useState('')
    // useEffect(() => {
    //     const optimizeImage = (image: string) => {
    //         return '/_next/image?url=' + image + '&w=112&q=75'
    //     }
    //     mergeImages(
    //         [optimizeImage(pngUrl), optimizeImage(backgroundTrait.pngUrl)],
    //         {
    //             crossOrigin: 'anonymous',
    //         },
    //     ).then((b64: string) => {
    //         setMergedImages(b64)
    //     })
    // }, [trait])
    // console.log('mergedImages', mergedImages)
    return (
        <div className="w-28">
            <button
                className={`        group relative h-28 w-28 overflow-hidden rounded-md bg-ui-charcoal ${
                    selected &&
                    'bg-none outline outline-2 outline-offset-2 outline-teal-400'
                } ${className}`}
                disabled={(!earned && earned !== null) || disabled}
                onClick={() => updatePfpState(trait)}
            >
                <Image
                    src={pngUrl}
                    width={112}
                    height={112}
                    alt={`${category} ${name}`}
                    sizes="(max-width: 768px) 120px"
                    className="relative group-disabled:opacity-40 group-disabled:grayscale"
                    style={{ zIndex }}
                />
                <Image
                    src={backgroundTrait.pngUrl}
                    width={112}
                    height={112}
                    alt={`${backgroundTrait.name} ${backgroundTrait.category}`}
                    sizes="(max-width: 768px) 120px"
                    className="absolute left-0 top-0 z-10 opacity-20 grayscale"
                />
                {disabled && (
                    <div className="flex h-full w-full items-center justify-center">
                        <LockClosedIcon className="h-5 w-5 fill-current" />
                        <Tooltip text={disabledMessage} withLockIcon />
                    </div>
                )}
            </button>
            <div className="text-xs">{trait.name}</div>
        </div>
    )
}

export default TraitImage
