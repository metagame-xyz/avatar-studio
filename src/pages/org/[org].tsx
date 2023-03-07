import { UserCircleIcon } from '@heroicons/react/24/outline'
import FullPageLoading from 'components/FullPageLoading'
import MembersList from 'components/MembersList'
import NewProjectModal from 'components/NewProjectModal'
import Shell from 'components/Shell'
import { type NextPage } from 'next'
import NextError from 'next/error'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSessionStorage } from 'react-use'
import { airtableAuthUrl, codeVerifierKey, codeVerifierStr } from 'utils/airtableFrontend'
import { trpc } from 'utils/trpc'

const Org: NextPage = () => {
    const router = useRouter()
    const slug = router.query.org as string

    const { data: org, error, status } = trpc.org.getBySlug.useQuery(slug, { enabled: !!slug })
    const { data: tokenNeedsRefresh } = trpc.org.doesTokenNeedRefresh.useQuery(
        { organizationSlug: slug },
        { enabled: !!slug },
    )

    const { data: user } = trpc.member.me.useQuery()
    const [openNewProjectModal, setOpenNewProjectModal] = useState(false)
    const [, setAirtableAuthCache] = useSessionStorage('airtableAuthCache', {})

    // const { data: bases } = trpc.org.getAirtableBases.useQuery({ organizationSlug: slug }, { enabled: !!slug })

    useEffect(() => {
        if (slug && codeVerifierStr) {
            setAirtableAuthCache({
                [codeVerifierKey]: {
                    codeVerifier: codeVerifierStr,
                    organizationSlug: slug,
                },
            })
        }
    }, [slug, setAirtableAuthCache])

    // check is user is an org admin
    const isOrgAdmin = user?.organizations?.find((o) => o.id == org?.id)

    if (error) {
        return <NextError title={error.message} statusCode={error.data?.httpStatus ?? 500} />
    }

    if (status !== 'success') return <FullPageLoading />

    const { name } = org

    const Projects = () => {
        const projects = org.projects || []
        return projects.length > 0 ? (
            <div className="flex flex-col space-y-2">
                {projects.map(({ name, slug }) => (
                    <div className="flex items-center" key={slug}>
                        <Link className="text-lg hover:text-teal-200" href={`/project/${slug}`}>
                            <UserCircleIcon className="mr-2 inline-block h-8 w-8" />
                            {name}
                        </Link>
                    </div>
                ))}
            </div>
        ) : (
            <></>
        )
    }

    return (
        <Shell pageTitle={name}>
            <>
                <NewProjectModal open={openNewProjectModal} setOpen={setOpenNewProjectModal} organizationSlug={slug} />
                <div className="pb-4 text-2xl font-bold md:text-3xl">{name}</div>
                <div className="flex flex-col space-y-8">
                    <div className="flex flex-col space-y-4">
                        <div className="text-xl font-bold md:text-2xl">Projects</div>
                        <Projects />
                    </div>
                    {/* {isOrgAdmin && (
                        <div>
                            <button
                                className="btn-primary w-full"
                                onClick={() => {
                                    setOpenNewProjectModal(true)
                                }}
                            >
                                Create Avatar
                            </button>
                        </div>
                    )} */}
                    {isOrgAdmin && tokenNeedsRefresh && (
                        <div>
                            <a className="btn-primary w-full" href={`${airtableAuthUrl}`}>
                                Link Airtable
                            </a>
                        </div>
                    )}
                </div>
            </>
            <>
                <div className="pb-4 text-2xl font-bold md:text-3xl">Admins</div>
                <MembersList membersList={org.admins} />
            </>
        </Shell>
    )
}

export default Org
