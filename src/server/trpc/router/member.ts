import { z } from 'zod'

import { protectedProcedure, publicProcedure, router } from '../trpc'
import type { AuthTokenClaims, User as PrivyUser } from '@privy-io/server-auth'
import { PrivyClient } from '@privy-io/server-auth'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import { Account } from '@prisma/client'

const privy = new PrivyClient(
    clientEnv.NEXT_PUBLIC_PRIVY_APP_ID,
    serverEnv.PRIVY_APP_SECRET,
)

export const walletTypeSchema = z.union([
    z.literal('metamask'),
    z.literal('coinbase_wallet'),
    z.literal('wallet_connect'),
])

export const linkMetadataSchema = z.object({
    type: z.union([
        z.literal('wallet'),
        z.literal('email'),
        z.literal('phone'),
        z.literal('google_oauth'),
        z.literal('twitter_oauth'),
        z.literal('discord_oauth'),
    ]),
    verifiedAt: z.date(),
})

export const walletSchema = z.object({
    address: z.string(),
    chainType: z.union([z.literal('ethereum'), z.literal('solana')]),
    chainId: z.string().optional(),
    walletType: walletTypeSchema.optional(),
})

export const emailSchema = z.object({
    address: z.string(),
})

export const phoneSchema = z.object({
    number: z.string(),
})

export const googleSchema = z.object({
    subject: z.string(),
    email: z.string(),
    name: z.string().nullable(),
})

export const twitterSchema = z.object({
    subject: z.string(),
    username: z.string().nullable(),
    name: z.string().nullable(),
})

export const discordSchema = z.object({
    subject: z.string(),
    username: z.string().nullable(),
    email: z.string().nullable(),
})

export const emailWithMetadataSchema = linkMetadataSchema
    .extend(emailSchema.shape)
    .extend({
        type: z.literal('email'),
    })

export const phoneWithMetadataSchema = linkMetadataSchema
    .extend(phoneSchema.shape)
    .extend({
        type: z.literal('phone'),
    })

export const walletWithMetadataSchema = linkMetadataSchema
    .extend(walletSchema.shape)
    .extend({
        type: z.literal('wallet'),
    })

export const googleOAuthWithMetadataSchema = linkMetadataSchema
    .extend(googleSchema.shape)
    .extend({
        type: z.literal('google_oauth'),
    })

export const twitterOAuthWithMetadataSchema = linkMetadataSchema
    .extend(twitterSchema.shape)
    .extend({
        type: z.literal('twitter_oauth'),
    })

export const discordOAuthWithMetadataSchema = linkMetadataSchema
    .extend(discordSchema.shape)
    .extend({
        type: z.literal('discord_oauth'),
    })

export const privyUserZ = z.object({
    id: z.string(),
    createdAt: z.date(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    wallet: walletSchema.optional(),
    google: googleSchema.optional(),
    twitter: twitterSchema.optional(),
    discord: discordSchema.optional(),
    linkedAccounts: z.array(
        z.union([
            walletWithMetadataSchema,
            emailWithMetadataSchema,
            phoneWithMetadataSchema,
            googleOAuthWithMetadataSchema,
            twitterOAuthWithMetadataSchema,
            discordOAuthWithMetadataSchema,
        ]),
    ),
})

export const memberRouter = router({
    getByDID: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.user.findUnique({
                where: {
                    id: input.id,
                },
            })
        }),
    create: publicProcedure
        .input(z.object({ privyUser: privyUserZ, authToken: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { privyUser, authToken } = input

            // remove chainId and walletType keys if they exist, lowercase address
            const linkedAccountsClean = privyUser.linkedAccounts.map(
                (account) => {
                    if (account.type !== 'wallet') return account

                    account.address = account.address.toLowerCase()

                    delete account.chainId
                    delete account.walletType

                    return account
                },
            )

            let verifiedClaims: AuthTokenClaims

            try {
                verifiedClaims = await privy.verifyAuthToken(authToken || '')
                if (verifiedClaims.userId !== privyUser.id) {
                    throw new Error('User ID does not match')
                }
            } catch (error) {
                console.log(`Token verification failed with error ${error}.`)
                throw new Error('Token verification failed')
            }

            const user = await ctx.prisma.user.upsert({
                create: {
                    id: privyUser.id,
                    email: privyUser.email?.address,
                    address: privyUser.wallet?.address.toLowerCase(),
                    accounts: {
                        create: [...linkedAccountsClean],
                    },
                },
                update: {
                    address: privyUser.wallet?.address,
                },
                where: {
                    id: privyUser.id,
                },
                include: {
                    accounts: true,
                },
            })

            const existingPrivyAccounts = user.accounts

            // merge new PrivyAccounts with existing ones by type
            const mergedPrivyAccounts = linkedAccountsClean.map(
                (newAccount) => {
                    const existingAccount = existingPrivyAccounts.find(
                        (a) => a.type === newAccount.type,
                    )

                    if (!existingAccount) return newAccount as Account

                    return {
                        ...existingAccount,
                        ...newAccount,
                    } as Account
                },
            )

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
        const member = await ctx.prisma.user.findUniqueOrThrow({
            where: {
                id: ctx.session.userId,
            },
            include: {
                organizations: { include: { organization: true } },
                projects: { include: { project: true } },
                achievements: { include: { achievement: true } },
                invitations: { include: { organization: true } },
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
    // acceptOrgInvitation: protectedProcedure
    //     .input(z.object({ organizationId: z.number(), role: z.string() }))
    //     .mutation(async ({ ctx, input }) => {
    //         if (!ctx.address) return null

    //         const orgInvite =
    //             await ctx.prisma.organizationInvitation.findFirstOrThrow({
    //                 where: {
    //                     status: 'PENDING',
    //                     inviteeAddress: ctx.address,
    //                     organizationId: input.organizationId,
    //                     role: input.role,
    //                 },
    //             })

    //         const [user] = await ctx.prisma.$transaction([
    //             ctx.prisma.user.update({
    //                 where: {
    //                     address: ctx.address,
    //                 },
    //                 data: {
    //                     organizations: {
    //                         create: [
    //                             {
    //                                 organizationId: orgInvite.organizationId,
    //                                 role: orgInvite.role,
    //                             },
    //                         ],
    //                     },
    //                 },
    //             }),
    //             ctx.prisma.organizationInvitation.update({
    //                 where: {
    //                     organizationId_inviteeAddress_role: {
    //                         organizationId: orgInvite.organizationId,
    //                         inviteeAddress: ctx.address,
    //                         role: orgInvite.role,
    //                     },
    //                 },
    //                 data: { status: 'ACCEPTED' },
    //             }),
    //         ])

    //         return user
    //     }),
})
