import Shell from 'components/Shell'
import { type NextPage } from 'next'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { trpc } from 'utils/trpc'
import { ArrayElement } from 'utils/types'

const AdminDashboard: NextPage = () => {
    const router = useRouter()

    const { data: user } = trpc.member.me.useQuery()

    // const { data } = trpc.trait.getFromS3.useQuery('llama-pfp')
    // const copyS3Files = trpc.trait.createFromS3.useMutation()

    const { data: orgs } = trpc.org.getAllOrgs.useQuery()

    const createOrg = trpc.org.createNewOrg.useMutation({
        onSuccess: (data) => {
            console.log('success', data)
        },
        onError: (error) => {
            console.log('error', error)
        },
    })

    const [newOrgName, setNewOrgName] = useState('')
    const [selectedOrg, setSelectedOrg] = useState<ArrayElement<typeof orgs> | null>(null)

    const Orgs = () => {
        return orgs && orgs.length > 0 ? (
            <div>
                {orgs.map((org) => (
                    <span onClick={() => setSelectedOrg(org)} key={org.name}>
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

    // const Projects = () => {
    //     const projects = org.projects || []
    //     return projects.length > 0 ? (
    //         <div>
    //             {projects.map(({ name, slug }) => (
    //                 <div className="mt-2 flex items-center" key={slug}>
    //                     <Link
    //                         className="text-lg hover:text-teal-200"
    //                         href={`/project/${slug}`}
    //                     >
    //                         <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
    //                         {name}
    //                     </Link>
    //                 </div>
    //             ))}
    //         </div>
    //     ) : (
    //         <></>
    //     )
    // }

    return (
        <Shell pageTitle="Admin Dashboard">
            <>
                <div className="flex flex-col">
                    <div className="text-4xl font-bold">Admin</div>
                    <div className="mt-4 mb-2 text-3xl font-bold">Create New Org</div>
                    {/* <Projects /> */}
                    <div className="mt-2">
                        <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
                            <label
                                htmlFor="new-org-name"
                                className="absolute -top-2 left-2 -mt-px inline-block bg-black  px-1 text-xs font-medium"
                            >
                                New Org Name
                            </label>
                            <input
                                type="text"
                                name="new-org-name"
                                id="new-org-name"
                                className="block w-full border-0 bg-black p-0 text-teal-50 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                placeholder="Haab Goblins Crypto Club"
                                value={newOrgName}
                                onChange={(e) => {
                                    setNewOrgName(e.target.value)
                                }}
                            />
                        </div>
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
                <div className="text-4xl font-bold">Members</div>
            </>
        </Shell>
    )
}

export default AdminDashboard
