import type { OrganizationInvitation, TraitCategory } from '@prisma/client'
import { OrganizationRole } from '@prisma/client'
import AchievementToTraitEditor from 'components/AchievementToTraitEditor'
import Input from 'components/Input'
import Shell from 'components/Shell'
import ToggleWithIcon from 'components/Toggle'
import { type NextPage } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { truncateAddress } from 'utils'
import { getEns } from 'utils/needEnvUtils'
import { trpc } from 'utils/trpc'
import type { ArrayElement } from 'utils/types'

const AdminDashboard: NextPage = () => {
    const { data: orgs, isLoading: isOrgsLoading } = trpc.org.getAllOrgs.useQuery()
    const trpcUtils = trpc.useContext()

    const copyS3Files = trpc.trait.createFromS3.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
            trpcUtils.org.getAllOrgs.invalidate()
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

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
            trpcUtils.org.getAllOrgs.invalidate()
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    type OrgWithData = ArrayElement<typeof orgs>
    type ProjectWithData = ArrayElement<OrgWithData['projects']>

    const [newOrgName, setNewOrgName] = useState('')
    const [newProjectName, setNewProjectName] = useState('')
    const [selectedOrg, setSelectedOrg] = useState<OrgWithData | null>(null)
    const [selectedProject, setSelectedProject] = useState<ProjectWithData | null>(null)

    const [inviteAddress, setInviteAddress] = useState('')
    const [invites, setInvites] = useState<(OrganizationInvitation & { ens: string | null })[] | []>([])

    useEffect(() => {
        const loadInvites = async () => {
            if (selectedOrg) {
                const invitations = selectedOrg.invitations.map(async (invite) => {
                    const ens = await getEns(invite.inviteeAddress)
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
        if (!isOrgsLoading && orgs) {
            const previouslySelectedProject = selectedProject
                ? selectedOrg?.projects.find((project) => project.slug === selectedProject.slug)
                : null

            if (previouslySelectedProject) setSelectedProject(previouslySelectedProject)
        }
    }, [orgs, isOrgsLoading, selectedOrg, selectedProject])

    const Orgs = () => {
        return orgs && orgs.length > 0 ? (
            <div className="flex flex-col space-y-2">
                {orgs.map((org) => (
                    <span
                        onClick={() => {
                            setSelectedOrg(org)
                            setSelectedProject(null)
                        }}
                        key={org.name}
                    >
                        <div
                            className={`text-xl hover:cursor-pointer hover:text-teal-200${
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
            <div className="flex flex-col space-y-2">
                {projects.map((project) => (
                    <div className="flex items-center gap-2" key={project.name}>
                        <span onClick={() => setSelectedProject(project)} key={project.name}>
                            <div
                                className={`text-xl hover:cursor-pointer hover:text-teal-200${
                                    project.slug === selectedProject?.slug ? ' text-teal-300' : ''
                                }`}
                            >
                                {project.name}
                            </div>
                        </span>
                        <Link target="_blank" href={`/project/${project.slug}`}>
                            (project page)
                        </Link>
                    </div>
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
        const updateTraitCategoryMutation = trpc.trait.updateTraitCategory.useMutation({
            onSuccess: (data) => {
                console.log('success', data)
                trpcUtils.org.getAllOrgs.invalidate()
            },
        })

        const handleZIndexChange = async (updatedTraitCategory: TraitCategory, zIndex: number) => {
            updatedTraitCategory.zIndex = zIndex
            await updateTraitCategoryMutation.mutate({ traitCategory: updatedTraitCategory, projectSlug })
        }

        const handleUpgradeableChange = async (updatedTraitCategory: TraitCategory, isUpgradeable: boolean) => {
            updatedTraitCategory.isModifiable = isUpgradeable
            await updateTraitCategoryMutation.mutate({ traitCategory: updatedTraitCategory, projectSlug })
        }

        const handleDefaultAchievedChange = async (updatedTraitCategory: TraitCategory, isDefaultAchieved: boolean) => {
            updatedTraitCategory.isDefaultAchieved = isDefaultAchieved
            await updateTraitCategoryMutation.mutate({ traitCategory: updatedTraitCategory, projectSlug })
        }

        const zOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

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
            <div className="overflow-x-auto">
                <table className="table-primary">
                    <thead className="thead-primary">
                        <tr>
                            <th className="th-primary">Name</th>
                            <th className="th-primary">Z Index</th>
                            <th className="th-primary">Upgradeable?</th>
                            <th className="th-primary">Default Earned?</th>
                        </tr>
                    </thead>
                    <tbody className="tbody-primary">
                        {traitCategories
                            .sort((a, b) => a.zIndex - b.zIndex)
                            .map((traitCategory) => (
                                <tr key={traitCategory.name}>
                                    <td className="td-primary">{traitCategory.name}</td>
                                    <td className="td-primary">
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
                                    <td className="td-primary">
                                        <ToggleWithIcon
                                            enabled={traitCategory.isModifiable}
                                            setEnabled={(isEnabled: boolean) =>
                                                handleUpgradeableChange(traitCategory, isEnabled)
                                            }
                                        />
                                    </td>
                                    <td className="td-primary">
                                        <ToggleWithIcon
                                            enabled={traitCategory.isDefaultAchieved}
                                            setEnabled={(isEnabled: boolean) =>
                                                handleDefaultAchievedChange(traitCategory, isEnabled)
                                            }
                                        />
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <Shell pageTitle="Admin Dashboard">
            <div>
                <div className="pb-4 text-2xl font-bold md:text-3xl">Admin</div>
                <div className="flex flex-col space-y-12">
                    <div className="flex flex-col space-y-6">
                        <div className="flex flex-col space-y-2">
                            <div className="text-xl font-bold md:text-2xl">Orgs</div>
                            <Orgs />
                        </div>
                        <div className="flex gap-2">
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
                    </div>

                    {selectedOrg && (
                        <div className="flex flex-col space-y-6">
                            <div className="flex flex-col space-y-2">
                                <div className="text-xl font-bold md:text-2xl">Projects</div>
                                <Projects />
                            </div>

                            <div className="flex gap-2">
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
                        </div>
                    )}
                </div>
            </div>
            <>
                <div className="flex flex-col space-y-12">
                    {selectedOrg && !selectedProject && (
                        <div>
                            <div className="flex flex-col space-y-8">
                                <div className="text-2xl font-bold md:text-3xl">{`${selectedOrg.name}`}</div>
                                <div className="flex gap-2">
                                    <Input
                                        label="ENS or Wallet Address"
                                        placeholder="brenner.eth"
                                        value={inviteAddress}
                                        onChange={(e) => {
                                            setInviteAddress(e.target.value)
                                        }}
                                        className="w-64"
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
                                        Send Admin Invite
                                    </button>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <div className="text-xl font-bold md:text-2xl">Existing Admins & Invitations</div>
                                    {invites ? (
                                        <div className="">
                                            <div className="overflow-x-auto">
                                                <table className="table-primary">
                                                    <thead className="thead-primary">
                                                        <tr>
                                                            <th className="th-primary">ENS</th>
                                                            <th className="th-primary">Address</th>
                                                            <th className="th-primary">Sent At</th>
                                                            <th className="th-primary">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="tbody-primary">
                                                        {invites.map((invite) => (
                                                            <tr key={invite.inviteeAddress}>
                                                                <td className="td-primary">{invite.ens ?? '-'}</td>
                                                                <td className="td-primary">
                                                                    {truncateAddress(invite.inviteeAddress)}
                                                                </td>
                                                                <td className="td-primary">
                                                                    {invite.createdAt.toLocaleString()}
                                                                </td>
                                                                <td className="td-primary text-sm text-gray-500">
                                                                    {invite.status.toLowerCase()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                    {selectedProject && (
                        <div className="flex flex-col space-y-4">
                            <div className="text-2xl font-bold md:text-3xl">{`${selectedProject.name}`}</div>
                            <div>
                                <button
                                    onClick={() =>
                                        copyS3Files.mutate({
                                            projectSlug: selectedProject.slug,
                                        })
                                    }
                                    className="btn-primary my-4"
                                >
                                    upload traits from S3
                                </button>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <div className="text-xl font-bold md:text-2xl">Trait Categories</div>
                                <TraitCategoryTable
                                    traitCategories={selectedProject.traitCategories}
                                    projectSlug={selectedProject.slug}
                                />
                            </div>
                            <div>
                                <div className="text-xl font-bold md:text-2xl">Achievement to Trait mapping</div>
                                {selectedProject.traitCategories
                                    .filter((traitCategory) => !traitCategory.isDefaultAchieved)
                                    .map((traitCategory) => (
                                        <div key={traitCategory.name}>
                                            <AchievementToTraitEditor
                                                traitCategory={traitCategory}
                                                achievementCategories={selectedProject.achievementCategories}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </>
        </Shell>
    )
}

export default AdminDashboard
