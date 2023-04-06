import { UserCircleIcon } from '@heroicons/react/24/solid'
import type { MembersOfOrganizations, MembersOfProjects, User } from '@prisma/client'
import { truncateAddress } from 'utils'

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
            {members.map(({ firstName, lastName, address, role }) => (
                <div className="flex items-center" key={address}>
                    {/* <Link className="text-lg hover:text-teal-200" href={`/project/${slug}`}> */}
                    <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                    {firstName} {lastName} ({role.toLowerCase()}) {truncateAddress(address)}
                    {/* </Link> */}
                </div>
            ))}
        </div>
    ) : null
}

export default MembersList
