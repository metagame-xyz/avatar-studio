import type { OrganizationInvitation, Project } from '@prisma/client'
import { OrganizationRole } from '@prisma/client'
import Input from 'components/Input'
import Shell from 'components/Shell'
import { env as clientEnv } from 'env/client.mjs'
import { providers } from 'ethers'
import { type NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { truncateAddress } from 'utils'
import { trpc } from 'utils/trpc'
import type { ArrayElement } from 'utils/types'

const AdminDashboard: NextPage = () => {
    const router = useRouter()
    const { data: user } = trpc.member.me.useQuery()

    // const { data } = trpc.trait.getFromS3.useQuery('llama-pfp')
    // const copyS3Files = trpc.trait.createFromS3.useMutation()

    const { data: orgs } = trpc.org.getAllOrgs.useQuery()

    const createOrg = trpc.org.createNewOrg.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
            setNewOrgName('')
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    // TODO add dropdown for admin / owner
    const createInvite = trpc.org.sendOrgAdminInvite.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
            setInviteAddress('')
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    const [newOrgName, setNewOrgName] = useState('')
    const [selectedOrg, setSelectedOrg] = useState<ArrayElement<typeof orgs> | null>(null)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)

    const [inviteAddress, setInviteAddress] = useState('')
    const [invites, setInvites] = useState<(OrganizationInvitation & { ens: string | null })[] | []>([])

    useEffect(() => {
        const loadInvites = async () => {
            if (selectedOrg) {
                const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)
                const invitations = selectedOrg.invitations.map(async (invite) => {
                    const ens = await provider.lookupAddress(invite.inviteeAddress)
                    console.log('ens', ens, invite.inviteeAddress)
                    return { ...invite, ens }
                })

                const invites = await Promise.all(invitations)
                setInvites(invites)
            }
        }

        loadInvites()
    }, [selectedOrg])

    const Orgs = () => {
        return orgs && orgs.length > 0 ? (
            <div>
                {orgs.map((org) => (
                    <span
                        onClick={() => {
                            setSelectedOrg(org)
                            setSelectedProject(null)
                        }}
                        key={org.name}
                    >
                        <div
                            className={`mt-2 text-2xl hover:cursor-pointer hover:text-teal-200${
                                org.slug === selectedOrg?.slug ? ' text-teal-300' : ''
                            }`}
                        >
                            {org.name}
                        </div>
                    </span>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    const Projects = () => {
        const projects = selectedOrg?.projects || []
        return projects && projects.length > 0 ? (
            <div>
                {projects.map((project) => (
                    <span onClick={() => setSelectedProject(project)} key={project.name}>
                        <div
                            className={`mt-2 text-2xl hover:cursor-pointer hover:text-teal-200${
                                project.slug === selectedProject?.slug ? ' text-teal-300' : ''
                            }`}
                        >
                            {project.name}
                        </div>
                    </span>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    return (
        <Shell pageTitle="Admin Dashboard">
            <>
                <div className="flex flex-col">
                    <div className="text-4xl font-bold">Admin</div>
                    <div className="mt-4 mb-2 text-3xl font-bold">Create New Org</div>
                    {/* <Projects /> */}
                    <div className="mt-2">
                        <Input
                            label="New Org Name"
                            placeholder="Haab Goblins Crypto Club"
                            value={newOrgName}
                            onChange={(e) => {
                                setNewOrgName(e.target.value)
                            }}
                        />
                        <button
                            className="btn-primary mt-2"
                            onClick={() => {
                                createOrg.mutate(newOrgName)
                            }}
                        >
                            Create
                        </button>
                    </div>
                    <div className="mt-4 mb-2 text-3xl font-bold">Orgs</div>
                    <Orgs />

                    {selectedOrg && (
                        <>
                            <div className="mt-4 mb-2 text-3xl font-bold">Project</div>
                            <Projects />
                        </>
                    )}

                    {/* <button
                        onClick={() =>
                            copyS3Files.mutateAsync({
                                projectSlug: 'llama-pfp',
                            })
                        }
                        className="btn-primary mt-4"
                    >
                        upload files
                    </button> */}
                </div>
            </>
            <>
                {selectedOrg && (
                    <>
                        <div className="text-4xl font-bold">{`${selectedOrg.name}`}</div>
                        <div className="mt-8 text-3xl font-bold">Send Admin Invite</div>
                        <div className="mt-4 flex gap-2">
                            <Input
                                label="ENS or Wallet Address"
                                placeholder="brenner.eth"
                                value={inviteAddress}
                                onChange={(e) => {
                                    setInviteAddress(e.target.value)
                                }}
                                className="w-64 pt-2"
                            />
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    createInvite.mutate({
                                        organizationId: selectedOrg.id,
                                        ensOrWalletAddress: inviteAddress,
                                        role: OrganizationRole.ADMIN,
                                    })
                                }}
                            >
                                Send Invite
                            </button>
                        </div>
                        <div className="mt-8 text-3xl font-bold">Existing Admins & Invitations</div>
                        {invites.length > 0 ? (
                            <div className="mt-2">
                                <div className="overflow-x-auto">
                                    <table className="table w-full">
                                        <thead className="border-b-2 border-gray-500">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    ENS
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    Address
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    Sent At
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-500 ">
                                            {invites.map((invite) => (
                                                <tr key={invite.inviteeAddress}>
                                                    <td className="whitespace-nowrap px-6 py-4">{invite.ens ?? '-'}</td>
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        {truncateAddress(invite.inviteeAddress)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        {invite.createdAt.toLocaleString()}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                        {invite.status.toLowerCase()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </>
        </Shell>
    )
}

export default AdminDashboard
