'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { DemoUser, DemoAchievement, ComposedAvatarState } from 'utils/demo/types'
import {
  getDemoUser,
  getOrCreateDemoUser,
  updateDemoUser,
  isDemoLoggedIn,
  setDemoLoggedIn,
  getSelectedTraits,
  selectTrait as selectTraitStorage,
  getUnlockedTraits,
  unlockTrait as unlockTraitStorage,
  getAchievements,
  grantAchievement as grantAchievementStorage,
  getAvatarState,
  saveAvatarState as saveAvatarStateStorage,
  clearAllDemoData,
  logoutDemo,
} from 'utils/demo/storage'

interface DemoContextValue {
  // User state
  user: DemoUser | null
  isLoggedIn: boolean
  ready: boolean

  // Auth actions
  login: () => void
  logout: () => void
  clearAllData: () => void
  updateDisplayName: (name: string) => void

  // Trait management
  selectedTraits: Record<string, string>
  selectTrait: (categoryId: string, traitId: string) => void
  unlockedTraits: string[]
  unlockTrait: (traitId: string) => void

  // Achievement management
  achievements: DemoAchievement[]
  grantAchievement: (achievement: DemoAchievement) => void

  // Avatar state
  avatarState: ComposedAvatarState | null
  saveAvatarState: (state: ComposedAvatarState) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [ready, setReady] = useState(false)
  const [selectedTraits, setSelectedTraits] = useState<Record<string, string>>({})
  const [unlockedTraits, setUnlockedTraits] = useState<string[]>([])
  const [achievements, setAchievements] = useState<DemoAchievement[]>([])
  const [avatarState, setAvatarState] = useState<ComposedAvatarState | null>(null)

  // Initialize state from localStorage on mount
  useEffect(() => {
    const storedUser = getDemoUser()
    const loggedIn = isDemoLoggedIn()

    if (storedUser) {
      setUser(storedUser)
    }
    setIsLoggedIn(loggedIn)
    setSelectedTraits(getSelectedTraits())
    setUnlockedTraits(getUnlockedTraits())
    setAchievements(getAchievements())
    setAvatarState(getAvatarState())
    setReady(true)
  }, [])

  const login = useCallback(() => {
    const demoUser = getOrCreateDemoUser()
    setUser(demoUser)
    setDemoLoggedIn(true)
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    logoutDemo()
    setIsLoggedIn(false)
  }, [])

  const clearAllData = useCallback(() => {
    clearAllDemoData()
    setUser(null)
    setIsLoggedIn(false)
    setSelectedTraits({})
    setUnlockedTraits([])
    setAchievements([])
    setAvatarState(null)
  }, [])

  const updateDisplayName = useCallback((name: string) => {
    const updated = updateDemoUser({ displayName: name })
    if (updated) {
      setUser(updated)
    }
  }, [])

  const selectTrait = useCallback((categoryId: string, traitId: string) => {
    const updated = selectTraitStorage(categoryId, traitId)
    setSelectedTraits(updated)
  }, [])

  const unlockTrait = useCallback((traitId: string) => {
    const updated = unlockTraitStorage(traitId)
    setUnlockedTraits(updated)
  }, [])

  const grantAchievement = useCallback((achievement: DemoAchievement) => {
    const updated = grantAchievementStorage(achievement)
    setAchievements(updated)
    // Also update unlocked traits since grantAchievementStorage unlocks them
    setUnlockedTraits(getUnlockedTraits())
  }, [])

  const saveAvatarState = useCallback((state: ComposedAvatarState) => {
    saveAvatarStateStorage(state)
    setAvatarState(state)
  }, [])

  const value: DemoContextValue = {
    user,
    isLoggedIn,
    ready,
    login,
    logout,
    clearAllData,
    updateDisplayName,
    selectedTraits,
    selectTrait,
    unlockedTraits,
    unlockTrait,
    achievements,
    grantAchievement,
    avatarState,
    saveAvatarState,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemoContext(): DemoContextValue {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider')
  }
  return context
}

// Alias for compatibility with existing Privy patterns
export function useDemo() {
  return useDemoContext()
}
