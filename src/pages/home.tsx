import { usePrivy } from '@privy-io/react-auth'
import FullPageLoading from 'components/FullPageLoading'
import OldButton, { ButtonType } from 'components/OldButton'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { trpc } from 'utils/trpc'

const Home: NextPage = () => {
    const router = useRouter()
    const trpcUtils = trpc.useContext()

    const { data: user, error, status } = trpc.member.me.useQuery()
    const mutation = trpc.member.acceptOrgInvitation.useMutation({
        onSuccess: () => trpcUtils.member.me.invalidate(),
    })

    const { logout: privyLogout } = usePrivy()

    const logout = async () => {
        await privyLogout()
        router.push('/')
    }

    const pendingInvites = user?.invitations?.filter(({ status }) => status === 'PENDING') || []

    if (error) {
        return <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />
    }

    if (status !== 'success') {
        return <FullPageLoading />
    }

    const Invitations = () => {
        return pendingInvites.length > 0 ? (
            <div className="flex flex-col gap-2">
                {pendingInvites.map(({ role, organization, organizationId }) => {
                    return (
                        <div key={`${organizationId}_${role}`} className="flex items-center gap-2">
                            <div className="text-lg">{organization.name}</div>
                            <button
                                className="btn-primary"
                                onClick={() =>
                                    mutation.mutate({
                                        organizationId,
                                        role,
                                    })
                                }
                            >
                                Accept Invitation
                            </button>
                        </div>
                    )
                })}
            </div>
        ) : (
            <></>
        )
    }

    const Organizations = () => {
        const organizations = user?.organizations || []
        return organizations.length > 0 ? (
            <div className="flex flex-col space-y-2">
                {organizations.map(({ name, slug }) => (
                    <Link className="block text-lg hover:text-teal-200" key={slug} href={`/org/${slug}`}>
                        {name}
                    </Link>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    return (
        <Shell pageTitle="Earnable Avatar Studio">
            <div className="flex flex-col space-y-12">
                <div className="flex flex-col space-y-4">
                    <div className="text-2xl font-bold md:text-3xl">Organizations</div>
                    <Organizations />
                </div>
                {pendingInvites.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        <div className="text-xl font-bold md:text-2xl">Pending Invitations</div>
                        <Invitations />
                    </div>
                )}
            </div>
            <div></div>
        </Shell>
    )
    return (
        <>
            <Head>
                <title>Earnable Avatar Studio</title>
                <meta name="description" content="Earnable Avatar Studio" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-black to-black">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
                    <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">Home</h1>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
                        <h3 className="text-2xl font-bold">Organizations</h3>
                        <Organizations />
                        <h3 className="text-2xl font-bold"></h3>
                        <Invitations />
                    </div>
                    <OldButton text="Log Out" onClick={logout} type={ButtonType.Secondary} />
                </div>
            </main>
        </>
    )
}

export default Home
