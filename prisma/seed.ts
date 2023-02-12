import type { Achievement, TraitCategory } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { hashTraits } from '../src/utils'
import { getFromS3 } from '../src/utils/s3'
import type { TraitWithEarnedBool } from '../src/utils/types'
import { LlamaTier } from '../src/utils/types'
// import { prisma } from '../src/server/db/client'
import * as AWS from 'aws-sdk'

import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

AWS.config.update({
    accessKeyId: process.env.METAGAME_AWS_ACCESS_KEY,
    secretAccessKey: process.env.METAGAME_AWS_SECRET_ACCESS_KEY,
})

const metagameAddress = '0x9d8395a406fa264dea71671c772269e844264e8c'
const privyDID_1 = 'did:privy:cle0lx71f0002jr08lrbvsl6j'
const brennerEmail = 'brenner@themetagame.xyz'

const goerliTestAddress = '0xe55aa8f29593531b2c1c7e013139dbc8b63b1b92'
const privyDID_2 = 'did:privy:cle0m1j4w0002mg082n13dhd3'

const rinkebyTestAddress = '0xacebc2d5c90b515341f3a01ba4c876643b8067e8'
const privyDID_3 = 'did:privy:cle0m24te0006jr08z4ku9v7p'

const goerliContractAddress = '0x2ba797c234c8fe25847225b11b616bce729b0b53'

async function main() {
    const brenner = await prisma.user.create({
        data: {
            address: metagameAddress,
            email: brennerEmail,
            privyDID: privyDID_1,
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
            firstName: 'Brenner',
            lastName: 'Spear',
        },
    })

    const nir = await prisma.user.create({
        data: {
            address: goerliTestAddress,
            privyDID: privyDID_2,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: goerliTestAddress,
                        chainType: 'ethereum',
                        verifiedAt: '2023-01-11T20:23:17.000Z',
                    },
                ],
            },
            firstName: 'Nir',
            lastName: 'Kabessa',
        },
    })

    const jon = await prisma.user.create({
        data: {
            address: rinkebyTestAddress,
            privyDID: privyDID_3,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: rinkebyTestAddress,
                        chainType: 'ethereum',
                        verifiedAt: '2023-01-11T20:25:17.000Z',
                    },
                ],
            },
            firstName: 'Jon',
            lastName: 'Wu',
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
            issuedById: brenner.id,
        },
    })
    const acceptedInvitation = await prisma.organizationInvitation.create({
        data: {
            organizationId: brassFactory.id,
            inviteeAddress: metagameAddress,
            role: 'OWNER',
            issuedById: brenner.id,
            status: 'ACCEPTED',
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

    for (const member of [brenner, nir, jon]) {
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
            userId: brenner.id,
            achievementId: (achievements[1] as Achievement).id,
            status: true,
        },
    })
    await prisma.memberAchievements.create({
        data: {
            userId: nir.id,
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
                levelLogic: 'GREATER_THAN_OR_EQUAL',
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
        const member = i % 2 === 0 ? brenner : nir
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
                image: 'TODO',
                name: `${member.firstName}'s Llama`,
                description: 'TODO',
                externalUrl: 'TODO',
                walletAddress: member.address || '',
                traits: {
                    connect: traitsWithEarnedBool.map((t) => ({ id: t.id })),
                },
                traitHash: hashTraits(traitsWithEarnedBool),
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
