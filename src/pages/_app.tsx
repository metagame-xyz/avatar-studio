import { PrivyProvider, type User as PrivyUser } from '@privy-io/react-auth'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import { env } from 'env/client.mjs'
import { type AppType } from 'next/app'
import { useRouter } from 'next/router'
import 'styles/globals.css'
import { trpc } from 'utils/trpc'
import { configureChains } from 'wagmi'
import { goerli, mainnet, optimism, polygon } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

// export const { chains, provider } = configureChains(
export const configureChainsConfig = configureChains(
    [mainnet, goerli, polygon, optimism],
    [alchemyProvider({ apiKey: env.NEXT_PUBLIC_ALCHEMY_PROJECT_ID }), publicProvider()],
)

// const wagmiClient = createClient({
//     autoConnect: true,
//     connectors: [new InjectedConnector({ chains })],
//     provider,
// })

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
            {/* <WagmiConfig client={wagmiClient}> */}
            <PrivyWagmiConnector wagmiChainsConfig={configureChainsConfig}>
                <Navbar />
                <Component {...pageProps} />
                <Footer />
            </PrivyWagmiConnector>
            {/* </WagmiConfig> */}
        </PrivyProvider>
    )
}

export default trpc.withTRPC(MyApp)
