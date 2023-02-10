import { Dialog, Transition } from '@headlessui/react'
import { UserCircleIcon } from '@heroicons/react/24/solid'
import { FieldSet } from 'airtable'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useRef } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'
import Loading from './Loading'

export default function NewProjectModal({
    open,
    setOpen,
    organizationSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
}) {
    const cancelButtonRef = useRef(null)

    const { data: airtableMembers } = trpc.project.getAirtableMembersList.useQuery(
        { organizationSlug },
        { enabled: !!organizationSlug },
    )

    const AirtableMembersList: React.FC<{ membersList: FieldSet[] }> = ({ membersList }) => {
        console.log(membersList)
        const members =
            membersList.map((member) => ({
                walletAddress: member['wallet-address'] as string,
                firstName: member['first-name'] as string,
                lastName: member['last-name'] as string,
                ens: member['ens'] as string | undefined,
            })) || []

        return members.length > 0 ? (
            <>
                {members.map(({ firstName, lastName, walletAddress, ens }) => (
                    <div className="mt-2 flex items-center" key={walletAddress}>
                        {/* <Link className="text-lg hover:text-teal-200" href={`/project/${slug}`}> */}
                        <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                        {firstName} {lastName} ({ens?.toLowerCase()}) {truncateAddress(walletAddress)}
                        {/* </Link> */}
                    </div>
                ))}
            </>
        ) : null
    }

    // const addAirtableProject = trpc.project.addAirtableProject.useMutation({
    //     onSuccess: () => {
    //         setOpen(false)
    //         trpc.useContext().project.getProject.invalidate()
    //     },
    // })

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
                                            Members
                                        </Dialog.Title>
                                        {airtableMembers ? (
                                            <AirtableMembersList membersList={airtableMembers} />
                                        ) : (
                                            <Loading />
                                        )}
                                        <div className="mt-2">
                                            {/* <Dropdown
                                                items={bases}
                                                selected={selectedBase}
                                                setSelected={setSelectedBase}
                                                label="Airtable Base"
                                            />
                                            {selectedBase && (
                                                <Dropdown
                                                    items={selectedBase.tables}
                                                    selected={selectedTable}
                                                    setSelected={setSelectedTable}
                                                    label="Airtable Table"
                                                />
                                            )} */}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                        // disabled={!selectedTable || !selectedBase}
                                        // onClick={() => {
                                        //     if (selectedTable && selectedBase) {
                                        //         addAirtableProject.mutate({
                                        //             projectSlug,
                                        //             organizationSlug,
                                        //             baseId: selectedBase.id,
                                        //             tableId: selectedTable.id,
                                        //             baseName: selectedBase.name,
                                        //             tableName: selectedTable.name,
                                        //         })
                                        //     }
                                        // }}
                                    >
                                        Sync Members
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
