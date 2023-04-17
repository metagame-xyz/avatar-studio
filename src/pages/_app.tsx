import { PrivyProvider, type User as PrivyUser } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import { Toaster } from 'components/Toast'
import { env } from 'env/client.mjs'
import { type AppType } from 'next/app'
import 'styles/globals.css'
import type { ValuesType } from 'utility-types'
import { trpc } from 'utils/trpc'
import { configureChains } from 'wagmi'
import { mainnet, optimism, polygon, sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

// export const { chains, provider } = configureChains(
export const configureChainsConfig = configureChains(
    [mainnet, sepolia, polygon, optimism],
    [alchemyProvider({ apiKey: env.NEXT_PUBLIC_ALCHEMY_PROJECT_ID }), publicProvider()],
)

// const wagmiClient = createClient({
//     autoConnect: true,
//     connectors: [new InjectedConnector({ chains })],
//     provider,
// })

const getHost = () => {
    if (typeof window !== 'undefined') {
        return window.location.host
    } else {
        return null
    }
}

const hostToOrgMap = {
    'robonova.shefi.org': 'SheFi',
    // 'localhost:3000': 'SheFi',
} as const

type HostEnum = keyof typeof hostToOrgMap
type OrgEnum = ValuesType<typeof hostToOrgMap> | 'default'

const getOrg = (host: string | null): OrgEnum => {
    if (host) {
        return hostToOrgMap[host as HostEnum] || 'default'
    } else {
        return 'default'
    }
}

const MyApp: AppType = ({ Component, pageProps }) => {
    const createOrUpdateUser = trpc.member.createOrUpdate.useMutation()

    const host = getHost()
    const org = getOrg(host)
    // console.log('org: ', org)

    const onLoginSuccess = async (privyUser: PrivyUser) => {
        await createOrUpdateUser.mutateAsync({
            privyUser,
        })
    }

    return (
        <PrivyProvider appId={env.NEXT_PUBLIC_PRIVY_APP_ID} onSuccess={onLoginSuccess}>
            {/* <WagmiConfig client={wagmiClient}> */}
            <PrivyWagmiConnector wagmiChainsConfig={configureChainsConfig}>
                <Toaster />
                <Navbar orgConfig={org} />
                <Component {...pageProps} />
                <Footer />
            </PrivyWagmiConnector>
            {/* </WagmiConfig> */}
        </PrivyProvider>
    )
}

export default trpc.withTRPC(MyApp)
