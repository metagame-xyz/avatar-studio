import { hashMessage } from '@ethersproject/hash'
import slugifyFn from 'slugify'
import type { TraitWithEarnedBool } from './types'

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

export const cleanPfpStateForSubmission = (pfpState: TraitWithEarnedBool[]) =>
    pfpState.map((trait) => {
        return { name: trait.name, category: trait.category }
    })

export const springAnimation = {
    duration: 0.1,
    type: 'spring',
    stiffness: 100,
    damping: 15,
    mass: 1,
}

export const truncateAddress = (address: string): string =>
    `0x${address.slice(2, 6).toUpperCase()}...${address
        .slice(-4)
        .toUpperCase()}`

export const hashTraits = (traits: TraitWithEarnedBool[]): string => {
    const traitString = traits
        .filter((t) => !t.isModifiable)
        .map((trait) => `${trait.category}-${trait.name}`)
        .sort()
        .join('')
    return hashMessage(traitString)
}
