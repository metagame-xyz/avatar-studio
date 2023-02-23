import Image from 'next/image'

import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from 'components/Tooltip'
import type { TraitWithEarnedBool } from 'utils/types'

type TraitImageProps = {
    trait: TraitWithEarnedBool
    pfpState: TraitWithEarnedBool[]
    updatePfpState: (trait: TraitWithEarnedBool) => void
    selected: boolean
    disabled?: boolean
    disabledMessage?: string
    className?: string
}

const TraitImage = ({
    trait,
    pfpState,
    updatePfpState,
    selected,
    disabled = false,
    disabledMessage = '',
    className,
}: TraitImageProps) => {
    return (
        <div className="w-28">
            <button
                className={`group relative h-28 w-28 overflow-hidden rounded-md bg-ui-gray ${
                    selected && 'bg-none outline outline-2 outline-offset-2 outline-teal-400'
                } ${className}`}
                disabled={(!trait.earned && trait.earned !== null) || disabled}
                onClick={() => updatePfpState(trait)}
            >
                {pfpState.map((existingTrait, i) => {
                    const useNewTrait = existingTrait.category === trait.category
                    const t = useNewTrait ? trait : existingTrait
                    const style =
                        (useNewTrait ? 'relative' : 'absolute left-0 top-0') +
                        ' group-disabled:opacity-40 group-disabled:grayscale'
                    return (
                        <Image
                            sizes="(max-width: 768px) 120px"
                            width={112}
                            height={112}
                            key={`${t.name} ${i}`}
                            alt={`${t.category} ${t.name}`}
                            src={t.pngUrl}
                            style={{ zIndex: t.zIndex }}
                            className={style}
                        />
                    )
                })}
                {disabled && (
                    <div className="flex h-full w-full items-center justify-center">
                        <LockClosedIcon className="h-5 w-5 fill-current" />
                        <Tooltip text={disabledMessage} withLockIcon />
                    </div>
                )}
            </button>
            <div className="text-center text-xs text-teal-50">{trait.name}</div>
        </div>
    )
}

export default TraitImage
