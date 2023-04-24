import { UserCircleIcon } from '@heroicons/react/24/solid'
import type { MembersOfOrganizations, MembersOfProjects, User } from '@prisma/client'
import { truncateAddress } from 'utils'
import type { MostTypes } from 'utils/types'

type MembersListProps = {
    membersList:
        | (MembersOfProjects & {
              member: User
          })[]
        | (MembersOfOrganizations & {
              member: User
          })[]
}

const MembersList: React.FC<MembersListProps> = ({ membersList }) => {
    const members = membersList.map(({ member, role }) => ({ ...member, role })) || []

    return members.length > 0 ? (
        <div className="flex-row space-y-2">
            <div>{`count: ${members.length}`}</div>
            {members.map(({ firstName, lastName, address }) => (
                <div className="flex items-center" key={address}>
                    {/* <Link className="text-lg hover:text-teal-200" href={`/project/${slug}`}> */}
                    <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                    {firstName} {lastName} {truncateAddress(address)}
                    {/* </Link> */}
                </div>
            ))}
        </div>
    ) : null
}

type BadMembersListProps = {
    membersList: Record<string, MostTypes>[]
}

export const BadMembersList: React.FC<BadMembersListProps> = ({ membersList }) => {
    return membersList.length > 0 ? (
        <div className="flex-row space-y-2">
            {membersList.map((m, i) => (
                <div className="flex flex-col" key={i}>
                    <div>{`wallet address: ${m['wallet-address']}`}</div>
                    <div>{`name: ${m['name']}`}</div>
                    <div>{`email: ${m['email']}`}</div>
                    <div>{`error: ${m.error}`}</div>
                </div>
            ))}
        </div>
    ) : null
}

export default MembersList
