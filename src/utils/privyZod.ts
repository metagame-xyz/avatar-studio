import { z } from 'zod'

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
