import AchievementCategoriesList from 'components/AchievementCategoriesList'
import AirtableAchievementsModal from 'components/AirtableAchievementsModal'
import ConfigureAirtableMembersModal from 'components/ConfigureAirtableMembersModal'
import ConfigureAirtableModal from 'components/ConfigureAirtableModal'
import FullPageLoading from 'components/FullPageLoading'
import Loading from 'components/Loading'
import MembersList from 'components/MembersList'
import RelinkAirtableAuthModal from 'components/RelinkAirtableAuthModal'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { slugify } from 'utils'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const router = useRouter()
    const { data: project, error, status } = trpc.project.getProject.useQuery()
    const { data: user, status: userStatus } = trpc.member.me.useQuery()

    if (userStatus === 'error') router.push('/')

    const [openAirtableModal, setOpenAirtableModal] = useState(false)
    const [openAirtableMembersModal, setOpenAirtableMembersModal] = useState(false)
    const [openAirtableAchievementsModal, setOpenAirtableAchievementsModal] = useState(false)

    const [openRelinkAirtableModal, setOpenRelinkAirtableModal] = useState(false)

    const isOrgAdmin = !!user?.organizations?.find((o) => o.id == project?.organization?.id)

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

    const isDataLoaded = isOrgAdmin && data && !data.error
    const isProjectConfigured = !!(isDataLoaded && data.members && data.achievementFields)

    return (
        <Shell pageTitle={name}>
            <>
                {isDataLoaded && (
                    <ConfigureAirtableModal
                        open={openAirtableModal}
                        setOpen={setOpenAirtableModal}
                        organizationSlug={project.organization.slug}
                        projectSlug={project.slug}
                        bases={data.bases}
                    />
                )}
                {isProjectConfigured && (
                    <>
                        <ConfigureAirtableMembersModal
                            open={openAirtableMembersModal}
                            setOpen={setOpenAirtableMembersModal}
                            organizationSlug={project.organization.slug}
                            members={data.members}
                            walletAddressFieldName={slugify(project?.airtableProject?.walletAddressFieldName || '')}
                        />
                        <AirtableAchievementsModal
                            open={openAirtableAchievementsModal}
                            setOpen={setOpenAirtableAchievementsModal}
                            organizationSlug={project.organization.slug}
                            airtableFields={data.achievementFields}
                            airtableMembers={data.members}
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
                            {isOrgAdmin && <div className="text-xl font-bold md:text-2xl">Admin Actions</div>}
                            {isOrgAdmin ? (
                                isDataLoaded ? (
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            className="btn-primary w-full"
                                            onClick={() => {
                                                setOpenAirtableModal(true)
                                            }}
                                        >
                                            Update Airtable Table
                                        </button>
                                        {isProjectConfigured && (
                                            <>
                                                <div>{`Airtable Base: ${project.airtableProject?.baseName}`}</div>
                                                <div>{`Airtable Table: ${project.airtableProject?.tableName}`}</div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <Loading />
                                )
                            ) : null}
                            {isProjectConfigured && (
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
                            {isProjectConfigured && (
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
                    {project?.achievementCategories?.length > 0 ? (
                        <AchievementCategoriesList achievementCategories={project.achievementCategories} />
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
