import type { Achievement, TraitCategory } from '@prisma/client'
import { InvitationStatus, LevelLogic, PrismaClient, UserRole } from '@prisma/client'
import * as AWS from 'aws-sdk'
import * as dotenv from 'dotenv'
import { objectToCamel } from 'ts-case-convert'
import { hashPermanentTraits } from 'utils'
import { getFromS3 } from 'utils/s3'
import type { NewAirtableMember, TraitWithEarnedBool } from 'utils/types'
import { LlamaTier } from 'utils/types'

dotenv.config()

const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
const privyAppSecret = process.env.PRIVY_APP_SECRET

const prisma = new PrismaClient()

AWS.config.update({
    accessKeyId: process.env.METAGAME_AWS_ACCESS_KEY,
    secretAccessKey: process.env.METAGAME_AWS_SECRET_ACCESS_KEY,
})

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

    await fetch(url, options)
}

export const privyAddUser = async (
    newAirtableUser: NewAirtableMember,
    appId: string | undefined = undefined,
    appSecret: string | undefined = undefined,
): Promise<any> => {
    const url = 'https://auth.privy.io/api/v1/users'

    const app = appId || ''
    const secret = appSecret || ''

    const linked_accounts = []

    if (newAirtableUser['wallet-address']) {
        linked_accounts.push({
            address: newAirtableUser['wallet-address'],
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
            'privy-app-id': app,
            'Content-Type': 'application/json',
            Authorization: createAuthHeader(app, secret),
        },
        body: data,
    }

    const user = await fetch(url, options).then((res) => res.json())

    const camelUser = objectToCamel(user) as any

    const remappedUser = {
        ...camelUser,
        address: camelUser.linkedAccounts.find((acc: any) => acc.type === 'wallet')?.address.toLowerCase(),
    }

    return remappedUser
}

const metagameAddress = '0x9d8395a406fa264dea71671c772269e844264e8c'
const brennerEmail = 'brenner@themetagame.xyz'
const aliceTestAddress = '0xe55aa8f29593531b2c1c7e013139dbc8b63b1b92'
const bobTestAddress = '0xacebc2d5c90b515341f3a01ba4c876643b8067e8'

const goerliContractAddress = '0x2ba797c234c8fe25847225b11b616bce729b0b53'

const metagameAdmin = {
    ['wallet-address']: metagameAddress,
    email: brennerEmail,
    ['first-name']: 'Metagame',
    ['last-name']: 'Admin',
}

const AliceTestUser = {
    ['wallet-address']: aliceTestAddress,
    ['first-name']: 'Alice',
    ['last-name']: 'Test',
}

const bobTestUser = {
    ['wallet-address']: bobTestAddress,
    ['first-name']: 'Bob',
    ['last-name']: 'Test',
}

const seedMembers = [metagameAdmin, AliceTestUser, bobTestUser]

async function main() {
    const oldPrivyUsers = await privyGetAllUsers(privyAppId, privyAppSecret)

    await Promise.all(
        oldPrivyUsers.map((user) => {
            privyDeleteUser(user.id, privyAppId, privyAppSecret)
        }),
    )
    await sleep(3000)
    const privyUsers = await Promise.all(seedMembers.map((member) => privyAddUser(member, privyAppId, privyAppSecret)))

    const metagameAdmin = await prisma.user.create({
        data: {
            address: metagameAddress,
            email: brennerEmail,
            privyDID: privyUsers.find((user) => user.address === metagameAddress)?.id,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: metagameAddress,
                        chainType: 'ethereum',
                        verifiedAt: '2023-01-11T20:23:17.000Z',
                    },
                    {
                        type: 'email',
                        address: brennerEmail,
                        verifiedAt: '2023-01-12T20:23:17.000Z',
                    },
                ],
            },
            firstName: 'Metagame',
            lastName: 'Admin',
            role: UserRole.METAGAME_OWNER,
        },
    })

    const alice = await prisma.user.create({
        data: {
            address: aliceTestAddress,
            privyDID: privyUsers.find((user) => user.address === aliceTestAddress)?.id,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: aliceTestAddress,
                        chainType: 'ethereum',
                        verifiedAt: '2023-01-11T20:23:17.000Z',
                    },
                ],
            },
            firstName: 'Alice',
            lastName: 'Test',
        },
    })

    const bob = await prisma.user.create({
        data: {
            address: bobTestAddress,
            privyDID: privyUsers.find((user) => user.address === bobTestAddress)?.id,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: bobTestAddress,
                        chainType: 'ethereum',
                        verifiedAt: '2023-01-11T20:25:17.000Z',
                    },
                ],
            },
            firstName: 'Bob',
            lastName: 'Test',
        },
    })

    const brassFactory = await prisma.organization.upsert({
        where: { slug: 'brass-factory-blockchain-club' },
        update: {},
        create: {
            name: 'Brass Factory Blockchain Club',
            slug: 'brass-factory-blockchain-club',
        },
    })
    const haabGoblins = await prisma.organization.upsert({
        where: { slug: 'haab-goblins-crypto-club' },
        update: {},
        create: {
            name: 'Haab Goblins Crypto Club',
            slug: 'haab-goblins-crypto-club',
        },
    })
    const { organizations } = await prisma.user.update({
        where: { address: metagameAddress },
        data: {
            organizations: {
                create: [
                    {
                        organizationId: brassFactory.id,
                        role: 'OWNER',
                    },
                ],
            },
        },
        include: {
            organizations: true,
        },
    })

    const invitation = await prisma.organizationInvitation.create({
        data: {
            organizationId: haabGoblins.id,
            inviteeAddress: metagameAddress,
            role: 'OWNER',
            issuedById: metagameAdmin.id,
        },
    })
    const acceptedInvitation = await prisma.organizationInvitation.create({
        data: {
            organizationId: brassFactory.id,
            inviteeAddress: metagameAddress,
            role: 'OWNER',
            issuedById: metagameAdmin.id,
            status: InvitationStatus.ACCEPTED,
        },
    })

    const brassBuddies = await prisma.project.upsert({
        where: { slug: 'brass-buddies' },
        update: {},
        create: {
            name: 'Brass Buddies',
            slug: 'brass-buddies',
            organizationId: brassFactory.id,
        },
    })

    const axolotls = await prisma.project.upsert({
        where: { slug: 'cdmx-axolotls' },
        update: {},
        create: {
            name: 'CDMX Axolotls',
            slug: 'cdmx-axolotls',
            organizationId: haabGoblins.id,
        },
    })

    const { traitCategories: axolotlTraitCategories } = await getFromS3(AWS, prisma, axolotls.slug)

    for (const axolotlTraitCategory of axolotlTraitCategories) {
        const zMap = {
            Background: 0,
            Base: 1,
            Eyes: 2,
            Ears: 3,
            Mouth: 4,
            Headwear: 5,
            Clothes: 6,
        } as Record<string, number>

        await prisma.traitCategory.update({
            where: {
                projectId_name: {
                    projectId: axolotlTraitCategory.projectId,
                    name: axolotlTraitCategory.name,
                },
            },
            data: {
                zIndex: zMap[axolotlTraitCategory.name],
            },
        })
    }

    for (const member of [metagameAdmin, alice, bob]) {
        await prisma.membersOfProjects.create({
            data: {
                projectSlug: axolotls.slug,
                userId: member.id,
                role: 'MEMBER',
            },
        })
    }

    const llamaPfp = await prisma.project.upsert({
        where: { slug: 'llama-pfp' },
        update: {},
        create: {
            name: 'Llama Pfp',
            slug: 'llama-pfp',
            organizationId: brassFactory.id,
            testContractAddress: goerliContractAddress,
        },
    })

    for (const member of [metagameAdmin, alice, bob]) {
        await prisma.membersOfProjects.create({
            data: {
                projectSlug: llamaPfp.slug,
                userId: member.id,
                role: 'MEMBER',
            },
        })
    }

    const llamaLevel = await prisma.achievementCategory.create({
        data: {
            projectId: llamaPfp.id,
            name: 'Llama Level',
            type: 'LEVEL',
            description: 'What level you are in Llama DAO',
            achievements: {
                create: [
                    {
                        name: LlamaTier.Traveler,
                        level: 1,
                    },
                    {
                        name: LlamaTier.Explorer,
                        level: 2,
                    },
                    {
                        name: LlamaTier.Mountaineer,
                        level: 3,
                    },
                    {
                        name: LlamaTier.Rancher,
                        level: 4,
                    },
                ],
            },
        },
        include: {
            achievements: true,
        },
    })

    const achievements = llamaLevel.achievements

    await prisma.memberAchievements.create({
        data: {
            userId: metagameAdmin.id,
            achievementId: (achievements[1] as Achievement).id,
            status: true,
        },
    })
    await prisma.memberAchievements.create({
        data: {
            userId: alice.id,
            achievementId: (achievements[2] as Achievement).id,
            status: true,
        },
    })

    const { traitCategories } = await getFromS3(AWS, prisma, llamaPfp.slug)

    const backgroundCategory = traitCategories.find((tc) => tc.name === 'Background') as TraitCategory

    await prisma.traitCategory.update({
        where: {
            projectId_name: {
                projectId: backgroundCategory.projectId,
                name: backgroundCategory.name,
            },
        },
        data: {
            isDefaultAchieved: false,
            isModifiable: true,
        },
    })

    // loop through the categories update the zIndex of the other categories, body=10, eyes=20, ears=21
    for (const traitCategory of traitCategories) {
        const zMap = {
            Background: 0,
            Body: 10,
            Eyes: 20,
            Ears: 21,
        } as Record<string, number>

        await prisma.traitCategory.update({
            where: {
                projectId_name: {
                    projectId: traitCategory.projectId,
                    name: traitCategory.name,
                },
            },
            data: {
                zIndex: zMap[traitCategory.name],
            },
        })
    }

    let TraitCategoriesWithTraits = await prisma.traitCategory.findMany({
        where: {
            projectId: llamaPfp.id,
        },
        include: { traits: { include: { traitCategory: true } } },
    })

    const backgroundTraits = TraitCategoriesWithTraits.find((tc) => tc.name === 'Background')?.traits

    if (!backgroundTraits) throw Error('No background traits found')

    // 7 backgrounds, ~2 achievements per background
    for (const [i, trait] of backgroundTraits.entries()) {
        const levelRequired = Math.floor(i / 2) + 1
        // const levelLogic = 'GREATER_THAN_OR_EQUAL'

        const achievementsToConnect = achievements
            .filter((a) => (a?.level || 0) >= levelRequired)
            .map((a) => ({ id: a?.id }))

        await prisma.trait.update({
            where: {
                id: trait.id,
            },
            data: {
                isDefaultAchieved: false,
                levelRequired: Math.floor(i / 2) + 1,
                levelLogic: LevelLogic.GREATER_THAN_OR_EQUAL_TO,
                levelCategory: {
                    connect: {
                        id: llamaLevel.id,
                    },
                },
                achievementsRequired: {
                    connect: achievementsToConnect,
                },
                achievementsRequiredDescription: `Level ${levelRequired} or higher`,
            },
        })
    }

    TraitCategoriesWithTraits = await prisma.traitCategory.findMany({
        where: {
            projectId: llamaPfp.id,
        },
        include: { traits: { include: { traitCategory: true } } },
    })

    const bgTraits = TraitCategoriesWithTraits.find((tc) => tc.name === 'Background')?.traits

    const eyeTraits = TraitCategoriesWithTraits.find((tc) => tc.name === 'Eyes')?.traits

    const earTraits = TraitCategoriesWithTraits.find((tc) => tc.name === 'Ears')?.traits

    const bodyTraits = TraitCategoriesWithTraits.find((tc) => tc.name === 'Body')?.traits

    if (!bgTraits || !eyeTraits || !earTraits || !bodyTraits) throw Error('No traits found')

    const traitsToConnect = [bgTraits[0], bodyTraits[0], eyeTraits[0], earTraits[0]]
    const traitsToConnect2 = [
        bgTraits[1],
        bodyTraits[1],
        eyeTraits[1],
        earTraits[0], // ears
    ]
    const traitsToConnect3 = [
        bgTraits[2],
        bodyTraits[0],
        eyeTraits[0],
        earTraits[0], // ears
    ]
    const traitsToConnect4 = [
        bgTraits[3],
        bodyTraits[1],
        eyeTraits[1],
        earTraits[0], // ears
    ]

    const traitsToConnectArr = [traitsToConnect, traitsToConnect2, traitsToConnect3, traitsToConnect4]

    for (const [i, traits] of traitsToConnectArr.entries()) {
        const member = i % 2 === 0 ? metagameAdmin : alice
        const traitsWithEarnedBool = traits?.map((t) => {
            return {
                ...t,
                category: t?.traitCategory.name,
                zIndex: t?.traitCategory.zIndex,
                earned: true,
                isModifiable: t?.traitCategory.isModifiable,
            } as TraitWithEarnedBool
        }) as TraitWithEarnedBool[]

        const nftMetaData = await prisma.nftMetadata.create({
            data: {
                userId: member.id,
                projectSlug: llamaPfp.slug,
                tokenId: (i % 2) + 1,
                image: `${member.address}-${i + 1}.png`, // TODO make this right
                name: `${member.firstName}'s Llama`,
                description: 'TODO',
                externalUrl: 'TODO',
                walletAddress: member.address || '',
                traits: {
                    connect: traitsWithEarnedBool.map((t) => ({ id: t.id })),
                },
                traitHash: hashPermanentTraits(traitsWithEarnedBool),
            },
        })
    }
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
