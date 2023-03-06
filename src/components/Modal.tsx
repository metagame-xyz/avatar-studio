import { Dialog, Transition } from '@headlessui/react'
import react from 'react'

// TODO something about cancelButtonRef makes it focus on the cancel button every time you type a letter

type ModalProps = {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    title?: string
    children?: React.ReactNode
    onClickDisabled?: boolean
    onClick?: () => void
    onClickText?: string
    initialFocusRef?: React.MutableRefObject<null>
    className?: string
    uncloseable?: boolean
    wide?: boolean
} & (
    | { hideButtons: boolean }
    | {
          hideButtons?: undefined | false
          onClick: () => void
          onClickText: string
          initialFocusRef: React.MutableRefObject<null>
      }
)

export default function Modal({
    open,
    setOpen,
    title,
    onClick,
    onClickText,
    onClickDisabled = false,
    children,
    initialFocusRef,
    hideButtons,
    className,
    uncloseable,
    wide,
}: ModalProps) {
    // const cancelButtonRef = useRef(null)
    // const [name, setName] = useState('')
    const width = wide ? 'max-w-screen-lg' : ''

    return (
        <Transition.Root show={open} as={react.Fragment}>
            <Dialog
                as="div"
                className="relative"
                style={{ zIndex: 100 }}
                initialFocus={initialFocusRef}
                onClose={uncloseable ? () => null : setOpen}
            >
                <Transition.Child
                    as={react.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-transparent" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto bg-gray-900/60" style={{ zIndex: 100 }}>
                    <div className={`flex min-h-full items-center justify-center p-4 text-center sm:p-0`}>
                        <Transition.Child
                            as={react.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel
                                className={`relative w-full max-w-lg transform rounded-lg bg-black p-4 text-left shadow-xl transition-all sm:my-8 sm:p-6 ${className} ${width}`}
                            >
                                <div>
                                    <div className="flex flex-col gap-4 text-center">
                                        {title && (
                                            <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                                                {title}
                                            </Dialog.Title>
                                        )}
                                        {children}
                                    </div>
                                </div>
                                {hideButtons ? null : (
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                        <button
                                            type="button"
                                            className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                            disabled={onClickDisabled}
                                            onClick={onClick}
                                        >
                                            {onClickText}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-ghost mt-3 w-full sm:col-start-1 sm:mt-0 sm:text-sm"
                                            onClick={() => setOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
