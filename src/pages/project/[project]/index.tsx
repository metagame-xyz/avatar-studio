import ConfigureAirtableModal from 'components/ConfigureAirtableModal'
import Loading from 'components/Loading'
import MembersList from 'components/MembersList'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import { useState } from 'react'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const { data: project, error, status } = trpc.project.getProject.useQuery()
    const { data: user, status: userStatus } = trpc.member.me.useQuery()

    const [openAirtableModal, setOpenAirtableModal] = useState(false)

    const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.organization?.id)

    // check is user is an org admin
    // const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.id)

    if (error) <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />

    if (status !== 'success' || userStatus !== 'success') return <Loading />

    const { name, slug } = project
    const hasMinted = user.nftMetadata.length > 0

    const LeftChild = () => {
        return (
            <>
                {
                    <ConfigureAirtableModal
                        open={openAirtableModal}
                        setOpen={setOpenAirtableModal}
                        organizationSlug={project.organization.slug}
                        projectSlug={project.slug}
                    />
                }
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold">{name}</div>
                    <div className="items-center">
                        {isOrgAdmin && (
                            <button
                                className="btn-primary mt-4 self-start text-center"
                                onClick={() => {
                                    setOpenAirtableModal(true)
                                }}
                            >
                                Update Airtable
                            </button>
                        )}
                        <div className="flex">
                            <div>Airtable Base: </div> <div>{project.airtableProject?.baseName}</div>
                        </div>
                        <div className="flex">
                            <div>Airtable Table:</div>
                            <div>{project.airtableProject?.tableName}</div>
                        </div>
                        <a
                            className="btn-primary mt-4 w-64 items-center text-center"
                            href={`/project/${slug}/edit-avatar`}
                        >
                            {hasMinted ? `Update Avatar` : `Mint Avatar`}
                        </a>
                    </div>
                </div>
            </>
        )
    }

    const RightChild = () => {
        return (
            <>
                <div className="text-4xl font-bold">Members</div>
                <MembersList membersList={project.members} />
            </>
        )
    }

    return <Shell LeftChild={<LeftChild />} RightChild={<RightChild />} pageTitle={name} />
}

export default Project
