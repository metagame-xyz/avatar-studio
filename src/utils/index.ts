import { hashMessage } from '@ethersproject/hash'
import isEqual from 'lodash.isequal'
import slugifyFn from 'slugify'
import type { Chain } from 'wagmi'
import type { RequestedTraits, TraitWithEarnedBool } from './types'

export const classNamesFn = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ')
}

export const slugify = (name: string) => {
    return slugifyFn(name, {
        lower: true,
        strict: true,
        locale: 'en',
    })
}

export function areTraitsEqual(traits1: TraitWithEarnedBool[] | null, traits2: TraitWithEarnedBool[] | null): boolean {
    if (!traits1 || !traits2) return false

    traits1.sort((a, b) => a.id - b.id)
    traits2.sort((a, b) => a.id - b.id)
    for (let i = 0; i < traits1.length; i++) {
        if (traits1[i]?.id !== traits2[i]?.id) return false
    }
    return true
}

export const pfpStateToRequestedTraits = (pfpState: TraitWithEarnedBool[]): RequestedTraits =>
    pfpState.map((trait) => {
        return { name: trait.name, category: trait.category }
    }) as RequestedTraits

export const springAnimation = {
    duration: 0.1,
    type: 'spring',
    stiffness: 100,
    damping: 15,
    mass: 1,
}

export const truncateAddress = (address: string | null | undefined): string =>
    address ? `0x${address.slice(2, 6).toUpperCase()}...${address.slice(-4).toUpperCase()}` : ''

export const hashTraits = (traits: TraitWithEarnedBool[]): string => {
    const traitString = traits
        .filter((t) => !t.isModifiable)
        .map((trait) => `${trait.category}-${trait.name}`)
        .sort()
        .join('')
    return hashMessage(traitString)
}

export const IsNewComboAllowed = (
    isCategoryModifiable: boolean,
    usedCombos: Record<string, string>[] | undefined,
    pfpState: TraitWithEarnedBool[],
    newTrait: TraitWithEarnedBool,
): boolean => {
    if (!usedCombos) return true
    if (!newTrait.earned) return false
    if (isCategoryModifiable) return true

    // replace the trait for the category of the newTrait
    const newPfpState = pfpState
        .filter((trait) => !trait.isModifiable)
        .map((trait) => (trait.category === newTrait.category ? newTrait : trait))

    const combo: Record<string, string> = {}
    for (const trait of newPfpState) {
        combo[trait.category] = trait.name
    }

    // compare the newPfpState with the usedCombos
    return !usedCombos.some((usedCombo) => isEqual(combo, usedCombo))
}

export const isComboAllowed = (
    usedCombos: Record<string, string>[] | undefined,
    PfpState: TraitWithEarnedBool[],
): boolean => {
    if (!usedCombos) return true
    const combo: Record<string, string> = {}

    const permanentTraits = PfpState.filter((trait) => !trait.isModifiable)
    for (const trait of permanentTraits) {
        combo[trait.category] = trait.name
    }
    return !usedCombos.some((usedCombo) => isEqual(combo, usedCombo))
}

export const pageToLoad = (member: any): string => {
    if (member?.organizations?.length === 1) {
        return '/org/' + member.organizations[0].slug
    }
    if (member?.projects?.length === 1) {
        return '/project/' + member.projects[0].slug
    }
    return '/home'
}

export const getOpenseaUrl = (chain: Chain, contactAddress: string | null | undefined, tokenId?: number | null) => {
    if (!contactAddress || !tokenId) return null
    const testnetString = chain.testnet ? 'testnets.' : ''
    const chainName = chain.network.toLowerCase()
    return `https://${testnetString}opensea.io/assets/${chainName}/${contactAddress}/${tokenId}`
}
