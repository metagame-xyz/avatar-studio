import { useDemoContext } from 'contexts/DemoContext'
import FullPageLoading from 'components/FullPageLoading'
import { type NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { DEMO_PROJECT_SLUG } from 'utils/demo/constants'

const Home: NextPage = () => {
    const router = useRouter()
    const { login, isLoggedIn, ready } = useDemoContext()

    useEffect(() => {
        if (isLoggedIn) {
            router.push(`/project/${DEMO_PROJECT_SLUG}/edit-avatar`)
        }
    }, [isLoggedIn, router])

    const handleDemoLogin = () => {
        login()
        router.push(`/project/${DEMO_PROJECT_SLUG}/edit-avatar`)
    }

    if (!ready || isLoggedIn) return <FullPageLoading />

    return (
        <>
            <Head>
                <title>Earnable Avatar Studio - Demo</title>
                <meta name="description" content="Demo of the Earnable Avatar Studio" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="flex min-h-[calc(100vh_-_120px)] flex-col items-center justify-center bg-black bg-jupiter-pattern">
                <div className="container flex flex-col items-center justify-center gap-8 px-4 py-12">
                    <h1 className="text-5xl font-extrabold tracking-tight text-teal-100 sm:text-[5rem]">
                        Earnable Avatar Studio
                    </h1>
                    <div className="text-2xl text-teal-100">
                        Earn traits by participating and contributing to your community
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <button type="button" className="btn-primary" onClick={handleDemoLogin}>
                                Try Demo
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home
