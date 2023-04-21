import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from 'components/Tooltip'
import Image from 'next/image'
import { getBaseName } from 'utils'
import type { AssembledNftTraits, TraitWithEarnedBool } from 'utils/types'

type TraitImageProps = {
    trait: TraitWithEarnedBool
    pfpState: AssembledNftTraits
    updatePfpState: (trait: TraitWithEarnedBool) => void
    updatePreviewPfpState: (trait: TraitWithEarnedBool) => void
    selected: boolean
    disabled?: boolean
    disabledMessage?: string
    className?: string
}

const TraitImage = ({
    trait,
    pfpState,
    updatePfpState,
    updatePreviewPfpState,
    selected,
    disabled = false,
    disabledMessage = '',
    className,
}: TraitImageProps) => {
    const isBaseCategory = trait.category === 'Base'
    const baseName = isBaseCategory ? trait.name : getBaseName(pfpState)
    return (
        <div className="w-28">
            <button
                className={`group relative h-28 w-28 overflow-hidden rounded-md bg-ui-gray ${
                    selected && 'bg-none outline outline-2 outline-offset-2 outline-teal-400'
                } ${className}`}
                disabled={(!trait.earned && trait.earned !== null) || disabled}
                onClick={() => updatePfpState(trait)}
                onMouseEnter={() => updatePreviewPfpState(trait)}
                onMouseLeave={() => {
                    const oldTrait = pfpState.find((t) => t.category === trait.category)
                    if (oldTrait) updatePreviewPfpState(oldTrait)
                }}
            >
                {pfpState.map((existingTrait, i) => {
                    const useNewTrait = existingTrait.category === trait.category
                    const t = useNewTrait ? trait : existingTrait
                    const pngUrl = (t.pngUrlMap[baseName] || t.pngUrlMap['defaultVariant']) as string
                    const grayedOut = useNewTrait ? '' : 'grayscale' // gray all layers except the new trait
                    const style = `absolute left-0 top-0 group-disabled:opacity-60 ${grayedOut}`
                    return (
                        <Image
                            width={112}
                            height={112}
                            key={`${t.category} ${t.name} ${i}`}
                            alt={`${t.category} ${t.name}`}
                            src={pngUrl}
                            style={{ zIndex: t.zIndex }}
                            className={style}
                        />
                    )
                })}
                {disabled && (
                    <div className="flex h-full w-full items-center justify-center">
                        <LockClosedIcon className="z-50 h-5 w-5 fill-current" />
                        <Tooltip text={disabledMessage} withLockIcon />
                    </div>
                )}
            </button>
            <div className="pt-1 text-center text-xs text-teal-50">{trait.name}</div>
        </div>
    )
}

export default TraitImage
