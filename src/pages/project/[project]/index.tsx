import AchievementCategoriesList from 'components/AchievementCategoriesList'
import ConfigureAirtableAchievementsModal from 'components/ConfigureAirtableAchievementsModal'
import ConfigureAirtableMembersModal from 'components/ConfigureAirtableMembersModal'
import ConfigureAirtableModal from 'components/ConfigureAirtableModal'
import FullPageLoading from 'components/FullPageLoading'
import MembersList from 'components/MembersList'
import RelinkAirtableAuthModal from 'components/RelinkAirtableAuthModal'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import { useEffect, useState } from 'react'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const { data: project, error, status } = trpc.project.getProject.useQuery()
    const { data: user, status: userStatus } = trpc.member.me.useQuery()

    const [openAirtableModal, setOpenAirtableModal] = useState(false)
    const [openAirtableMembersModal, setOpenAirtableMembersModal] = useState(false)
    const [openAirtableAchievementsModal, setOpenAirtableAchievementsModal] = useState(false)
    const [openRelinkAirtableModal, setOpenRelinkAirtableModal] = useState(false)

    const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.organization?.id)
    const organizationSlug = project?.organization?.slug as string

    const { data } = trpc.project.getAllAirtableData.useQuery(
        { organizationSlug },
        { enabled: !!organizationSlug && !!isOrgAdmin },
    )

    useEffect(() => {
        if (data?.error?.action === 'REAUTH_AIRTABLE') setOpenRelinkAirtableModal(true)
    }, [data, setOpenRelinkAirtableModal])

    // check is user is an org admin
    // const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.id)

    if (error) <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />

    if (status !== 'success' || userStatus !== 'success') return <FullPageLoading />

    const { name, slug } = project
    const hasMinted = user.nftMetadata.length > 0

    const LeftChild = () => {
        return (
            <>
                {isOrgAdmin && data && !data.error && (
                    <>
                        <ConfigureAirtableModal
                            open={openAirtableModal}
                            setOpen={setOpenAirtableModal}
                            organizationSlug={project.organization.slug}
                            projectSlug={project.slug}
                            bases={data.bases}
                        />
                        <ConfigureAirtableMembersModal
                            open={openAirtableMembersModal}
                            setOpen={setOpenAirtableMembersModal}
                            organizationSlug={project.organization.slug}
                            members={data.members}
                        />

                        <ConfigureAirtableAchievementsModal
                            open={openAirtableAchievementsModal}
                            setOpen={setOpenAirtableAchievementsModal}
                            organizationSlug={project.organization.slug}
                            airtableFields={data.achievementFields}
                        />

                        <RelinkAirtableAuthModal
                            open={openRelinkAirtableModal}
                            setOpen={setOpenRelinkAirtableModal}
                            organizationSlug={project.organization.slug}
                        />
                    </>
                )}

                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold">{name}</div>
                    <div className="flex-col items-center">
                        {isOrgAdmin && (
                            <button
                                className="btn-primary mt-4 self-start text-center"
                                onClick={() => {
                                    setOpenAirtableModal(true)
                                }}
                            >
                                Update Airtable Table
                            </button>
                        )}
                        <div className="flex">
                            <div>Airtable Base: </div> <div>{project.airtableProject?.baseName}</div>
                        </div>
                        <div className="flex">
                            <div>Airtable Table:</div>
                            <div>{project.airtableProject?.tableName}</div>
                        </div>
                        {isOrgAdmin && project?.airtableProject && (
                            <div>
                                <button
                                    className="btn-primary mt-4 self-start text-center"
                                    onClick={() => {
                                        setOpenAirtableMembersModal(true)
                                    }}
                                >
                                    Sync Members
                                </button>
                            </div>
                        )}
                        {isOrgAdmin && project?.airtableProject && (
                            <div>
                                <button
                                    className="btn-primary mt-4 self-start text-center"
                                    onClick={() => {
                                        setOpenAirtableAchievementsModal(true)
                                    }}
                                >
                                    Sync Achievements
                                </button>
                            </div>
                        )}
                        <div>
                            <a className="btn-primary mt-4 w-64 text-center" href={`/project/${slug}/edit-avatar`}>
                                {hasMinted ? `Update Avatar` : `Mint Avatar`}
                            </a>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    const RightChild = () => {
        return (
            <>
                {project?.AchievementCategory?.length > 0 && (
                    <div className="mb-4">
                        <div className="text-4xl font-bold">Achievements</div>
                        <AchievementCategoriesList achievementCategories={project.AchievementCategory} />
                    </div>
                )}
                <div className="text-4xl font-bold">Members</div>
                <MembersList membersList={project.members} />
            </>
        )
    }

    return <Shell LeftChild={<LeftChild />} RightChild={<RightChild />} pageTitle={name} />
}

export default Project
