import type { OrganizationInvitation, Project, TraitCategory } from '@prisma/client'
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
    const copyS3Files = trpc.trait.createFromS3.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    const { data: orgs, isLoading: isOrgsLoading } = trpc.org.getAllOrgs.useQuery()

    const trpcUtils = trpc.useContext()

    const createOrg = trpc.org.createNewOrg.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
            setNewOrgName('')
            trpcUtils.org.getAllOrgs.invalidate()
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    const createProject = trpc.project.createNewProject.useMutation({
        onSuccess: () => {
            setNewProjectName('')
            trpcUtils.org.getAllOrgs.invalidate()
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
    const [newProjectName, setNewProjectName] = useState('')
    const [selectedOrg, setSelectedOrg] = useState<ArrayElement<typeof orgs> | null>(null)
    const [selectedProject, setSelectedProject] = useState<(Project & { traitCategories: TraitCategory[] }) | null>(
        null,
    )

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

    useEffect(() => {
        if (!isOrgsLoading && orgs) {
            // Find the previously selected org in the new orgs data
            const previouslySelectedOrg = selectedOrg ? orgs.find((org) => org.slug === selectedOrg.slug) : null

            if (previouslySelectedOrg) setSelectedOrg(previouslySelectedOrg)
        }
    }, [orgs, isOrgsLoading, selectedOrg])

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

    function TraitCategoryTable({
        traitCategories,
        projectSlug,
    }: {
        traitCategories: TraitCategory[]
        projectSlug: string
    }) {
        const updateZIndexMutation = trpc.trait.updateTraitCategory.useMutation({
            onSuccess: (data) => {
                console.log('success', data)
                trpcUtils.org.getAllOrgs.invalidate()
            },
        })

        const handleZIndexChange = async (updatedTraitCategory: TraitCategory, zIndex: number) => {
            updatedTraitCategory.zIndex = zIndex
            await updateZIndexMutation.mutate({ traitCategory: updatedTraitCategory, projectSlug })
        }

        const zOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99]

        const Options = () => {
            return (
                <>
                    {zOptions.map((z) => (
                        <option key={z} value={`${z}`}>
                            {z}
                        </option>
                    ))}
                </>
            )
        }

        return (
            <div className="mt-2">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="border-b-2 border-gray-500">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Z Index
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Upgradeable?
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Default Earned?
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-500 ">
                            {traitCategories
                                .sort((a, b) => a.zIndex - b.zIndex)
                                .map((traitCategory) => (
                                    <tr key={traitCategory.name}>
                                        <td className="whitespace-nowrap px-6 py-4">{traitCategory.name}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <select
                                                className="bg-black"
                                                value={traitCategory.zIndex}
                                                onChange={(event) =>
                                                    handleZIndexChange(traitCategory, parseInt(event.target.value))
                                                }
                                            >
                                                <Options />
                                            </select>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            {traitCategory.isModifiable ? 'Yes' : 'No'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            {traitCategory.isDefaultAchieved ? 'Yes' : 'No'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    return (
        <Shell pageTitle="Admin Dashboard">
            <>
                <div className="flex flex-col">
                    <div className="text-4xl font-bold">Admin</div>
                    <div className="mt-4 mb-2 text-3xl font-bold">Create New Org</div>
                    <div className="mt-2 flex gap-4">
                        <Input
                            className="w-2/3"
                            label="New Org Name"
                            placeholder="Haab Goblins Crypto Club"
                            value={newOrgName}
                            onChange={(e) => {
                                setNewOrgName(e.target.value)
                            }}
                        />
                        <button
                            className="btn-primary"
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
                            <div className="mt-4 mb-2 text-3xl font-bold">Projects</div>
                            <Projects />
                            <div className="mt-4 mb-2 text-3xl font-bold">Create New Project</div>
                            <div className="mt-2 flex gap-4">
                                <Input
                                    className="w-2/3"
                                    label="New Project Name"
                                    placeholder={`${selectedOrg.name}'s Avatar`}
                                    value={newProjectName}
                                    onChange={(e) => {
                                        setNewProjectName(e.target.value)
                                    }}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        createProject.mutate({
                                            name: newProjectName,
                                            organizationSlug: selectedOrg.slug,
                                        })
                                    }}
                                >
                                    Create
                                </button>
                            </div>
                        </>
                    )}
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
                        {invites ? (
                            <div className="mt-2">
                                <div className="overflow-x-auto">
                                    <table className="table w-full">
                                        <thead className="border-b-2 border-gray-500">
                                            <tr>
                                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    ENS
                                                </th>
                                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    Address
                                                </th>
                                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                                    Sent At
                                                </th>
                                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
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
                {selectedProject && (
                    <>
                        <div className="mt-8">
                            <div className="text-4xl font-bold">{`${selectedProject.name}`}</div>
                            <button
                                onClick={() =>
                                    copyS3Files.mutate({
                                        projectSlug: selectedProject.slug,
                                    })
                                }
                                className="btn-primary mt-4"
                            >
                                upload traits from S3
                            </button>
                        </div>
                        <div className="mt-8">
                            <div className="text-4xl font-bold">Trait Categories</div>
                            <TraitCategoryTable
                                traitCategories={selectedProject.traitCategories}
                                projectSlug={selectedProject.slug}
                            />
                        </div>
                    </>
                )}
            </>
        </Shell>
    )
}

export default AdminDashboard
