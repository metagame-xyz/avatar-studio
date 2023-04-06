import Image from 'next/image'
import { useRouter } from 'next/router'
import { trpc } from 'utils/trpc'

const WarmCache = () => {
    const router = useRouter()
    const projectSlug = router.query.project as string
    // const { chains, error, isLoading, pendingChainId, switchNetwork } = useSwitchNetwork()
    // console.log('switchNetwork', switchNetwork)

    const { data: project } = trpc.project.getProject.useQuery()
    const { data: assetData } = trpc.member.traitsAchieved.useQuery({ projectSlug }, { enabled: !!projectSlug })

    if (!project || !assetData) return null

    return (
        <div className="relative flex aspect-square h-96 w-96 flex-wrap">
            {assetData.map((tc) =>
                tc.traits.map(({ name, category, pngUrlMap }) =>
                    Object.values(pngUrlMap).map((pngUrl, index) => (
                        <div key={`${name}-${index}`} className="w-1/2 p-2">
                            <Image
                                onLoad={() => console.log(`loaded ${name} ${category}`)}
                                alt={`${name} ${category}`}
                                src={pngUrl}
                                fill
                            />
                        </div>
                    )),
                ),
            )}
        </div>
    )
}

export default WarmCache
