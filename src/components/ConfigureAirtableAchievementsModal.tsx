import type { Dispatch, SetStateAction } from 'react'
import { useRef } from 'react'
import type { AirtableField } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'
import Modal from './Modal'

export default function ConfigureAirtableAchievementsModal({
    open,
    setOpen,
    organizationSlug,
    airtableFields,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    airtableFields: AirtableField[]
}) {
    const cancelButtonRef = useRef(null)

    const trpcUtils = trpc.useContext()

    const syncAchievementCategories = trpc.project.syncAirtableAchievementCategories.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.project.getProject.invalidate()
            trpcUtils.project.getAllAirtableData.invalidate()
        },
    })

    const AirtableAchievementsList: React.FC<{ achievementList: AirtableField[] }> = ({ achievementList }) => {
        const achievements =
            achievementList.map(({ description, name, id, type }) => ({
                id,
                name,
                description,
                type,
            })) || []

        return achievements.length > 0 ? (
            <>
                {achievements.map(({ description, name, id, type }) => (
                    <div className="mt-2 flex items-center" key={id}>
                        {name} {type} {description} ({id})
                    </div>
                ))}
            </>
        ) : null
    }

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            title="Achievements"
            onClick={() => {
                if (airtableFields) {
                    syncAchievementCategories.mutate({
                        organizationSlug,
                        airtableFields,
                    })
                }
            }}
            onClickDisabled={!airtableFields}
            onClickText="Sync Achievements"
            initialFocusRef={cancelButtonRef}
            hideButtons={!airtableFields}
        >
            <AirtableAchievementsList achievementList={airtableFields} />
        </Modal>
    )
}
