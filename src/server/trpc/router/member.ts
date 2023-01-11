import { z } from 'zod'

import { protectedProcedure, publicProcedure, router } from '../trpc'
import type { AuthTokenClaims } from '@privy-io/server-auth'
import { PrivyClient } from '@privy-io/server-auth'
import { env as clientEnv } from 'env/client.mjs'
import { env as serverEnv } from 'env/server.mjs'
import { Account } from '@prisma/client'
import { privyUserZ } from 'utils/privyZod'

const privy = new PrivyClient(
    clientEnv.NEXT_PUBLIC_PRIVY_APP_ID,
    serverEnv.PRIVY_APP_SECRET,
)

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
    acceptOrgInvitation: protectedProcedure
        .input(z.object({ organizationId: z.number(), role: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.session) return null

            const { address } = await ctx.prisma.user.findUniqueOrThrow({
                where: { id: ctx.session.userId },
                select: { address: true },
            })

            if (!address) return null

            const orgInvite =
                await ctx.prisma.organizationInvitation.findFirstOrThrow({
                    where: {
                        status: 'PENDING',
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
                    data: { status: 'ACCEPTED' },
                }),
            ])

            return user
        }),
})
