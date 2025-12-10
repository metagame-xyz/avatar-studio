import { useDemoContext } from 'contexts/DemoContext'
import DemoPfpPreview from 'components/DemoPfpPreview'
import FullPageLoading from 'components/FullPageLoading'
import Shell from 'components/Shell'
import Title from 'components/Title'
import TraitSelector from 'components/TraitSelector'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { springAnimation, traitsToAssembledNftTraits } from 'utils'
import { DEMO_PROJECT_SLUG } from 'utils/demo/constants'
import { trpc } from 'utils/trpc'
import type { AssembledNftTraits, TraitWithEarnedBool } from 'utils/types'
import { Status } from 'utils/types'

const EditAvatar = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string
    const { isLoggedIn, ready, avatarState, saveAvatarState } = useDemoContext()

    // Redirect non-demo projects to demo project
    useEffect(() => {
        if (projectSlug && projectSlug !== DEMO_PROJECT_SLUG) {
            router.replace(`/project/${DEMO_PROJECT_SLUG}/edit-avatar`)
        }
    }, [projectSlug, router])

    // Redirect to login if not logged in
    useEffect(() => {
        if (ready && !isLoggedIn) {
            router.push('/')
        }
    }, [ready, isLoggedIn, router])

    const { data: project, status } = trpc.project.getProject.useQuery(DEMO_PROJECT_SLUG, {
        enabled: !!projectSlug && projectSlug === DEMO_PROJECT_SLUG,
    })

    // Get trait categories from the project data
    const traitCategories = project?.traitCategories

    const [saveStatus, setSaveStatus] = useState<Status>(Status.idle)
    const [existingPfpState, setExistingPfpState] = useState<AssembledNftTraits | null>(null)
    const [pfpState, setPfpState] = useState<AssembledNftTraits>([])
    const [previewPfpState, setPreviewPfpState] = useState<AssembledNftTraits>([])

    // Initialize state from saved avatar or default traits
    useEffect(() => {
        if (pfpState.length > 0) return // Skip if already set
        if (!traitCategories) return

        // Convert trait categories to demo format where all traits are "earned" for the demo
        const demoAssetData = traitCategories.map((tc) => ({
            ...tc,
            traits: tc.traits.map((t) => ({
                ...t,
                earned: true, // In demo mode, all traits are available
                category: tc.name,
                zIndex: tc.zIndex,
                isModifiable: tc.isModifiable,
            })),
        }))

        // If user has saved avatar state, restore it
        if (avatarState?.selectedTraits && Object.keys(avatarState.selectedTraits).length > 0) {
            const restoredTraits: TraitWithEarnedBool[] = []

            for (const [categoryName, traitName] of Object.entries(avatarState.selectedTraits)) {
                const category = demoAssetData.find((c) => c.name === categoryName)
                if (category) {
                    const trait = category.traits.find((t) => t.name === traitName)
                    if (trait) {
                        restoredTraits.push(trait)
                    }
                }
            }

            if (restoredTraits.length > 0) {
                const assembled = traitsToAssembledNftTraits(restoredTraits)
                setPfpState(assembled)
                setPreviewPfpState(assembled)
                setExistingPfpState(assembled)
                return
            }
        }

        // Default: pick first trait from each category
        const defaultTraits: TraitWithEarnedBool[] = demoAssetData
            .map((tc) => tc.traits[0])
            .filter((t): t is TraitWithEarnedBool => !!t)

        if (defaultTraits.length > 0) {
            const assembled = traitsToAssembledNftTraits(defaultTraits)
            setPfpState(assembled)
            setPreviewPfpState(assembled)
        }
    }, [traitCategories, avatarState, pfpState.length])

    // Convert trait categories to the format expected by TraitSelector
    const assetData = traitCategories?.map((tc) => ({
        ...tc,
        traits: tc.traits.map((t) => ({
            ...t,
            earned: true, // In demo mode, all traits are available
            category: tc.name,
            zIndex: tc.zIndex,
            isModifiable: tc.isModifiable,
        })),
    }))

    const updatePfpState = (newTrait: TraitWithEarnedBool): void => {
        if (!newTrait.category) {
            setPfpState([])
            return
        }
        const oldStateMinusNewTrait = pfpState.filter((t) => t.category !== newTrait.category)
        const updatedState = traitsToAssembledNftTraits([...oldStateMinusNewTrait, newTrait])
        setPfpState(updatedState)
    }

    const updatePreviewPfpState = (newTrait: TraitWithEarnedBool): void => {
        if (!newTrait.category) {
            setPreviewPfpState([])
            return
        }
        const oldStateMinusNewTrait = pfpState.filter((t) => t.category !== newTrait.category)
        setPreviewPfpState(traitsToAssembledNftTraits([...oldStateMinusNewTrait, newTrait]))
    }

    const handleSave = () => {
        setSaveStatus(Status.loading)

        // Create selected traits record
        const selectedTraitsRecord: Record<string, string> = {}
        for (const trait of pfpState) {
            selectedTraitsRecord[trait.category] = trait.name
        }

        // For demo mode, we just save the trait selections
        // Image composition via mergeImages often fails due to CORS with S3 images
        // The preview already shows the composed avatar visually

        // Save to localStorage via context
        saveAvatarState({
            projectSlug: DEMO_PROJECT_SLUG,
            selectedTraits: selectedTraitsRecord,
            composedImageUrl: null, // We'll rely on the live preview instead
            lastUpdatedAt: new Date().toISOString(),
        })

        // Update existing state
        setExistingPfpState(pfpState)
        setSaveStatus(Status.success)
        toast.success(`Your ${project?.name || 'avatar'} has been saved!`)
    }

    if (!ready || !assetData || status !== 'success') return <FullPageLoading />

    // Check if user has saved by looking at selectedTraits instead of composedImageUrl
    const hasSaved = !!(avatarState?.selectedTraits && Object.keys(avatarState.selectedTraits).length > 0)
    const title = hasSaved ? `Update your ${project?.name}` : `Create your ${project?.name}`
    const subtext = `Select traits to customize your avatar`

    const Header = () => {
        return (
            <>
                <div className="mx-auto flex items-center justify-center">
                    <div className="grid gap-y-2 text-center">
                        <Title level={3} className="font-title font-bold">
                            {project ? title : null}
                        </Title>
                        <p className="text-md text-teal-50/75">{subtext}</p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Shell Header={<Header />} pageTitle={project?.name || 'loading...'} leftWidth="half">
                <motion.div layout transition={springAnimation} className="sticky top-0">
                    <DemoPfpPreview
                        pfpState={pfpState}
                        previewPfpState={previewPfpState}
                        existingPfpState={existingPfpState}
                        onSave={handleSave}
                        saveStatus={saveStatus}
                        projectName={project?.name || ''}
                        hasSaved={hasSaved}
                    />
                </motion.div>
                <motion.div transition={springAnimation}>
                    <div className={`relative flex w-full flex-col justify-between gap-4 py-2`}>
                        <div className="grid gap-y-2">
                            {assetData
                                ?.sort((a, b) => a.zIndex - b.zIndex)
                                .map((tc) => {
                                    return (
                                        <TraitSelector
                                            key={tc.name}
                                            traitCategory={tc}
                                            pfpState={pfpState}
                                            updatePfpState={updatePfpState}
                                            updatePreviewPfpState={updatePreviewPfpState}
                                        />
                                    )
                                })}
                        </div>
                    </div>
                </motion.div>
            </Shell>
        </>
    )
}

export default EditAvatar
