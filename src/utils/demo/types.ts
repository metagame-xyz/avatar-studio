// Demo mode types for localStorage-based user state

export interface DemoUser {
  id: string // UUID, generated once and persisted
  displayName: string // user-settable name
  createdAt: string // ISO timestamp
}

export interface DemoAchievement {
  id: string
  name: string
  description: string
  unlockedAt: string // ISO timestamp
  traitIds: string[] // Traits unlocked by this achievement
}

export interface ComposedAvatarState {
  projectSlug: string
  selectedTraits: Record<string, string> // categoryId → traitId
  composedImageUrl: string | null // Base64 data URL or null
  lastUpdatedAt: string
}

export interface DemoStorage {
  user: DemoUser
  selectedTraits: Record<string, string>
  unlockedTraits: string[]
  achievements: DemoAchievement[]
  avatarState: ComposedAvatarState | null
}
