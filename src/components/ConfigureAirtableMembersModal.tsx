import { UserCircleIcon } from '@heroicons/react/24/solid'
import type { Dispatch, SetStateAction } from 'react'
import { useRef } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'
import type { MostTypes } from 'utils/types'
import { getNewAirtableMemberSchema } from 'utils/types'
import Modal from './Modal'

export default function ConfigureAirtableMembersModal({
    open,
    setOpen,
    organizationSlug,
    projectSlug,
    members,
    walletAddressFieldNameSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
    projectSlug: string
    members: Record<string, MostTypes>[]
    walletAddressFieldNameSlug: string
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

    const AirtableMembersList: React.FC<{ membersList: Record<string, MostTypes>[] }> = ({ membersList }) => {
        const members = membersList.map((member) => ({
            walletAddress: member[walletAddressFieldNameSlug] as string,
            firstName: member['first-name'] as string,
            lastName: member['last-name'] as string,
            name: member['name'] as string,
            ens: member['ens'] as string | undefined,
        }))

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

    const newAirtableMemberSchema = getNewAirtableMemberSchema(walletAddressFieldNameSlug)

    const airtableMembers = members?.map((m) => newAirtableMemberSchema.parse(m))

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            title={`Members (${members.length})`}
            onClick={() => {
                if (members && airtableMembers) {
                    syncMemberList.mutate({
                        organizationSlug,
                        airtableMembers,
                        projectSlug,
                    })
                }
            }}
            onClickDisabled={!members}
            onClickText="Sync Members"
            initialFocusRef={cancelButtonRef}
            hideButtons={!members}
        >
            <AirtableMembersList membersList={members} />
        </Modal>
    )
}
