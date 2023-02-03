import { Dialog, Transition } from '@headlessui/react'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useRef, useState } from 'react'
import type { AirtableBase, AirtableTable } from 'utils/airtable'
import { trpc } from 'utils/trpc'
import Dropdown from './Dropdown'

export default function NewProjectModal({
    open,
    setOpen,
    organizationSlug,
    projectSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    projectSlug: string
}) {
    const cancelButtonRef = useRef(null)
    const [name, setName] = useState('')

    const { data: bases } = trpc.org.getAirtableBases.useQuery({ organizationSlug }, { enabled: !!organizationSlug })

    const trpcUtils = trpc.useContext()

    const [selectedBase, setSelectedBase] = useState<AirtableBase | null>(bases?.[0] || null)
    const [selectedTable, setSelectedTable] = useState<AirtableTable | null>(null)

    // tRPC mutation that creates a new project using the input from the dialog div
    // const createProject = trpc.project.createNewProject.useMutation({
    //     onSuccess: () => {
    //         setOpen(false)
    //         trpcUtils.org.getBySlug.invalidate()
    //         setName('')
    //     },
    // })

    if (!bases) return null

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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-black px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div>
                                    <div className="mt-3 text-center">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                                            Configure Airtable
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
                                                <label
                                                    htmlFor="name"
                                                    className="absolute -top-2 left-2 -mt-px inline-block bg-black  px-1 text-xs font-medium"
                                                >
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    className="block w-full border-0 bg-black p-0 text-teal-50 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                                    placeholder="Haab Goblins Crypto Club"
                                                    value={name}
                                                    onChange={(e) => {
                                                        setName(e.target.value)
                                                    }}
                                                />
                                            </div>
                                            <Dropdown
                                                items={bases}
                                                selected={selectedBase}
                                                setSelected={setSelectedBase}
                                                label="Airtable Base"
                                            />
                                            {/* <Dropdown
                                                items={tables}
                                                selected={selectedTable}
                                                setSelected={setSelectedTable}
                                                label="Airtable Base"
                                            /> */}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                        // onClick={() =>
                                        //     createProject.mutate({
                                        //         name,
                                        //         organizationSlug,
                                        //     })
                                        // }
                                    >
                                        Update Airtable link
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-ghost mt-3 w-full sm:col-start-1 sm:mt-0 sm:text-sm"
                                        onClick={() => setOpen(false)}
                                        ref={cancelButtonRef}
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
