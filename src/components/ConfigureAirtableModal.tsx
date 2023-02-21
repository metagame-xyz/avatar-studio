import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { AirtableBase, AirtableField, AirtableTable } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'
import Dropdown from './Dropdown'
import Modal from './Modal'

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

    const getWalletFieldMaybe = (fieldArr: AirtableField[] | undefined): AirtableField | null => {
        if (!fieldArr) return null
        return (
            fieldArr
                ?.filter((field) => field.type === 'singleLineText')
                .find((field) => field.name.toLowerCase().includes('address')) ||
            fieldArr?.[0] ||
            null
        )
    }

    const [selectedBase, setSelectedBase] = useState<AirtableBase | null>(bases?.[0] || null)
    const [selectedTable, setSelectedTable] = useState<AirtableTable | null>(bases?.[0]?.tables?.[0] || null)
    const [selectedWalletAddressField, setSelectedWalletAddressField] = useState<AirtableField | null>(
        getWalletFieldMaybe(bases?.[0]?.tables?.[0]?.fields),
    ) // TODO filter out non-string fields

    useEffect(() => {
        if (selectedBase && selectedBase.tables.length > 0) {
            setSelectedTable(selectedBase.tables[0] || null)
            const walletFieldMaybe = getWalletFieldMaybe(selectedBase.tables?.[0]?.fields)
            setSelectedWalletAddressField(walletFieldMaybe)
        }
    }, [selectedBase])

    useEffect(() => {
        if (selectedTable && selectedTable.fields.length > 0) {
            const walletFieldMaybe = getWalletFieldMaybe(selectedTable.fields)
            setSelectedWalletAddressField(walletFieldMaybe || null)
        }
    }, [selectedTable])

    if (!bases) return null

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            title="Configure Airtable"
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
            onClickDisabled={!selectedTable || !selectedBase || !selectedWalletAddressField}
            onClickText="Update Airtable link"
            initialFocusRef={cancelButtonRef}
        >
            <>
                <Dropdown items={bases} selected={selectedBase} setSelected={setSelectedBase} label="Airtable Base" />
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
            </>
        </Modal>
    )
}
