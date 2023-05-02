import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import AirtableAchievementsModal from 'components/AirtableAchievementsModal'
import ConfigureAirtableMembersModal from 'components/ConfigureAirtableMembersModal'
import ConfigureAirtableModal from 'components/ConfigureAirtableModal'
import FullPageLoading from 'components/FullPageLoading'
import Loading from 'components/Loading'
import MemberAchievementsList from 'components/MemberAchievementsList'
import MembersList, { BadMembersList } from 'components/MembersList'
import RelinkAirtableAuthModal from 'components/RelinkAirtableAuthModal'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { slugify } from 'utils'
import { getPlaceholderImageUrl } from 'utils/constants'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string
    const {
        data: project,
        error,
        status,
    } = trpc.project.getProject.useQuery(projectSlug, {
        enabled: !!projectSlug,
    })
    const { data: member, status: userStatus } = trpc.member.memberWithAProject.useQuery(projectSlug, {
        enabled: !!projectSlug,
    })

    if (userStatus === 'error') router.push('/')

    const [openAirtableModal, setOpenAirtableModal] = useState(false)
    const [openAirtableMembersModal, setOpenAirtableMembersModal] = useState(false)
    const [openAirtableAchievementsModal, setOpenAirtableAchievementsModal] = useState(false)

    const [openRelinkAirtableModal, setOpenRelinkAirtableModal] = useState(false)

    const isOrgAdmin =
        !!member?.organizations?.find((o) => o.organizationId == project?.organization?.id) ||
        member?.role === UserRole.METAGAME_OWNER

    const organizationSlug = project?.organization?.slug as string

    const { data: airtableData } = trpc.project.getAllAirtableData.useQuery(
        { organizationSlug },
        { enabled: !!organizationSlug && isOrgAdmin },
    )

    const [memberListOpen, setMemberListOpen] = useState<boolean>(false)
    const [badDataMemberListOpen, setBadDataMemberListOpen] = useState<boolean>(false)

    useEffect(() => {
        if (airtableData?.error?.action === 'REAUTH_AIRTABLE') setOpenRelinkAirtableModal(true)
    }, [airtableData, setOpenRelinkAirtableModal, openRelinkAirtableModal])

    if (error) <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />

    if (status !== 'success' || userStatus !== 'success') return <FullPageLoading />

    const { name, slug } = project
    const hasMinted = member.nftMetadata.filter((n) => n.projectSlug === project.slug).length > 0

    const walletAddressFieldNameSlug = slugify(project?.airtableProject?.walletAddressFieldName || '') || null

    const isDataLoaded = isOrgAdmin && airtableData && !airtableData.error
    const isProjectConfigured = !!(
        isDataLoaded &&
        airtableData.members &&
        airtableData.achievementFields &&
        walletAddressFieldNameSlug
    )

    const memberAchievements = member.achievements
    const nftImageUrl = member.nftMetadata[0]?.image

    const handleEditAvatarClick = () => {
        router.push(`/project/${slug}/edit-avatar`)
    }

    return (
        <Shell pageTitle={name}>
            <>
                {isDataLoaded && (
                    <ConfigureAirtableModal
                        open={openAirtableModal}
                        setOpen={setOpenAirtableModal}
                        organizationSlug={project.organization.slug}
                        projectSlug={project.slug}
                        bases={airtableData.bases}
                    />
                )}
                {isProjectConfigured && (
                    <>
                        <ConfigureAirtableMembersModal
                            open={openAirtableMembersModal}
                            setOpen={setOpenAirtableMembersModal}
                            organizationSlug={project.organization.slug}
                            projectSlug={project.slug}
                            members={airtableData.members}
                            walletAddressFieldNameSlug={walletAddressFieldNameSlug}
                        />
                        <AirtableAchievementsModal
                            open={openAirtableAchievementsModal}
                            setOpen={setOpenAirtableAchievementsModal}
                            organizationSlug={project.organization.slug}
                            airtableFields={airtableData.achievementFields}
                            airtableMembers={airtableData.members}
                        />
                    </>
                )}
                {
                    <RelinkAirtableAuthModal
                        open={openRelinkAirtableModal}
                        setOpen={setOpenRelinkAirtableModal}
                        organizationSlug={project.organization.slug}
                    />
                }

                <div className="flex flex-col gap-4">
                    <div className="text-2xl font-bold md:text-3xl">{name}</div>
                    {nftImageUrl ? (
                        <div className="relative flex h-64 w-64 self-center">
                            <Image fill src={nftImageUrl} alt="placeholder nft" />
                        </div>
                    ) : (
                        <div className="relative flex h-64 w-64 self-center grayscale">
                            <Image fill src={getPlaceholderImageUrl(slug)} alt="placeholder nft" />
                        </div>
                    )}

                    <div className="flex flex-col space-y-8">
                        <div>
                            <button className="btn-primary w-full" onClick={handleEditAvatarClick}>
                                {hasMinted ? `Update Avatar` : `Mint Avatar`}
                            </button>
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
                        <MemberAchievementsList memberAchievements={memberAchievements} />
                    ) : (
                        <div>No achievements yet</div>
                    )}
                </div>
                <div className="flex flex-col space-y-4">
                    <div className="text-lg font-bold md:text-xl">More Achievements coming soon...</div>
                </div>
                {isOrgAdmin && (
                    <>
                        <div className="flex flex-col space-y-4">
                            <div
                                className="flex w-full items-center"
                                onClick={() => setMemberListOpen(memberListOpen === false ? true : false)}
                            >
                                <div className="text-2xl font-bold md:text-3xl">{`Members (${project?.members?.length})`}</div>
                                <ChevronRightIcon
                                    className={`h-8 w-8 transform transition-transform duration-300 ${
                                        memberListOpen ? 'rotate-90' : 'rotate-0'
                                    } text-teal-500`}
                                />
                            </div>
                            <AnimateHeight animateOpacity duration={300} height={memberListOpen ? 'auto' : 0}>
                                <MembersList membersList={project.members} />
                            </AnimateHeight>
                        </div>
                        <div className="flex flex-col space-y-4">
                            <div
                                className="flex w-full items-center"
                                onClick={() => setBadDataMemberListOpen(badDataMemberListOpen === false ? true : false)}
                            >
                                <div className="text-2xl font-bold md:text-3xl">{`Airtable Members with bad data (${airtableData?.membersWithBadData?.length})`}</div>
                                <ChevronRightIcon
                                    className={`h-8 w-8 transform transition-transform duration-300 ${
                                        badDataMemberListOpen ? 'rotate-90' : 'rotate-0'
                                    } text-teal-500`}
                                />
                            </div>
                            <AnimateHeight animateOpacity duration={300} height={badDataMemberListOpen ? 'auto' : 0}>
                                <BadMembersList membersList={airtableData?.membersWithBadData || []} />
                            </AnimateHeight>
                        </div>
                    </>
                )}
            </div>
        </Shell>
    )
}

export default Project
