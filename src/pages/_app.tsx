import { PrivyProvider, type User as PrivyUser } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import { Toaster } from 'components/Toast'
import { env } from 'env/client.mjs'
import { type AppType } from 'next/app'
import shefiLogoSvg from 'public/assets/SheFi Logo Blue.svg'
import { useEffect, useState } from 'react'
import 'styles/globals.css'
import { trpc } from 'utils/trpc'
import type { SubdomainConfig } from 'utils/types'
import { SubdomainOrgs } from 'utils/types'
import { configureChains } from 'wagmi'
import { mainnet, optimism, polygon, sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

export const configureChainsConfig = configureChains(
    [mainnet, sepolia, polygon, optimism],
    [alchemyProvider({ apiKey: env.NEXT_PUBLIC_ALCHEMY_PROJECT_ID }), publicProvider()],
)

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
    const createOrUpdateUser = trpc.member.createOrUpdate.useMutation()

    const host = getHost()
    const subdomainConfig = getSubdomainConfig(host)

    const onLoginSuccess = async (privyUser: PrivyUser) => {
        await createOrUpdateUser.mutateAsync({
            privyUser,
        })
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        document.body.className = subdomainConfig.font
    }, [subdomainConfig.font])

    if (!mounted) return null

    return (
        <PrivyProvider appId={env.NEXT_PUBLIC_PRIVY_APP_ID} onSuccess={onLoginSuccess}>
            {/* <WagmiConfig client={wagmiClient}> */}
            <PrivyWagmiConnector wagmiChainsConfig={configureChainsConfig}>
                <div>
                    <Toaster />
                    <Navbar subdomainConfig={subdomainConfig} />
                    <Component {...pageProps} subdomainConfig={subdomainConfig} />
                    <Footer />
                </div>
            </PrivyWagmiConnector>
            {/* </WagmiConfig> */}
        </PrivyProvider>
    )
}

export default trpc.withTRPC(MyApp)
