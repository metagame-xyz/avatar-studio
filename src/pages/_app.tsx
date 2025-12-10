import { DemoProvider } from 'contexts/DemoContext'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import { Toaster } from 'components/Toast'
import DemoBanner from 'components/DemoBanner'
import { type AppType } from 'next/app'
import shefiLogoSvg from 'public/assets/SheFi Logo Blue.svg'
import { useEffect, useState } from 'react'
import 'styles/globals.css'
import { trpc } from 'utils/trpc'
import type { SubdomainConfig } from 'utils/types'
import { SubdomainOrgs } from 'utils/types'

export const defaultConfig: SubdomainConfig = {
    name: SubdomainOrgs.default,
    logoSrc: '/logo.png',
    logoSize: 'h-8 w-8',
    logoAlt: 'Metagame Logo',
    font: '',
}

const shefiConfig: SubdomainConfig = {
    name: SubdomainOrgs.sheFi,
    logoSrc: shefiLogoSvg,
    logoSize: 'h-8 w-16',
    logoAlt: 'SheFi Logo',
    font: 'font-robonova',
}

const getHost = () => (typeof window !== 'undefined' ? window.location.host : null)

const getSubdomainConfig = (host: string | null): SubdomainConfig => {
    switch (host) {
        case 'robonova.shefi.org':
        case 'shefi-dev.avatar-studio.xyz':
            // case 'localhost:3000':
            return shefiConfig
        default:
            return defaultConfig
    }
}

const MyApp: AppType = ({ Component, pageProps }) => {
    const host = getHost()
    const subdomainConfig = getSubdomainConfig(host)

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        document.body.className = subdomainConfig.font
    }, [subdomainConfig.font])

    if (!mounted) return null

    return (
        <DemoProvider>
            <div>
                <Toaster />
                <DemoBanner />
                <Navbar subdomainConfig={subdomainConfig} />
                <Component {...pageProps} subdomainConfig={subdomainConfig} />
                <Footer />
            </div>
        </DemoProvider>
    )
}

export default trpc.withTRPC(MyApp)
