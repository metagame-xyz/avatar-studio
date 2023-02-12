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
    const { data: tokenNeedsRefresh } = trpc.org.checkAirtableTokenNeedsRefresh.useQuery(
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
            <div>
                {projects.map(({ name, slug }) => (
                    <div className="mt-2 flex items-center" key={slug}>
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

    const LeftChild = () => {
        return (
            <>
                <NewProjectModal open={openNewProjectModal} setOpen={setOpenNewProjectModal} organizationSlug={slug} />
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold">{name}</div>
                    <div className="self-start">
                        <Projects />
                        {isOrgAdmin && (
                            <button
                                className="btn-primary mt-4 self-start text-center"
                                onClick={() => {
                                    setOpenNewProjectModal(true)
                                }}
                            >
                                Create Avatar
                            </button>
                        )}
                        {isOrgAdmin && tokenNeedsRefresh && (
                            <a className="btn-primary mt-4 w-64 items-center text-center" href={`${airtableAuthUrl}`}>
                                Link Airtable
                            </a>
                        )}
                    </div>
                </div>
            </>
        )
    }

    const RightChild = () => {
        return (
            <>
                <div className="text-4xl font-bold">Admins</div>
                <MembersList membersList={org.admins} />
            </>
        )
    }

    return <Shell LeftChild={<LeftChild />} RightChild={<RightChild />} pageTitle={name} />
}

export default Org
