import type { Dispatch, SetStateAction } from 'react'
import { useRef, useState } from 'react'
import { withEnterKeyPressHandler } from 'utils'
import { trpc } from 'utils/trpc'
import Modal from './Modal'

export default function NewProjectModal({
    open,
    setOpen,
    organizationSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
}) {
    const firstInputRef = useRef(null)
    const [name, setName] = useState('')

    const trpcUtils = trpc.useContext()

    // tRPC mutation that creates a new project using the input from the dialog div
    const createProject = trpc.project.createNewProject.useMutation({
        onSuccess: () => {
            setOpen(false)
            trpcUtils.org.getBySlug.invalidate()
            setName('')
        },
    })

    const onClick = () =>
        createProject.mutate({
            name,
            organizationSlug,
        })

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            title="Create New Project"
            initialFocusRef={firstInputRef}
            onClick={onClick}
            onClickText="Create Project"
        >
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
                        onKeyDown={withEnterKeyPressHandler(onClick)}
                        ref={firstInputRef}
                    />
                </div>
            </div>
        </Modal>
    )
}
