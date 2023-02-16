import { Dialog, Transition } from '@headlessui/react'
import react from 'react'

// TODO something about cancelButtonRef makes it focus on the cancel button every time you type a letter

export default function Modal({
    open,
    setOpen,
    title,
    onClick,
    onClickText,
    children,
    initialFocusRef,
}: {
    open: boolean
    setOpen: react.Dispatch<react.SetStateAction<boolean>>
    title: string
    onClick: () => void
    onClickText: string
    children?: React.ReactNode
    initialFocusRef: react.MutableRefObject<null>
}) {
    // const cancelButtonRef = useRef(null)
    // const [name, setName] = useState('')

    return (
        <Transition.Root show={open} as={react.Fragment}>
            <Dialog as="div" className="relative z-10" initialFocus={initialFocusRef} onClose={setOpen}>
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

                <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-900/60">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={react.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform rounded-lg bg-black px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div>
                                    <div className="mt-3 text-center">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                                            {title}
                                        </Dialog.Title>
                                    </div>
                                    {children}
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary w-full sm:col-start-2 sm:text-sm"
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
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
