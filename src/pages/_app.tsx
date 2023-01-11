import { type AppType } from 'next/app'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { goerli, mainnet, optimism, polygon } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import {
    getAccessToken,
    PrivyProvider,
    usePrivy,
    User as PrivyUser,
} from '@privy-io/react-auth'
import { useRouter } from 'next/router'
import type { User } from '@prisma/client'

import { ALCHEMY_PROJECT_ID } from 'utils/constants'
import { trpc } from 'utils/trpc'

import 'styles/globals.css'
import Navbar from 'components/Navbar'
import { env } from 'env/client.mjs'
import { AppRouter } from 'server/trpc/router/_app'

export const { chains, provider } = configureChains(
    [mainnet, goerli, polygon, optimism],
    [alchemyProvider({ apiKey: ALCHEMY_PROJECT_ID }), publicProvider()],
)

const wagmiClient = createClient({
    autoConnect: true,
    connectors: [new InjectedConnector({ chains })],
    provider,
})

// const MyApp: AppType<{ session: Session | null }> = ({
//     Component,
//     pageProps: { session, ...pageProps },
// }) => {
//     return (
//         <WagmiConfig client={wagmiClient}>
//             <SessionProvider session={session}>
//                 <Navbar />
//                 <Component {...pageProps} />
//             </SessionProvider>
//         </WagmiConfig>
//     )
// }

const MyApp: AppType = ({ Component, pageProps }) => {
    const router = useRouter()
    // const { user } = usePrivy()
    // const authToken = await getAccessToken()

    const handleLogin = async (privyUser: PrivyUser) => {
        // const authToken = await getAccessToken()

        // let user: User = await trpc.member.

        router.push('/home')
    }

    return (
        <WagmiConfig client={wagmiClient}>
            <PrivyProvider
                appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
                onSuccess={handleLogin}
            >
                <Navbar />
                <Component {...pageProps} />
            </PrivyProvider>
        </WagmiConfig>
    )
}

export default trpc.withTRPC(MyApp)
