import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { objectToCamel } from 'ts-case-convert'

dotenv.config()

const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
const privyAppSecret = process.env.PRIVY_APP_SECRET

const prisma = new PrismaClient()

const createAuthHeader = (id: string, secret: string): string => {
    const token = Buffer.from(`${id}:${secret}`).toString('base64')
    return `Basic ${token}`
}

const privyGetAllUsers = async (
    appId: string | undefined = undefined,
    appSecret: string | undefined = undefined,
): Promise<any[]> => {
    const url = 'https://auth.privy.io/api/v1/users'

    const app = appId || ''
    const secret = appSecret || ''
    const options = {
        method: 'GET',
        headers: {
            'privy-app-id': app,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(app, secret),
        },
    }

    const data = await fetch(url, options).then((res) => res.json())
    const users = data.data.map((user: any) => {
        return objectToCamel(user)
    })

    const remappedUsers = users.map((user: any) => ({
        ...user,
        address: user.linkedAccounts[0]?.address.toLowerCase(),
    }))

    return remappedUsers
}

export const privyDeleteUser = async (
    id: string,
    appId: string | undefined = undefined,
    appSecret: string | undefined = undefined,
): Promise<void> => {
    const url = `https://auth.privy.io/api/v1/users/${id}`

    const app = appId || ''
    const secret = appSecret || ''

    const options = {
        method: 'DELETE',
        headers: {
            'privy-app-id': app,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(app, secret),
        },
    }

    const response = await fetch(url, options)
    console.log('deleted:', response)
}

async function main() {
    const oldPrivyUsers = await privyGetAllUsers(privyAppId, privyAppSecret)

    console.log('oldPrivyUsers', oldPrivyUsers)

    await Promise.all(
        oldPrivyUsers.map((user) => {
            privyDeleteUser(user.id, privyAppId, privyAppSecret)
        }),
    )
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
