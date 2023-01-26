import { PrivyProvider, type User as PrivyUser } from '@privy-io/react-auth'
import { type AppType } from 'next/app'
import { useRouter } from 'next/router'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { goerli, mainnet, optimism, polygon } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

import { ALCHEMY_PROJECT_ID } from 'utils/constants'
import { trpc } from 'utils/trpc'

import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import { env } from 'env/client.mjs'
import 'styles/globals.css'

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

    const createOrUpdateUser = trpc.member.createOrUpdate.useMutation({
        onSuccess: () => router.push('/home'),
    })

    const onLoginSuccess = async (privyUser: PrivyUser) => {
        await createOrUpdateUser.mutateAsync({
            privyUser,
        })
    }

    return (
        <PrivyProvider appId={env.NEXT_PUBLIC_PRIVY_APP_ID} onSuccess={onLoginSuccess}>
            <WagmiConfig client={wagmiClient}>
                <Navbar />
                <Component {...pageProps} />
                <Footer />
            </WagmiConfig>
        </PrivyProvider>
    )
}

export default trpc.withTRPC(MyApp)
