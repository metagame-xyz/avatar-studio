// LocalStorage utility functions for demo mode

import {
  DEMO_USER_KEY,
  DEMO_SELECTED_TRAITS_KEY,
  DEMO_UNLOCKED_TRAITS_KEY,
  DEMO_ACHIEVEMENTS_KEY,
  DEMO_AVATAR_STATE_KEY,
  DEMO_LOGGED_IN_KEY,
} from './constants'
import type { DemoUser, DemoAchievement, ComposedAvatarState } from './types'

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined'

// Demo User functions
export function getDemoUser(): DemoUser | null {
  if (!isBrowser) return null

  const stored = localStorage.getItem(DEMO_USER_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as DemoUser
    } catch {
      return null
    }
  }
  return null
}

export function createDemoUser(): DemoUser {
  const newUser: DemoUser = {
    id: crypto.randomUUID(),
    displayName: '',
    createdAt: new Date().toISOString(),
  }
  if (isBrowser) {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser))
  }
  return newUser
}

export function getOrCreateDemoUser(): DemoUser {
  const existing = getDemoUser()
  if (existing) return existing
  return createDemoUser()
}

export function updateDemoUser(updates: Partial<DemoUser>): DemoUser | null {
  const existing = getDemoUser()
  if (!existing) return null

  const updated = { ...existing, ...updates }
  if (isBrowser) {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated))
  }
  return updated
}

// Login state functions
export function isDemoLoggedIn(): boolean {
  if (!isBrowser) return false
  return localStorage.getItem(DEMO_LOGGED_IN_KEY) === 'true'
}

export function setDemoLoggedIn(value: boolean): void {
  if (!isBrowser) return
  localStorage.setItem(DEMO_LOGGED_IN_KEY, value.toString())
}

// Selected traits functions
export function getSelectedTraits(): Record<string, string> {
  if (!isBrowser) return {}

  const stored = localStorage.getItem(DEMO_SELECTED_TRAITS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as Record<string, string>
    } catch {
      return {}
    }
  }
  return {}
}

export function setSelectedTraits(traits: Record<string, string>): void {
  if (!isBrowser) return
  localStorage.setItem(DEMO_SELECTED_TRAITS_KEY, JSON.stringify(traits))
}

export function selectTrait(categoryId: string, traitId: string): Record<string, string> {
  const traits = getSelectedTraits()
  traits[categoryId] = traitId
  setSelectedTraits(traits)
  return traits
}

// Unlocked traits functions
export function getUnlockedTraits(): string[] {
  if (!isBrowser) return []

  const stored = localStorage.getItem(DEMO_UNLOCKED_TRAITS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as string[]
    } catch {
      return []
    }
  }
  return []
}

export function setUnlockedTraits(traitIds: string[]): void {
  if (!isBrowser) return
  localStorage.setItem(DEMO_UNLOCKED_TRAITS_KEY, JSON.stringify(traitIds))
}

export function unlockTrait(traitId: string): string[] {
  const traits = getUnlockedTraits()
  if (!traits.includes(traitId)) {
    traits.push(traitId)
    setUnlockedTraits(traits)
  }
  return traits
}

// Achievements functions
export function getAchievements(): DemoAchievement[] {
  if (!isBrowser) return []

  const stored = localStorage.getItem(DEMO_ACHIEVEMENTS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as DemoAchievement[]
    } catch {
      return []
    }
  }
  return []
}

export function setAchievements(achievements: DemoAchievement[]): void {
  if (!isBrowser) return
  localStorage.setItem(DEMO_ACHIEVEMENTS_KEY, JSON.stringify(achievements))
}

export function grantAchievement(achievement: DemoAchievement): DemoAchievement[] {
  const achievements = getAchievements()
  const exists = achievements.find((a) => a.id === achievement.id)
  if (!exists) {
    achievements.push(achievement)
    setAchievements(achievements)

    // Also unlock associated traits
    for (const traitId of achievement.traitIds) {
      unlockTrait(traitId)
    }
  }
  return achievements
}

// Avatar state functions
export function getAvatarState(): ComposedAvatarState | null {
  if (!isBrowser) return null

  const stored = localStorage.getItem(DEMO_AVATAR_STATE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as ComposedAvatarState
    } catch {
      return null
    }
  }
  return null
}

export function saveAvatarState(state: ComposedAvatarState): void {
  if (!isBrowser) return
  localStorage.setItem(DEMO_AVATAR_STATE_KEY, JSON.stringify(state))
}

// Clear all demo data
export function clearAllDemoData(): void {
  if (!isBrowser) return
  localStorage.removeItem(DEMO_USER_KEY)
  localStorage.removeItem(DEMO_SELECTED_TRAITS_KEY)
  localStorage.removeItem(DEMO_UNLOCKED_TRAITS_KEY)
  localStorage.removeItem(DEMO_ACHIEVEMENTS_KEY)
  localStorage.removeItem(DEMO_AVATAR_STATE_KEY)
  localStorage.removeItem(DEMO_LOGGED_IN_KEY)
}

// Logout (clears session but keeps data)
export function logoutDemo(): void {
  if (!isBrowser) return
  localStorage.removeItem(DEMO_LOGGED_IN_KEY)
}
