import { z } from 'zod'

const linkedAccountTypeSchema = z.union([
    z.literal('wallet'),
    z.literal('email'),
    z.literal('phone'),
    z.literal('google_oauth'),
    z.literal('twitter_oauth'),
    z.literal('discord_oauth'),
    z.literal('github_oauth'),
])

const linkMetadataSchema = z.object({
    type: linkedAccountTypeSchema,
    verifiedAt: z.date(),
})

const walletSchema = z.object({
    address: z.string(),
    chainType: z.union([z.literal('ethereum'), z.literal('solana')]),
    chainId: z.string().optional(),
    // walletClient: z.union([z.literal('privy'), z.literal('unknown')]),
})

const emailSchema = z.object({
    address: z.string(),
})

const phoneSchema = z.object({
    number: z.string(),
})

const googleSchema = z.object({
    subject: z.string(),
    email: z.string(),
    name: z.string().nullable(),
})

const twitterSchema = z.object({
    subject: z.string(),
    username: z.string().nullable(),
    name: z.string().nullable(),
})

const discordSchema = z.object({
    subject: z.string(),
    username: z.string().nullable(),
    email: z.string().nullable(),
})

const githubSchema = z.object({
    subject: z.string(),
    username: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
})

const appleSchema = z.object({
    subject: z.string(),
    email: z.string().nullable(),
})

const emailWithMetadataSchema = linkMetadataSchema.extend(emailSchema.shape).extend({
    type: z.literal('email'),
})

const phoneWithMetadataSchema = linkMetadataSchema.extend(phoneSchema.shape).extend({
    type: z.literal('phone'),
})

const walletWithMetadataSchema = linkMetadataSchema.extend(walletSchema.shape).extend({
    type: z.literal('wallet'),
})

const googleOAuthWithMetadataSchema = linkMetadataSchema.extend(googleSchema.shape).extend({
    type: z.literal('google_oauth'),
})

const twitterOAuthWithMetadataSchema = linkMetadataSchema.extend(twitterSchema.shape).extend({
    type: z.literal('twitter_oauth'),
})

const discordOAuthWithMetadataSchema = linkMetadataSchema.extend(discordSchema.shape).extend({
    type: z.literal('discord_oauth'),
})

const githubOAuthWithMetadataSchema = linkMetadataSchema.extend(githubSchema.shape).extend({
    type: z.literal('github_oauth'),
})

const appleOAuthWithMetadataSchema = linkMetadataSchema.extend(appleSchema.shape).extend({
    type: z.literal('apple_oauth'),
})

const linkedAccountWithMetadataSchema = z.union([
    walletWithMetadataSchema,
    emailWithMetadataSchema,
    phoneWithMetadataSchema,
    googleOAuthWithMetadataSchema,
    twitterOAuthWithMetadataSchema,
    discordOAuthWithMetadataSchema,
    githubOAuthWithMetadataSchema,
    appleOAuthWithMetadataSchema,
])

export type LinkedAccountWithMetadata = z.infer<typeof linkedAccountWithMetadataSchema>

export const privyUserZ = z.object({
    id: z.string(),
    createdAt: z.date(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    wallet: walletSchema.optional(),
    google: googleSchema.optional(),
    twitter: twitterSchema.optional(),
    discord: discordSchema.optional(),
    github: githubSchema.optional(),
    linkedAccounts: z.array(linkedAccountWithMetadataSchema),
})
