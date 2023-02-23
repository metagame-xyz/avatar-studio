import type {
    Achievement,
    MemberAchievements,
    MembersOfProjects,
    NftMetadata,
    Organization,
    Project,
    Trait,
    TraitCategory,
    User,
} from '@prisma/client'
import { z } from 'zod'

export const toLowercaseFn = (x: string) => x.toLowerCase()
export const addressRegex = new RegExp(/^0x[a-fA-F0-9]{40}$/)
export const AddressZ = z.string().regex(addressRegex).startsWith('0x').transform(toLowercaseFn)

export const requestedTraitsSchema = z.array(z.object({ name: z.string(), category: z.string() }))
export type RequestedTraits = z.infer<typeof requestedTraitsSchema>

export type Signature = {
    r: `0x${string}`
    s: `0x${string}`
    _vs: string
    recoveryParam: number
    v: number
    yParityAndS: string
    compact: string
}

export type MostTypes = string | number | boolean | null | undefined

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never

export const enum Status {
    loading = 'loading',
    success = 'success',
    error = 'error',
    idle = 'idle',
}

export const enum ActionType {
    mint = 'Mint',
    update = 'Update',
}

export type ToastData = {
    open: boolean
    message: string
    type: Status
}

export type PfpUpdateRequest = TraitWithEarnedBool[]

export type ProfileIconSizeType = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type TraitWithEarnedBool = Trait & {
    earned: boolean
    category: string
    zIndex: number
    isModifiable: boolean
}

export type TraitCategoryWithTraitsWithEarned = TraitCategory & {
    traits: TraitWithEarnedBool[]
}

export type TraitCategoryWitTraits = TraitCategory & {
    traits: Trait[]
}

export type TraitWithCategory = Trait & {
    traitCategory: TraitCategory
}

export type NftMetadataWithTraits = NftMetadata & {
    traits: Trait[]
}

export type Attribute = {
    display_type?: string
    trait_type: string
    value: string | number | boolean
}

export type OpenSeaMetadata = {
    name: string
    description: string
    image: string
    external_url: string
    attributes: Attribute[]
}

export const enum LlamaTier {
    Traveler = 'Traveler',
    Explorer = 'Explorer',
    Mountaineer = 'Mountaineer',
    Rancher = 'Rancher',
}

export const traitCategorySchema = z.object({
    name: z.string(),
    zIndex: z.number(),
    isModifiable: z.boolean(),
    isDefaultAchieved: z.boolean(),
    projectId: z.number(),
})

export const traitSchema = z.object({
    id: z.number(),
    name: z.string(),
    pngUrl: z.string(),
    isDefaultAchieved: z.boolean().nullable(),
    achievementsRequiredDescription: z.string().nullable(),
    levelLogic: z.string().nullable(),
    levelRequired: z.number().nullable(),
    projectId: z.number(),
    traitCategoryName: z.string(),
    achievementCategoryId: z.number().nullable(),
})

export const traitWithEarnedBoolSchema = traitSchema.and(
    z.object({
        earned: z.boolean(),
        category: z.string(),
        zIndex: z.number(),
    }),
)

export const newAirtableMemberSchema = z
    .object({
        ['first-name']: z.string().optional(),
        ['last-name']: z.string().optional(),
        email: z.string().email().optional(),

        // add an option to expect any string as the key and any string as the value
    })
    .and(z.record(z.any()))

export type NewAirtableMember = z.infer<typeof newAirtableMemberSchema>

export const traitWithEarnedBoolArrSchema = z.array(traitWithEarnedBoolSchema)

export type MemberWithAProject = User & {
    projects: (MembersOfProjects & {
        project: Project & {
            traitCategories: (TraitCategory & {
                traits: Trait[]
            })[]
            organization: Organization
        }
    })[]
    achievements: (MemberAchievements & {
        achievement: Achievement & {
            traits: Trait[]
        }
    })[]
    nftMetadata: (NftMetadata & {
        traits: (Trait & {
            traitCategory: TraitCategory
        })[]
    })[]
}

export type AirtableAuthCache = {
    codeVerifier: string
    organizationSlug: string
}

export const organizationRoleZod = z.enum(['ADMIN', 'OWNER'])
