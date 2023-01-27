import { type NextPage } from 'next'
import NextError from 'next/error'

import { UserCircleIcon } from '@heroicons/react/24/outline'
import Shell from 'components/Shell'

import { useRouter } from 'next/router'

import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const router = useRouter()
    // const slug = router.query.project as string

    const { data: project, error, status } = trpc.project.getProject.useQuery()

    const { data: user, status: userStatus } = trpc.member.me.useQuery()
    // check is user is an org admin
    // const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.id)

    if (error) {
        return <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />
    }
    if (status !== 'success' || userStatus !== 'success') {
        return <div>Loading...</div>
    }

    const { name, slug } = project
    const hasMinted = user.nftMetadata.length > 0

    const Members = () => {
        const members =
            project.members.map(({ member, role }) => {
                return { ...member, role }
            }) || []
        return members.length > 0 ? (
            <div>
                {members.map(({ firstName, lastName, address, role }) => (
                    <div className="mt-2 flex items-center" key={address}>
                        {/* <Link className="text-lg hover:text-teal-200" href={`/project/${slug}`}> */}
                        <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                        {firstName} {lastName} ({role.toLowerCase()}) {truncateAddress(address)}
                        {/* </Link> */}
                    </div>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    const LeftChild = () => {
        return (
            <div className="flex flex-col items-center">
                <div className="text-4xl font-bold">{name}</div>
                <div className="items-center">
                    <a className="btn-primary mt-4 w-64 items-center text-center" href={`/project/${slug}/edit-avatar`}>
                        {hasMinted ? `Update Avatar` : `Mint Avatar`}
                    </a>
                </div>
            </div>
        )
    }

    const RightChild = () => {
        return (
            <>
                <div className="text-4xl font-bold">Members</div>
                <Members />
            </>
        )
    }

    return <Shell LeftChild={<LeftChild />} RightChild={<RightChild />} pageTitle={name} />
}

export default Project
