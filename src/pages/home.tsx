import { Dialog } from '@headlessui/react'
import { usePrivy } from '@privy-io/react-auth'
import FullPageLoading from 'components/FullPageLoading'
import Modal from 'components/Modal'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'
import type { SubdomainConfig } from 'utils/types'
import { SubdomainOrgs } from 'utils/types'
import { defaultConfig } from './_app'

const Home: NextPage = ({ subdomainConfig = defaultConfig }: { subdomainConfig?: SubdomainConfig }) => {
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
    const Projects = () => {
        const projects = user?.projects || []
        return projects.length > 0 ? (
            <div className="flex flex-col space-y-2">
                {projects.map(({ name, slug }) => (
                    <Link className="block text-lg hover:text-teal-200" key={slug} href={`/project/${slug}`}>
                        {name}
                    </Link>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    const SorryCopy =
        subdomainConfig.name === SubdomainOrgs.sheFi ? subdomainConfig.name : 'an Organization with an Earnable NFT'

    const RedirectCopy = () =>
        subdomainConfig.name === SubdomainOrgs.sheFi ? (
            <div className="pt-4 text-3xl">
                {'Apply for next cohort '}
                <a
                    href="https://www.shefi.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-200 hover:text-teal-300"
                >
                    here
                </a>
            </div>
        ) : null

    if (!userHasOrgOrProject)
        return (
            <Shell pageTitle="Earnable Avatar Studio">
                <div>
                    <Modal
                        open={openNoOrgsModal}
                        setOpen={setOpenNoOrgsModal}
                        title=""
                        hideButtons
                        className="rounded-3xl"
                        uncloseable
                    >
                        <div className="flex flex-col gap-8 text-left">
                            <Dialog.Title as="h3" className="text-3xl font-bold">
                                <div>
                                    {`Sorry! This address (${
                                        user.ens || truncateAddress(user.address)
                                    }) is not a member of ${SorryCopy}`}
                                    <RedirectCopy />
                                </div>
                            </Dialog.Title>
                            <div className="text-sm">
                                If you’d like to create an Earnable NFT for your own community, please reach out
                                directly to{' '}
                                <a href="mailto:brenner@themetagame.xyz" className="text-teal-200 hover:text-teal-300">
                                    brenner@themetagame.xyz
                                </a>
                            </div>
                            <div className="flex flex-col items-center gap-2 self-center">
                                <div className="text-center text-sm">
                                    Or try logging in with a different wallet address
                                </div>
                                <button type="button" className="btn-primary w-64 self-center" onClick={logout}>
                                    Log out & switch wallets
                                </button>
                            </div>
                        </div>
                    </Modal>
                </div>
                <div></div>
            </Shell>
        )

    return (
        <Shell pageTitle="Earnable Avatar Studio">
            <div className="flex flex-col space-y-12">
                {user.organizations.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        <div className="text-2xl font-bold md:text-3xl">Organizations</div>
                        <Organizations />
                    </div>
                )}
                {pendingInvites.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        <div className="text-xl font-bold md:text-2xl">Pending Invitations</div>
                        <Invitations />
                    </div>
                )}
                {user.projects.length > 0 && (
                    <div className="flex flex-col space-y-4">
                        <div className="text-2xl font-bold md:text-3xl">Projects</div>
                        <Projects />
                    </div>
                )}
            </div>
            <div></div>
        </Shell>
    )
}

export default Home
