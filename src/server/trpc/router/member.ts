import { hashMessage } from '@ethersproject/hash'
import type { Account } from '@prisma/client'
import { InvitationStatus } from '@prisma/client'
import * as AWS from 'aws-sdk'
import { env } from 'env/server.mjs'
import { recoverAddress } from 'ethers/lib/utils'
import { hashTraits, traitsToTraitsWithEarnedBool } from 'utils'
import { generateMintingSignature } from 'utils/backend'
import { getEarnedTraits, getMemberWithProject, getNetworkName } from 'utils/prisma'
import { privyUserZ } from 'utils/privyZod'
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
    me: protectedProcedure.query(async ({ ctx }) => {
        // console.log('network', ctx.network)
        const member = await ctx.prisma.user.findUniqueOrThrow({
            where: {
                privyDID: ctx.session.userId,
            },
            include: {
                organizations: { include: { organization: true } },
                projects: { include: { project: true } },
                achievements: { include: { achievement: true } },
                invitations: { include: { organization: true } },
                nftMetadata: true,
                accounts: true,
            },
        })

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
    createNftMetadata: protectedProcedure
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
            const member = await getMemberWithProject(ctx.prisma, ctx.session.userId, input.projectSlug, network)

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
                const usedTraitComboNft = await ctx.prisma.nftMetadata.findFirst({
                    where: {
                        projectSlug,
                        network,
                        traitHash: hashTraits(approvedTraits),
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
            }

            // generate signature for the address
            const contractAddress = network === 'mainnet' ? project.contractAddress : project.testContractAddress

            if (!contractAddress) throw new Error('Contract address not found')

            const signature = await generateMintingSignature(member.address, project.slug, contractAddress, network)

            AWS.config.update({
                accessKeyId: env.METAGAME_AWS_ACCESS_KEY,
                secretAccessKey: env.METAGAME_AWS_SECRET_ACCESS_KEY,
            })

            const s3 = new AWS.S3()

            // // generate the multi-layer image using canvas
            // const canvas = createCanvas(2400, 2400)
            // const ctx = canvas.getContext('2d')

            // // sort the layers by category z-index so that the background is drawn first
            // requestedLayers.sort(
            //     (a, b) => zIndexMap[a.category] - zIndexMap[b.category],
            // )

            // for (const layer of requestedLayers) {
            //     const matchingAsset = getLayerIfEarned(assetData, layer)
            //     if (matchingAsset) {
            //         const image = await loadImage(matchingAsset.pngLink)
            //         ctx.drawImage(image, 0, 0, 2400, 2400)
            //     }
            // }

            // // upload the image to IPFS, return hash
            // const ipfsUrl = await addToIpfsFromBuffer(
            //     canvas.toBuffer('image/png'),
            // )

            // add a new nftMetadata record
            await ctx.prisma.nftMetadata.create({
                data: {
                    userId: member.id,
                    projectSlug,
                    tokenId: existingNftData?.tokenId || null,
                    name: `${member.firstName}'s ${project.name} Avatar`,
                    description: `${member.firstName}'s ${project.name} Avatar, part of the ${project.organization.name} exclusive collection of Earnable Avatars`,
                    walletAddress: member.address,
                    image: 'todo url', // TODO
                    network,
                    traits: {
                        connect: approvedTraits.map((t) => {
                            return { id: t.id }
                        }),
                    },
                    traitHash: hashTraits(approvedTraits),
                },
            })

            return signature
        }),
})
