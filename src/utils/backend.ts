import { PrivyClient, type User as PrivyUser } from '@privy-io/server-auth'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import { ethers, Wallet } from 'ethers'
import { goerli, mainnet } from 'wagmi/chains'
import type { NewAirtableMember, Signature } from './types'

export const privy = new PrivyClient(clientEnv.NEXT_PUBLIC_PRIVY_APP_ID, serverEnv.PRIVY_APP_SECRET)

export const createDomainSeparator = (
    name: string,
    contractAddress: string,
    network: string,
    tokenId = '1',
): string => {
    // tokenId is use for 1155s, where each tokenId has different mint requirements.
    // for 712s, tokenId is always 1.

    const networkId = network === 'homestead' ? mainnet.id : goerli.id

    const DOMAIN_SEPARATOR = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'uint256', 'address'],
            [
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenId)),
                networkId,
                contractAddress,
            ],
        ),
    )

    return DOMAIN_SEPARATOR
}

export const generateSignature = async (address: string, domainSeparator: string) => {
    const signer = new Wallet(serverEnv.VALIDATOR_PRIVATE_KEY)

    const payloadHash = ethers.utils.defaultAbiCoder.encode(['bytes32', 'address'], [domainSeparator, address])
    const messageHash = ethers.utils.keccak256(payloadHash)

    const signedAddress = await signer.signMessage(ethers.utils.arrayify(messageHash))
    const signature: ethers.Signature = ethers.utils.splitSignature(signedAddress)
    return signature
}

export const generateMintingSignature = async (
    memberAddress: string,
    projectSlug: string,
    contractAddress: string,
    network: string,
): Promise<Signature> => {
    const domainSeparator = createDomainSeparator(projectSlug, contractAddress, network)
    const signature = await generateSignature(memberAddress, domainSeparator)
    return signature as Signature
}

export const createAuthHeader = (id: string, secret: string): string => {
    const token = Buffer.from(`${id}:${secret}`).toString('base64')
    return `Basic ${token}`
}

export const privyAddUser = async (
    newAirtableUser: NewAirtableMember,
    walletAddressFieldName: string,
): Promise<PrivyUser> => {
    const url = 'https://auth.privy.io/api/v1/users'

    const linked_accounts = []

    if (newAirtableUser[walletAddressFieldName]) {
        linked_accounts.push({
            address: newAirtableUser[walletAddressFieldName],
            type: 'wallet',
            chain_type: 'ethereum',
        })
    }
    if (newAirtableUser.email) {
        linked_accounts.push({
            address: newAirtableUser.email,
            type: 'email',
        })
    }

    const data = JSON.stringify({ linked_accounts })

    const options = {
        method: 'POST',
        headers: {
            'privy-app-id': clientEnv.NEXT_PUBLIC_PRIVY_APP_ID,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(clientEnv.NEXT_PUBLIC_PRIVY_APP_ID, serverEnv.PRIVY_APP_SECRET),
        },
        body: data,
    }

    const user = await fetch(url, options).then((res) => res.json())
    user.linkedAccounts = user.linked_accounts
    delete user.linked_accounts
    return user as PrivyUser
}

export const privyGetAllUsers = async (
    appId: string | undefined = undefined,
    appSecret: string | undefined = undefined,
): Promise<PrivyUser[]> => {
    const url = 'https://auth.privy.io/api/v1/users'

    const app = appId || clientEnv.NEXT_PUBLIC_PRIVY_APP_ID
    const secret = appSecret || serverEnv.PRIVY_APP_SECRET
    const options = {
        method: 'GET',
        headers: {
            'privy-app-id': app,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(app, secret),
        },
    }

    const data = (await fetch(url, options).then((res) => res.json())) as { data: PrivyUser[] }
    return data.data
}

export const privyDeleteUser = async (id: string): Promise<void> => {
    const url = `https://auth.privy.io/api/v1/users/${id}`

    const options = {
        method: 'DELETE',
        headers: {
            'privy-app-id': clientEnv.NEXT_PUBLIC_PRIVY_APP_ID,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(clientEnv.NEXT_PUBLIC_PRIVY_APP_ID, serverEnv.PRIVY_APP_SECRET),
        },
    }

    await fetch(url, options)
}

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
