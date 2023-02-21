import { Dialog, Transition } from '@headlessui/react'
import { usePrivy } from '@privy-io/react-auth'
import FullPageLoading from 'components/FullPageLoading'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Link from 'next/link'
import { useRouter } from 'next/router'
import react, { useEffect, useState } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'

const Home: NextPage = () => {
    const router = useRouter()
    const trpcUtils = trpc.useContext()

    const { data: user, error, status } = trpc.member.me.useQuery({ getEns: true })
    const mutation = trpc.member.acceptOrgInvitation.useMutation({
        onSuccess: () => trpcUtils.member.me.invalidate(),
    })

    const { logout: privyLogout } = usePrivy()

    const [openNoOrgsModal, setOpenNoOrgsModal] = useState(false)

    const logout = async () => {
        await privyLogout()
        router.push('/')
    }

    const pendingInvites = user?.invitations?.filter(({ status }) => status === 'PENDING') || []

    // create a variable that returns true if the user is in an org or project
    const userHasOrgOrProject =
        user &&
        ((user?.organizations?.length || 0) > 0 || (user?.projects?.length || 0) > 0 || pendingInvites.length > 0)

    useEffect(() => {
        if (userHasOrgOrProject === false) {
            setOpenNoOrgsModal(true)
        }
    }, [userHasOrgOrProject])

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

    if (!userHasOrgOrProject)
        return (
            <Shell pageTitle="Earnable Avatar Studio">
                <div>
                    <Transition.Root show={openNoOrgsModal} as={react.Fragment}>
                        <Dialog
                            as="div"
                            className="relative z-10"
                            onClose={() => {
                                return null
                            }}
                        >
                            <Transition.Child
                                as={react.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="fixed inset-0 bg-transparent" />
                            </Transition.Child>

                            <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-900/60">
                                <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                                    <Transition.Child
                                        as={react.Fragment}
                                        enter="ease-out duration-300"
                                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                                        leave="ease-in duration-200"
                                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                    >
                                        <Dialog.Panel className="relative w-full max-w-fit transform rounded-lg bg-black p-4 text-left shadow-xl transition-all sm:m-8 sm:p-16">
                                            <div>
                                                <Dialog.Title as="h3" className="text-2xl font-bold">
                                                    {`This address (${
                                                        user.ens || truncateAddress(user.address)
                                                    }) isn’t part of an Organization with an Earnable Avatar.`}
                                                </Dialog.Title>
                                            </div>
                                            <div className="pt-4 pb-12 text-lg">
                                                If you’d like to create an Earnable Avatar for your own community,
                                                please reach out directly to{' '}
                                                <a
                                                    href="https://twitter.com/metagame"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-teal-200 hover:text-teal-300"
                                                >
                                                    @Metagame
                                                </a>
                                                .
                                            </div>
                                            <div className="text-center">
                                                Or, log out and try logging in with a different wallet address.
                                            </div>
                                            <div className="mt-5 flex flex-col items-center sm:mt-6">
                                                <button
                                                    type="button"
                                                    className="btn-primary w-32 sm:text-sm"
                                                    onClick={logout}
                                                >
                                                    Log Out
                                                </button>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition.Root>
                </div>
                <div></div>
            </Shell>
        )

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
}

export default Home
