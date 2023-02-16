import { Dialog, Transition } from '@headlessui/react'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useEffect, useRef } from 'react'
import { useSessionStorage } from 'react-use'
import { airtableAuthUrl, codeVerifierKey, codeVerifierStr } from 'utils/airtableFrontend'

export default function RelinkAirtableAuthModal({
    open,
    setOpen,
    organizationSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
}) {
    const cancelButtonRef = useRef(null)

    const [, setAirtableAuthCache] = useSessionStorage('airtableAuthCache', {})

    useEffect(() => {
        if (organizationSlug && codeVerifierStr) {
            setAirtableAuthCache({
                [codeVerifierKey]: {
                    codeVerifier: codeVerifierStr,
                    organizationSlug,
                },
            })
        }
    }, [organizationSlug, setAirtableAuthCache])

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setOpen}>
                <Transition.Child
                    as={Fragment}
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
                            as={Fragment}
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
                                            Please re-link Airtable
                                        </Dialog.Title>
                                    </div>
                                </div>
                                <div className="mx-auto mt-5 flex">
                                    <a
                                        className="btn-primary mx-auto w-64 items-center text-center"
                                        href={`${airtableAuthUrl}`}
                                    >
                                        Link Airtable
                                    </a>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
