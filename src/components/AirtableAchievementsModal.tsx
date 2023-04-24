import type { Dispatch, SetStateAction } from 'react'
import { useRef } from 'react'
import { addSpacesBeforeCapitalLetters } from 'utils'
import type { AirtableField } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'
import type { MostTypes } from 'utils/types'
import Modal from './Modal'

export default function AirtableAchievementsModal({
    open,
    setOpen,
    organizationSlug,
    airtableFields,
    airtableMembers,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    airtableFields: AirtableField[]
    airtableMembers: Record<string, MostTypes>[]
}) {
    const cancelButtonRef = useRef(null)

    const trpcUtils = trpc.useContext()

    const syncAchievements = trpc.project.syncAirtableAchievements.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.project.getProject.invalidate()
            trpcUtils.project.getAllAirtableData.invalidate()
        },
    })

    const AirtableAchievementsList: React.FC<{ achievements: AirtableField[] }> = ({ achievements }) => {
        return achievements.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead className="border-b-2 border-gray-500">
                        <tr>
                            <th className="th-primary">Name</th>
                            <th className="th-primary">Type</th>
                            <th className="th-primary">Description</th>
                            <th className="th-primary">Id</th>
                            <th className="th-primary">Options (if applicable)</th>
                        </tr>
                    </thead>
                    <tbody className="">
                        {achievements.map(({ id, name, type, description, options }) => (
                            <tr key={id}>
                                <td className="td-primary">{name}</td>
                                <td className="td-primary">{addSpacesBeforeCapitalLetters(type)}</td>
                                <td className="td-primary">{description}</td>
                                <td className="td-primary">{id}</td>
                                <td className="td-primary">
                                    {(type === 'singleSelect' || type === 'multipleSelects') &&
                                        options.choices.length > 0 && (
                                            <div className="ml-6 flex flex-col gap-2">
                                                {options.choices.map((choice) => {
                                                    return (
                                                        <div className="mt-2 flex items-center" key={choice.id}>
                                                            {choice.name}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : null
    }

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            title="Achievements"
            onClick={() => {
                if (airtableFields) {
                    syncAchievements.mutate({
                        organizationSlug,
                        airtableFields,
                        airtableMembers,
                    })
                }
            }}
            onClickDisabled={!airtableFields}
            onClickText="Sync Achievements"
            initialFocusRef={cancelButtonRef}
            hideButtons={!airtableFields}
            wide
        >
            <AirtableAchievementsList achievements={airtableFields} />
        </Modal>
    )
}
