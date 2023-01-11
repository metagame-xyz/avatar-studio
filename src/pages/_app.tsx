import { type AppType } from 'next/app'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { goerli, mainnet, optimism, polygon } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { PrivyProvider } from '@privy-io/react-auth'
import { useRouter } from 'next/router'

import { ALCHEMY_PROJECT_ID } from 'utils/constants'
import { trpc } from 'utils/trpc'

import 'styles/globals.css'
import Navbar from 'components/Navbar'
import { env } from 'env/client.mjs'

export const { chains, provider } = configureChains(
    [mainnet, goerli, polygon, optimism],
    [alchemyProvider({ apiKey: ALCHEMY_PROJECT_ID }), publicProvider()],
)

const wagmiClient = createClient({
    autoConnect: true,
    connectors: [new InjectedConnector({ chains })],
    provider,
})

const MyApp: AppType = ({ Component, pageProps }) => {
    const router = useRouter()

    const onLoginSuccess = async () => {
        router.push('/home')
    }

    return (
        <WagmiConfig client={wagmiClient}>
            <PrivyProvider
                appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
                onSuccess={onLoginSuccess}
            >
                <Navbar />
                <Component {...pageProps} />
            </PrivyProvider>
        </WagmiConfig>
    )
}

export default trpc.withTRPC(MyApp)
