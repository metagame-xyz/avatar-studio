import type { Dispatch, SetStateAction } from 'react'
import { useEffect } from 'react'
import { useSessionStorage } from 'react-use'
import { airtableAuthUrl, codeVerifierKey, codeVerifierStr } from 'utils/airtableFrontend'
import Modal from './Modal'

export default function RelinkAirtableAuthModal({
    open,
    setOpen,
    organizationSlug,
}: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    organizationSlug: string
}) {
    const [, setAirtableAuthCache] = useSessionStorage('airtableAuthCache', {})

    useEffect(() => {
        if (organizationSlug && codeVerifierStr) {
            setAirtableAuthCache({
                [codeVerifierKey]: {
                    codeVerifier: codeVerifierStr,
                    organizationSlug,
                },
            })
        }
    }, [organizationSlug, setAirtableAuthCache])

    return (
        <Modal open={open} setOpen={setOpen} hideButtons title="Please re-link Airtable" uncloseable>
            <div className="mx-auto mt-5 flex">
                <a className="btn-primary mx-auto w-64 items-center text-center" href={`${airtableAuthUrl}`}>
                    Link Airtable
                </a>
            </div>
        </Modal>
    )
}
