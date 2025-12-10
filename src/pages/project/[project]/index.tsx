import { useDemoContext } from 'contexts/DemoContext'
import FullPageLoading from 'components/FullPageLoading'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { DEMO_PROJECT_SLUG } from 'utils/demo/constants'
import { getPlaceholderImageUrl } from 'utils/constants'
import { trpc } from 'utils/trpc'

const Project: NextPage = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string
    const { isLoggedIn, ready, avatarState } = useDemoContext()

    // Redirect all project pages to edit-avatar
    useEffect(() => {
        if (projectSlug) {
            router.replace(`/project/${DEMO_PROJECT_SLUG}/edit-avatar`)
        }
    }, [projectSlug, router])

    // Redirect to login if not logged in
    useEffect(() => {
        if (ready && !isLoggedIn) {
            router.push('/')
        }
    }, [ready, isLoggedIn, router])

    const {
        data: project,
        error,
        status,
    } = trpc.project.getProject.useQuery(DEMO_PROJECT_SLUG, {
        enabled: !!projectSlug && projectSlug === DEMO_PROJECT_SLUG,
    })

    if (error) return <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />

    if (!ready || status !== 'success') return <FullPageLoading />

    const { name, slug } = project

    // In demo mode, check if user has saved an avatar by checking selectedTraits
    const hasMinted = !!(avatarState?.selectedTraits && Object.keys(avatarState.selectedTraits).length > 0)
    // We don't have a composed image URL in demo mode, so show placeholder
    const nftImageUrl = null

    const handleEditAvatarClick = () => {
        router.push(`/project/${slug}/edit-avatar`)
    }

    return (
        <Shell pageTitle={name}>
            <>
                <div className="flex flex-col gap-4">
                    <div className="text-2xl font-bold md:text-3xl">{name}</div>
                    {nftImageUrl ? (
                        <div className="relative flex h-64 w-64 self-center">
                            <Image fill src={nftImageUrl} alt="your avatar" />
                        </div>
                    ) : (
                        <div className="relative flex h-64 w-64 self-center grayscale">
                            <Image fill src={getPlaceholderImageUrl(slug)} alt="placeholder nft" />
                        </div>
                    )}

                    <div className="flex flex-col space-y-8">
                        <div>
                            <button type="button" className="btn-primary w-full" onClick={handleEditAvatarClick}>
                                {hasMinted ? `Update Avatar` : `Create Avatar`}
                            </button>
                        </div>
                    </div>
                </div>
            </>

            <div className="flex flex-col space-y-12">
                <div className="flex flex-col space-y-4">
                    <div className="text-2xl font-bold md:text-3xl">Achievements</div>
                    {project?.achievementCategories?.length > 0 ? (
                        <div className="text-teal-200">
                            Explore the avatar editor to see available traits from achievements!
                        </div>
                    ) : (
                        <div>No achievements configured for this project yet</div>
                    )}
                </div>
                <div className="flex flex-col space-y-4">
                    <div className="text-lg font-bold md:text-xl">More Achievements coming soon...</div>
                </div>
            </div>
        </Shell>
    )
}

export default Project
