import { Dialog, Transition } from '@headlessui/react'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { AirtableBase, AirtableField, AirtableTable } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'
import Dropdown from './Dropdown'

export default function ConfigureAirtableModal({
    open,
    setOpen,
    organizationSlug,
    projectSlug,
    bases,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    projectSlug: string
    bases: AirtableBase[]
}) {
    const cancelButtonRef = useRef(null)

    const trpcUtils = trpc.useContext()

    const addAirtableProject = trpc.project.addAirtableProject.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.project.getProject.invalidate()
            trpcUtils.project.getAllAirtableData.invalidate()
        },
    })

    const [selectedBase, setSelectedBase] = useState<AirtableBase | null>(bases?.[0] || null)
    const [selectedTable, setSelectedTable] = useState<AirtableTable | null>(bases?.[0]?.tables?.[0] || null)
    const [selectedWalletAddressField, setSelectedWalletAddressField] = useState<AirtableField | null>(
        bases?.[0]?.tables?.[0]?.fields?.[0] || null,
    ) // TODO filter out non-string fields

    useEffect(() => {
        if (selectedBase && selectedBase.tables.length > 0) {
            setSelectedTable(selectedBase.tables[0] || null)
            setSelectedWalletAddressField(selectedBase.tables?.[0]?.fields[0] || null)
        }
    }, [selectedBase])

    useEffect(() => {
        if (selectedTable && selectedTable.fields.length > 0) {
            setSelectedWalletAddressField(selectedTable.fields[0] || null)
        }
    }, [selectedTable])

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
                                            <Dropdown
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
                                            )}
                                            {selectedTable && (
                                                <Dropdown
                                                    items={selectedTable.fields}
                                                    selected={selectedWalletAddressField}
                                                    setSelected={setSelectedWalletAddressField}
                                                    label="Wallet Address Field"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                        disabled={!selectedTable || !selectedBase || !selectedWalletAddressField}
                                        onClick={() => {
                                            if (selectedTable && selectedBase && selectedWalletAddressField) {
                                                addAirtableProject.mutate({
                                                    projectSlug,
                                                    organizationSlug,
                                                    baseId: selectedBase.id,
                                                    tableId: selectedTable.id,
                                                    baseName: selectedBase.name,
                                                    tableName: selectedTable.name,
                                                    walletAddressFieldId: selectedWalletAddressField.id,
                                                    walletAddressFieldName: selectedWalletAddressField.name,
                                                })
                                            }
                                        }}
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
