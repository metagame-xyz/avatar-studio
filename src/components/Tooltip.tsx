import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import React from 'react'

type TooltipProps = {
    text: string
    withInfoIcon?: boolean
    withLockIcon?: boolean
}

const Tooltip = ({ text, withInfoIcon = false, withLockIcon = false }: TooltipProps) => {
    const [open, setOpen] = React.useState(false)
    return (
        <TooltipPrimitive.Provider delayDuration={50}>
            <TooltipPrimitive.Root open={open}>
                <TooltipPrimitive.Trigger
                    asChild
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                >
                    <div className="absolute inset-0 z-50" />
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        className="z-50 flex max-w-[14rem] animate-tooltip items-center gap-x-3 rounded border border-ui-yankee-blue-light bg-ui-dark-jungle px-3 py-2 text-sm tracking-wide text-off-white opacity-0 shadow-tooltip ease-in-out"
                        sideOffset={5}
                    >
                        {withInfoIcon && <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-teal-300" />}
                        {withLockIcon && <LockClosedIcon className="h-5 w-5 flex-shrink-0 text-teal-300" />}
                        {text}
                        <TooltipPrimitive.Arrow asChild>
                            {/* <Icon
                                className="z-0 -mt-1.5 h-3 w-3"
                                image={tooltipArrow}
                            /> */}
                        </TooltipPrimitive.Arrow>
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    )
}

export default Tooltip
