import { Dialog, Transition } from '@headlessui/react'
import type { Dispatch, SetStateAction } from 'react'
import { Fragment, useRef } from 'react'
import type { AirtableField } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'
import Loading from './Loading'

export default function ConfigureAirtableAchievementsModal({
    open,
    setOpen,
    organizationSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
}) {
    const cancelButtonRef = useRef(null)

    const { data: airtableFields } = trpc.project.getAirtableFields.useQuery(
        { organizationSlug },
        { enabled: !!organizationSlug },
    )

    const trpcUtils = trpc.useContext()

    const syncAchievementCategories = trpc.project.syncAirtableAchievementCategories.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.project.getProject.invalidate()
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
                                            Achievements
                                        </Dialog.Title>
                                        {airtableFields ? (
                                            <AirtableAchievementsList achievementList={airtableFields} />
                                        ) : (
                                            <Loading />
                                        )}
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="btn-primary w-full sm:col-start-2 sm:text-sm"
                                        disabled={!airtableFields}
                                        onClick={() => {
                                            if (airtableFields) {
                                                syncAchievementCategories.mutate({
                                                    organizationSlug,
                                                    airtableFields,
                                                })
                                            }
                                        }}
                                    >
                                        Sync Achievements
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
