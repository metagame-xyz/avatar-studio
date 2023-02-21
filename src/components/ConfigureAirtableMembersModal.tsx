import { Dialog, Transition } from '@headlessui/react'
import { UserCircleIcon } from '@heroicons/react/24/solid'
import type { FieldSet } from 'airtable'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useRef } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'
import { newAirtableMemberSchema } from 'utils/types'
import Loading from './Loading'

export default function ConfigureAirtableMembersModal({
    open,
    setOpen,
    organizationSlug,
    members,
    walletAddressFieldName,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    members: FieldSet[] | null | undefined
    walletAddressFieldName: string | undefined
}) {
    const cancelButtonRef = useRef(null)

    const trpcUtils = trpc.useContext()

    const syncMemberList = trpc.project.syncAirtableMembers.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.project.getProject.invalidate()
            trpcUtils.project.getAllAirtableData.invalidate()
        },
    })

    const AirtableMembersList: React.FC<{ membersList: FieldSet[] }> = ({ membersList }) => {
        const members = walletAddressFieldName
            ? membersList.map((member) => ({
                  walletAddress: member[walletAddressFieldName] as string,
                  firstName: member['first-name'] as string,
                  lastName: member['last-name'] as string,
                  name: member['name'] as string,
                  ens: member['ens'] as string | undefined,
              }))
            : []

        return members.length > 0 ? (
            <div className="flex flex-col gap-2">
                {members.map(({ name, firstName, lastName, walletAddress, ens }, i) => (
                    <div className="flex text-left" key={i}>
                        <div>
                            <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                        </div>
                        <div>
                            {`${name || firstName + ' ' + lastName} ${ens ? '(' + ens + ') ' : ''}${truncateAddress(
                                walletAddress,
                            )}`}
                        </div>
                    </div>
                ))}
            </div>
        ) : null
    }

    const airtableMembers = members?.map((m) => newAirtableMemberSchema.parse(m))

    // if !members return loading else return members list
    // const Body = () => {
    //     return (!members ? (<Loading/>) : ())
    // }

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
                            <Dialog.Panel className="relative w-full max-w-lg transform rounded-lg bg-black p-4 text-left shadow-xl transition-all sm:my-8 sm:p-6">
                                <div>
                                    <div className="flex flex-col gap-4 text-center">
                                        <Dialog.Title as="h3" className="text-lg font-medium">
                                            Members
                                        </Dialog.Title>
                                        {members ? (
                                            <AirtableMembersList membersList={members} />
                                        ) : (
                                            <Loading loadingText="Loading Members from Airtable" />
                                        )}
                                    </div>
                                    {members ? (
                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                            <button
                                                type="button"
                                                className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                                disabled={!members}
                                                onClick={() => {
                                                    if (members && airtableMembers) {
                                                        syncMemberList.mutate({
                                                            organizationSlug,
                                                            airtableMembers,
                                                        })
                                                    }
                                                }}
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
                                    ) : null}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
