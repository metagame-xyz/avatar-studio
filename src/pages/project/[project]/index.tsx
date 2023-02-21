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
import { slugify } from 'utils'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const { data: project, error, status } = trpc.project.getProject.useQuery()
    const { data: user, status: userStatus } = trpc.member.me.useQuery()

    const [openAirtableModal, setOpenAirtableModal] = useState(false)
    const [openAirtableMembersModal, setOpenAirtableMembersModal] = useState(false)
    const [openAirtableAchievementsModal, setOpenAirtableAchievementsModal] = useState(false)
    const [openRelinkAirtableModal, setOpenRelinkAirtableModal] = useState(false)

    const isOrgAdmin = true || !!user?.organizations?.find((o) => o.id == project?.organization?.id)
    const organizationSlug = project?.organization?.slug as string

    const { data } = trpc.project.getAllAirtableData.useQuery(
        { organizationSlug },
        { enabled: !!organizationSlug && isOrgAdmin },
    )

    useEffect(() => {
        if (data?.error?.action === 'REAUTH_AIRTABLE') setOpenRelinkAirtableModal(true)
    }, [data, setOpenRelinkAirtableModal, openRelinkAirtableModal])

    // check is user is an org admin
    // const isOrgAdmin = user?.organizations?.find((o) => o.id == project?.id)

    if (error) <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />

    if (status !== 'success' || userStatus !== 'success') return <FullPageLoading />

    const { name, slug } = project
    const hasMinted = user.nftMetadata.length > 0

    console.log(isOrgAdmin, !!data, !data?.error)

    return (
        <Shell pageTitle={name}>
            <>
                {isOrgAdmin && data && !data.error && (
                    <ConfigureAirtableModal
                        open={openAirtableModal}
                        setOpen={setOpenAirtableModal}
                        organizationSlug={project.organization.slug}
                        projectSlug={project.slug}
                        bases={data.bases}
                    />
                )}
                {isOrgAdmin && !data?.error && (
                    <>
                        <ConfigureAirtableMembersModal
                            open={openAirtableMembersModal}
                            setOpen={setOpenAirtableMembersModal}
                            organizationSlug={project.organization.slug}
                            members={data?.members}
                            walletAddressFieldName={slugify(project?.airtableProject?.walletAddressFieldName || '')}
                        />
                    </>
                )}
                {isOrgAdmin && data && !data.error && data.achievementFields && (
                    <>
                        <ConfigureAirtableAchievementsModal
                            open={openAirtableAchievementsModal}
                            setOpen={setOpenAirtableAchievementsModal}
                            organizationSlug={project.organization.slug}
                            airtableFields={data.achievementFields}
                        />
                    </>
                )}
                {isOrgAdmin && data && data.error && (
                    <RelinkAirtableAuthModal
                        open={openRelinkAirtableModal}
                        setOpen={setOpenRelinkAirtableModal}
                        organizationSlug={project.organization.slug}
                    />
                )}

                <div className="flex flex-col">
                    <div className="pb-4 text-2xl font-bold md:text-3xl">{name}</div>

                    <div className="flex flex-col space-y-8">
                        <div>
                            <a className="btn-primary w-full" href={`/project/${slug}/edit-avatar`}>
                                {hasMinted ? `Update Avatar` : `Mint Avatar`}
                            </a>
                        </div>

                        <div className="flex flex-col space-y-4">
                            {isOrgAdmin && data && !data.error && (
                                <>
                                    <div className="text-xl font-bold md:text-2xl">Admin Actions</div>
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            className="btn-primary w-full"
                                            onClick={() => {
                                                setOpenAirtableModal(true)
                                            }}
                                        >
                                            Update Airtable Table
                                        </button>
                                        {project?.airtableProject && (
                                            <>
                                                <div>{`Airtable Base: ${project.airtableProject?.baseName}`}</div>
                                                <div>{`Airtable Table: ${project.airtableProject?.tableName}`}</div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                            {isOrgAdmin && project?.airtableProject && (
                                <div>
                                    <button
                                        className="btn-primary w-full"
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
                                        className="btn-primary w-full"
                                        onClick={() => {
                                            setOpenAirtableAchievementsModal(true)
                                        }}
                                    >
                                        Sync Achievements
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>

            <div className="flex flex-col space-y-12">
                <div className="flex flex-col space-y-4">
                    <div className="text-2xl font-bold md:text-3xl">Achievements</div>
                    {project?.AchievementCategory?.length > 3 ? (
                        <AchievementCategoriesList achievementCategories={project.AchievementCategory} />
                    ) : (
                        <div>No achievements yet</div>
                    )}
                </div>
                <div className="flex flex-col space-y-4">
                    <div className="text-2xl font-bold md:text-3xl">Members</div>
                    <MembersList membersList={project.members} />
                </div>
            </div>
        </Shell>
    )
}

export default Project
