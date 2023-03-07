import { hashMessage } from '@ethersproject/hash'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { Account, Organization, OrganizationInvitation } from '@prisma/client'
import { InvitationStatus } from '@prisma/client'
import * as AWS from 'aws-sdk'
import type { PutObjectRequest } from 'aws-sdk/clients/s3'
import { env } from 'env/server.mjs'
import { recoverAddress } from 'ethers/lib/utils'
import { hashPermanentTraits, traitsToTraitsWithEarnedBool } from 'utils'
import { generateMintingSignature } from 'utils/backend'
import { cloudfrontFolderUrl } from 'utils/constants'
import { getEns } from 'utils/needEnvUtils'
import { getEarnedTraits, getMemberWithProject, getNetworkName } from 'utils/prisma'
import { privyUserZ } from 'utils/privyZod'
import timer from 'utils/timer'
import type { TraitWithEarnedBool } from 'utils/types'
import { AddressZ, organizationRoleZod, requestedTraitsSchema } from 'utils/types'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'

export const memberRouter = router({
    getByDID: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        return ctx.prisma.user.findUnique({
            where: {
                privyDID: input.id,
            },
        })
    }),
    createOrUpdate: protectedProcedure.input(z.object({ privyUser: privyUserZ })).mutation(async ({ ctx, input }) => {
        const { privyUser } = input

        // remove chainId and walletType keys if they exist, lowercase address
        const linkedAccountsClean = privyUser.linkedAccounts.map((account) => {
            if (account.type !== 'wallet') return account

            account.address = account.address.toLowerCase()

            delete account.chainId
            delete account.walletType

            return account
        })

        if (ctx.session.userId !== privyUser.id) {
            throw new Error('User ID does not match')
        }

        const user = await ctx.prisma.user.upsert({
            create: {
                email: privyUser.email?.address,
                address: privyUser.wallet?.address.toLowerCase(),
                privyDID: privyUser.id,
                accounts: {
                    create: [...linkedAccountsClean],
                },
            },
            update: {
                address: privyUser.wallet?.address.toLowerCase(),
                email: privyUser.email?.address,
            },
            where: {
                privyDID: privyUser.id,
            },
            include: {
                accounts: true,
            },
        })

        const existingPrivyAccounts = user.accounts

        // merge new PrivyAccounts with existing ones by type
        const mergedPrivyAccounts = linkedAccountsClean.map((newAccount) => {
            const existingAccount = existingPrivyAccounts.find((a) => a.type === newAccount.type)

            if (!existingAccount) return newAccount as Account

            return {
                ...existingAccount,
                ...newAccount,
            } as Account
        })

        // loop through mergedPrivyAccounts and upsert into the DB
        // only doing a loop instead of createMany bc of sqlLite limitations
        for (const account of mergedPrivyAccounts) {
            await ctx.prisma.account.upsert({
                create: {
                    ...account,
                    userId: user.id,
                },
                update: {
                    ...account,
                },
                where: {
                    id: account.id || '',
                },
            })
        }
    }),
    homePage: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.session) return null

        const member = await ctx.prisma.user.findUnique({
            where: {
                privyDID: ctx.session.userId,
            },
            include: {
                organizations: { include: { organization: true } },
                projects: { include: { project: true } },
                achievements: { include: { achievement: true } },
                nftMetadata: true,
                accounts: true,
            },
        })

        if (!member) return null

        let pendingOrgInvitations: (OrganizationInvitation & { organization: Organization })[] = []
        if (member.address) {
            pendingOrgInvitations = await ctx.prisma.organizationInvitation.findMany({
                where: {
                    inviteeAddress: member.address,
                    status: InvitationStatus.PENDING,
                },
                include: {
                    organization: true,
                },
            })
        }

        return {
            ...member,
            organizations: member.organizations.map((o) => {
                return { ...o.organization, role: o.role }
            }),
            projects: member.projects.map((p) => {
                return { ...p.project, role: p.role }
            }),
            achievements: member.achievements.map((a) => {
                return {
                    ...a.achievement,
                    timestamp: a.timestamp,
                    status: a.status,
                }
            }),
            pendingOrgInvitations,
        }
    }),
    me: protectedProcedure
        .input(z.object({ getEns: z.boolean().optional() }).optional())
        .query(async ({ ctx, input }) => {
            // console.log('network', ctx.network)
            const member = await ctx.prisma.user.findUniqueOrThrow({
                where: {
                    privyDID: ctx.session.userId,
                },
                include: {
                    organizations: { include: { organization: true } },
                    projects: { include: { project: true } },
                    achievements: { include: { achievement: true } },
                    nftMetadata: true,
                    accounts: true,
                },
            })
            let orgInvitations: (OrganizationInvitation & { organization: Organization })[] = []
            if (member.address) {
                orgInvitations = await ctx.prisma.organizationInvitation.findMany({
                    where: {
                        inviteeAddress: member.address,
                    },
                    include: {
                        organization: true,
                    },
                })
            }

            let ens = undefined
            if (input?.getEns && member.address) {
                ens = await getEns(member.address)
            }

            return {
                ...member,
                ens,
                organizations: member.organizations.map((o) => {
                    return { ...o.organization, role: o.role }
                }),
                projects: member.projects.map((p) => {
                    return { ...p.project, role: p.role }
                }),
                achievements: member.achievements.map((a) => {
                    return {
                        ...a.achievement,
                        timestamp: a.timestamp,
                        status: a.status,
                    }
                }),
                invitations: orgInvitations,
            }
        }),
    acceptOrgInvitation: protectedProcedure
        .input(z.object({ organizationId: z.number(), role: organizationRoleZod }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session) return null

            const { address } = await ctx.prisma.user.findUniqueOrThrow({
                where: { privyDID: ctx.session.userId },
                select: { address: true },
            })

            if (!address) return null

            const orgInvite = await ctx.prisma.organizationInvitation.findFirstOrThrow({
                where: {
                    status: InvitationStatus.PENDING,
                    inviteeAddress: address,
                    organizationId: input.organizationId,
                    role: input.role,
                },
            })

            const [user] = await ctx.prisma.$transaction([
                ctx.prisma.user.update({
                    where: {
                        address,
                    },
                    data: {
                        organizations: {
                            create: [
                                {
                                    organizationId: orgInvite.organizationId,
                                    role: orgInvite.role,
                                },
                            ],
                        },
                    },
                }),
                ctx.prisma.organizationInvitation.update({
                    where: {
                        organizationId_inviteeAddress_role: {
                            organizationId: orgInvite.organizationId,
                            inviteeAddress: address,
                            role: orgInvite.role,
                        },
                    },
                    data: { status: InvitationStatus.ACCEPTED },
                }),
            ])

            return user
        }),
    // get all the traits a user has achieved
    traitsAchieved: protectedProcedure.input(z.object({ projectSlug: z.string() })).query(async ({ ctx, input }) => {
        const member = await getMemberWithProject(ctx.prisma, ctx.session.userId, input.projectSlug)
        return getEarnedTraits(member)
    }),

    nftMetadata: protectedProcedure
        .input(z.object({ projectSlug: z.string(), chainNetwork: z.string() }))
        .query(async ({ ctx, input }) => {
            // if node env isn't prod, use goerli, else, use chainNetwork
            const network = getNetworkName(input.chainNetwork)
            // get the latest version of the user's nftMetadata for the project

            const member = await getMemberWithProject(ctx.prisma, ctx.session.userId, input.projectSlug, network)

            if (!member.nftMetadata[0]) return null

            const traits = traitsToTraitsWithEarnedBool(member.nftMetadata[0].traits)

            const nftMetadata = {
                ...member.nftMetadata[0],
                traits,
            }
            return nftMetadata
        }),
    createOrUpdateNftMetadata: protectedProcedure
        .input(
            z.object({
                requestedTraits: requestedTraitsSchema,
                chainNetwork: z.string(),
                projectSlug: z.string(),
                signature: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { requestedTraits, projectSlug, chainNetwork } = input
            const network = getNetworkName(chainNetwork)
            const message = JSON.stringify({ requestedTraits, chainNetwork, projectSlug })
            const signerAddress = AddressZ.parse(recoverAddress(hashMessage(message), input.signature))
            timer.startTimer('getMemberWithProject')
            const member = await getMemberWithProject(ctx.prisma, ctx.session.userId, input.projectSlug, network)
            timer.stopTimer('getMemberWithProject')

            const allTraitsWithEarned = getEarnedTraits(member)

            if (!member.address) throw new Error('User address not found')
            if (member.address !== signerAddress) throw new Error('Invalid signer')

            const project = member.projects[0]?.project
            if (!project) throw new Error('Project not found')

            // confirm all of the requested traits are valid, based on being in the project's traits, and has been earned by the member
            const approvedTraits: TraitWithEarnedBool[] = []

            for (let i = 0; i < requestedTraits.length; i++) {
                const requestedTrait = requestedTraits[i]
                const tc = allTraitsWithEarned.find((tc) => tc.name === requestedTrait?.category)
                if (!tc) throw new Error('Invalid trait category')

                const trait = tc.traits.find((t) => t.name === requestedTrait?.name)
                if (!trait) throw new Error('Invalid trait')

                if (!trait.earned) throw new Error('Trait not earned')

                approvedTraits.push(trait)
            }

            const existingNftData = member.nftMetadata[0]

            const permanentTraitCategories = allTraitsWithEarned.filter((tc) => !tc.isModifiable).map((tc) => tc.name)

            if (existingNftData) {
                // Check if they're trying to change non-modifiable categories: reject
                for (const requestedTrait of requestedTraits) {
                    if (permanentTraitCategories.includes(requestedTrait.category)) {
                        throw new Error('Cannot modify non-modifiable trait')
                    }
                }

                // check to see if they haven't changed any traits at all
                if (
                    requestedTraits.every((t) =>
                        existingNftData.traits.some((et) => et.name === t.name && et.traitCategoryName === t.category),
                    )
                ) {
                    throw new Error('No changes made')
                }

                const existingTraits = traitsToTraitsWithEarnedBool(existingNftData.traits)
                // add back existing non-modifiable traits
                for (const existingTrait of existingTraits) {
                    if (!existingTrait.isModifiable) {
                        approvedTraits.push(existingTrait)
                    }
                }
            }

            // if this is their first time creating nft metadata, make sure they're creating a unique set of non-modifiable traits
            if (!existingNftData) {
                timer.startTimer('first time nft metadata')
                const usedTraitComboNft = await ctx.prisma.nftMetadata.findFirst({
                    where: {
                        projectSlug,
                        network,
                        traitHash: hashPermanentTraits(approvedTraits),
                        // redundant, but just to be safe
                        NOT: {
                            userId: member.id,
                        },
                    },
                    include: { member: true },
                })

                if (usedTraitComboNft) {
                    throw new Error(`Trait combo already used by ${usedTraitComboNft.member.firstName}`)
                }
                timer.stopTimer('first time nft metadata')
            }

            // generate signature for the address
            const contractAddress = network === 'homestead' ? project.contractAddress : project.testContractAddress

            if (!contractAddress) throw new Error('Contract address not found')

            const signature = await generateMintingSignature(member.address, project.slug, contractAddress, network)

            // // generate the multi-layer image using canvas
            const canvas = createCanvas(2400, 2400)
            const canvasCtx = canvas.getContext('2d')

            // // sort the layers by category z-index so that the background is drawn first
            approvedTraits.sort((a, b) => a.zIndex - b.zIndex)

            timer.startTimer('load trait images')

            const imagePromises = approvedTraits.map((layer) => loadImage(layer.pngUrl))
            const images = await Promise.all(imagePromises)
            timer.stopTimer('load trait images')

            timer.startTimer('draw trait images')
            for (const image of images) {
                canvasCtx.drawImage(image, 0, 0, 2400, 2400)
            }
            timer.stopTimer('draw trait images')

            AWS.config.update({
                accessKeyId: env.METAGAME_AWS_ACCESS_KEY,
                secretAccessKey: env.METAGAME_AWS_SECRET_ACCESS_KEY,
            })

            const s3 = new AWS.S3({ useAccelerateEndpoint: true })

            const permanentTraitsHash = hashPermanentTraits(approvedTraits)
            const version = member.nftMetadata.length + 1
            const imageFilePath = `${projectSlug}/complete-images/${network}/${member.address}/${permanentTraitsHash}_v${version}.png`
            const params: PutObjectRequest = {
                Bucket: 'metagame-xyz',
                Key: `nft-images/${imageFilePath}`,
                Body: canvas.toBuffer('image/png'),
                ContentType: 'image/png',
                ContentDisposition: 'inline',
            }

            timer.startTimer('nftMetadata.create')
            // add a new nftMetadata record
            await ctx.prisma.nftMetadata.create({
                data: {
                    userId: member.id,
                    projectSlug,
                    tokenId: existingNftData?.tokenId || null,
                    name: `${member.firstName}'s ${project.name}`,
                    description: `${member.firstName}'s ${project.name}, part of the ${project.organization.name} exclusive collection of Earnable Avatars`,
                    walletAddress: member.address,
                    image: `${cloudfrontFolderUrl}${imageFilePath}`,
                    network,
                    traitHash: permanentTraitsHash,
                    traits: {
                        connect: approvedTraits.map((t) => {
                            return { id: t.id }
                        }),
                    },
                },
            })
            timer.stopTimer('nftMetadata.create')

            timer.startTimer('s3 upload')
            await s3.upload(params).promise()
            timer.stopTimer('s3 upload')

            return signature
        }),
    getSignature: protectedProcedure
        .input(
            z.object({
                chainNetwork: z.string(),
                projectSlug: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const network = getNetworkName(input.chainNetwork)
            const member = await getMemberWithProject(ctx.prisma, ctx.session.userId, input.projectSlug, network)
            const project = member.projects[0]?.project
            if (!project) throw new Error('Project not found')
            if (!member.address) throw new Error('User address not found')

            const contractAddress = network === 'homestead' ? project.contractAddress : project.testContractAddress
            if (!contractAddress) throw new Error('Contract address not found')

            return generateMintingSignature(member.address, project.slug, contractAddress, network)
        }),
})
