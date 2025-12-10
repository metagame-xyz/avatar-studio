import FullPageLoading from 'components/FullPageLoading'
import { type NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { DEMO_PROJECT_SLUG } from 'utils/demo/constants'

// In demo mode, /home redirects directly to the demo project
const Home: NextPage = () => {
    const router = useRouter()

    useEffect(() => {
        router.replace(`/project/${DEMO_PROJECT_SLUG}`)
    }, [router])

    return <FullPageLoading />
}

export default Home
