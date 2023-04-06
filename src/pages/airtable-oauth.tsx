import FullPageLoading from 'components/FullPageLoading'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSessionStorage } from 'react-use'
import { trpc } from 'utils/trpc'
import type { AirtableAuthCache } from 'utils/types'

const AirtableOauth = () => {
    const router = useRouter()
    const { error, error_description, code, state } = router.query as {
        error?: string
        error_description?: string
        code: string
        state: string
    }

    const [airtableAuthCache, setAirtableAuthCache] =
        useSessionStorage<Record<string, AirtableAuthCache>>('airtableAuthCache')
    const [hasMutationRun, setHasMutationRun] = useState(false)

    const mutation = trpc.org.addAirtableTokens.useMutation({
        onSuccess: (organizationSlug) => {
            router.push(`/org/${organizationSlug}`)
            setAirtableAuthCache({})
        },
    })

    useEffect(() => {
        if (state && code && !hasMutationRun) {
            const { codeVerifier, organizationSlug } = airtableAuthCache[state] as AirtableAuthCache
            setHasMutationRun(true)
            mutation.mutate({ code, codeVerifier, organizationSlug })
        }
    }, [code, airtableAuthCache, hasMutationRun, mutation, state])

    if (error) {
        return (
            <div>
                There was an error authorizing this request.
                <br />
                Error: {`${error}`}
                <br />
                Error Description: {`${error_description}`}
            </div>
        )
    }

    // since the authorization didn't error, we know there's a grant code in the query
    // ...

    return <FullPageLoading loadingText="Linking your Airtable to your Organization" />
}

export default AirtableOauth
