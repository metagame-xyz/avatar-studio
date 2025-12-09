# Demo Site Login Spec

## Overview

Convert Avatar Studio from a full Privy/Ethereum-authenticated application to a demo site that:
- Requires no real authentication or wallet connection
- Persists user choices in browser storage (localStorage)
- Removes all Ethereum/blockchain interactions
- Provides a seamless demo experience showcasing the avatar composition features

---

## Current State Summary

| Component | Current Implementation |
|-----------|----------------------|
| Authentication | Privy (wallet, email, social OAuth) |
| Session | JWT tokens via Privy, verified server-side |
| User Data | PostgreSQL via Prisma |
| Wallet | wagmi hooks (`useAccount`, `useSignMessage`, etc.) |
| NFT Minting | On-chain contract calls with signatures |
| Achievements | Airtable sync + on-chain activity |

---

## Target State

| Component | Demo Implementation |
|-----------|---------------------|
| Authentication | None required (anonymous demo user) |
| Session | Browser-only (no server verification) |
| User Data | localStorage with JSON serialization |
| Wallet | Mock/simulated (no real connections) |
| NFT Minting | Simulated (instant "mint" to localStorage) |
| Achievements | Pre-populated demo achievements |

---

## Architecture

### 1. Demo User Identity

**Approach**: Generate a persistent anonymous user ID on first visit.

```typescript
// src/utils/demoUser.ts
interface DemoUser {
  id: string           // UUID, generated once and persisted
  displayName: string  // "Demo User" or user-customizable
  createdAt: string    // ISO timestamp
}

const DEMO_USER_KEY = 'avatar-studio-demo-user'

export function getDemoUser(): DemoUser {
  const stored = localStorage.getItem(DEMO_USER_KEY)
  if (stored) return JSON.parse(stored)

  const newUser: DemoUser = {
    id: crypto.randomUUID(),
    displayName: 'Demo User',
    createdAt: new Date().toISOString()
  }
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser))
  return newUser
}
```

### 2. Local Storage Schema

**Key structure**:
```
avatar-studio-demo-user        → DemoUser object
avatar-studio-selected-traits  → Record<traitCategoryId, traitId>
avatar-studio-unlocked-traits  → string[] (trait IDs)
avatar-studio-achievements     → DemoAchievement[]
avatar-studio-avatar-state     → ComposedAvatarState
```

**Type definitions**:
```typescript
// src/types/demo.ts
interface DemoAchievement {
  id: string
  name: string
  description: string
  unlockedAt: string  // ISO timestamp
  traitIds: string[]  // Traits unlocked by this achievement
}

interface ComposedAvatarState {
  projectSlug: string
  selectedTraits: Record<string, string>  // categoryId → traitId
  composedImageUrl: string | null         // Base64 data URL or null
  lastUpdatedAt: string
}

interface DemoStorage {
  user: DemoUser
  selectedTraits: Record<string, string>
  unlockedTraits: string[]
  achievements: DemoAchievement[]
  avatarState: ComposedAvatarState | null
}
```

### 3. Demo Context Provider

Replace `PrivyProvider` with a demo context:

```typescript
// src/contexts/DemoContext.tsx
interface DemoContextValue {
  user: DemoUser
  isLoggedIn: boolean
  login: () => void           // Sets isLoggedIn = true
  logout: () => void          // Clears session (keeps data)
  clearAllData: () => void    // Full reset

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
```

---

## Component Changes

### 4. Entry Flow (No-Auth Demo)

**Option A: Auto-login on visit**
- User lands on site → automatically "logged in" as demo user
- No login button needed
- Show "You're using demo mode" banner

**Option B: Soft login prompt**
- Landing page shows "Try Demo" button
- Clicking creates/retrieves demo user
- Gives sense of "logging in" without real auth

**Recommended**: Option B - provides familiar UX while being frictionless.

### 5. Pages to Modify

| Page | Changes Required |
|------|------------------|
| `pages/index.tsx` | Replace Privy `login()` with demo login |
| `pages/home.tsx` | Read from localStorage instead of tRPC |
| `pages/_app.tsx` | Remove PrivyProvider, add DemoProvider |
| `pages/project/[project]/index.tsx` | Use demo achievements |
| `pages/project/[project]/edit-avatar.tsx` | Remove wagmi, use demo state |

### 6. Navbar Changes

```typescript
// Current: Shows wallet address, ENS name, logout
// Demo: Shows "Demo User", optional name edit, logout

// Remove:
- useAccount()
- useEnsName()
- useEnsAvatar()
- useSwitchNetwork()

// Add:
- useDemoContext()
- Display demo user name
- "Clear Data" option in menu
```

### 7. Edit Avatar Page Simplification

**Remove entirely**:
- Wallet connection checks
- Network switching
- Message signing (`useSignMessage`)
- Contract preparation (`usePrepareContractWrite`)
- Contract writes (`useContractWrite`)
- Alchemy webhook handling
- Signature generation API calls

**Replace with**:
```typescript
// Simulated "mint" function
const handleMint = () => {
  // Compose the avatar image client-side (or use pre-composed)
  const composedImage = composeTraits(selectedTraits)

  // Save to localStorage
  saveAvatarState({
    projectSlug,
    selectedTraits,
    composedImageUrl: composedImage,
    lastUpdatedAt: new Date().toISOString()
  })

  // Show success UI
  setMintComplete(true)
}
```

---

## Data Strategy

### 8. Demo Project & Traits

**Option A: Hardcoded demo data**
- Ship a demo project with traits baked into the codebase
- No database needed at all
- Simplest, but inflexible

**Option B: Static JSON files**
- Export current project/trait data to JSON
- Load from `/public/demo-data/` at runtime
- Easy to update without code changes

**Option C: Keep read-only database**
- Database remains for trait/project definitions
- Only user data moves to localStorage
- Most flexible, minimal changes to trait loading

**Recommended**: Option C - preserves existing trait management while simplifying user data.

### 9. Pre-populated Achievements

Provide a set of demo achievements users can "earn" by exploring:

```typescript
const DEMO_ACHIEVEMENTS: DemoAchievement[] = [
  {
    id: 'demo-welcome',
    name: 'Welcome Explorer',
    description: 'Started your demo journey',
    unlockedAt: '', // Set on grant
    traitIds: ['trait-basic-hat', 'trait-basic-bg']
  },
  {
    id: 'demo-customizer',
    name: 'Style Master',
    description: 'Customized 3 different trait categories',
    unlockedAt: '',
    traitIds: ['trait-gold-frame', 'trait-rare-eyes']
  },
  {
    id: 'demo-completionist',
    name: 'Completionist',
    description: 'Tried every trait category',
    unlockedAt: '',
    traitIds: ['trait-legendary-crown']
  }
]
```

### 10. Achievement Triggers

```typescript
// src/hooks/useDemoAchievements.ts
function useDemoAchievements() {
  const { achievements, grantAchievement, selectedTraits } = useDemoContext()

  useEffect(() => {
    // Grant "Welcome Explorer" on first trait selection
    if (Object.keys(selectedTraits).length > 0) {
      maybeGrant('demo-welcome')
    }

    // Grant "Style Master" after 3 categories
    if (Object.keys(selectedTraits).length >= 3) {
      maybeGrant('demo-customizer')
    }
  }, [selectedTraits])
}
```

---

## API & Backend Changes

### 11. tRPC Router Modifications

**Keep (read-only)**:
- `project.getBySlug` - Load project definitions
- `trait.getByProject` - Load available traits
- `trait.getCategories` - Load trait categories

**Remove or stub**:
- `member.me` - Replace with demo context
- `member.createOrUpdateUser` - Not needed
- `member.generateMintSignature` - Not needed
- `nftMetadata.*` - Use localStorage
- `achievement.*` - Use localStorage
- All webhook routes

### 12. Environment Simplification

**No longer required**:
```
PRIVY_APP_SECRET
VALIDATOR_PRIVATE_KEY
ALCHEMY_NOTIFY_TOKEN
EVENT_FORWARDER_AUTH_TOKEN
AIRTABLE_CLIENT_SECRET
WEBHOOK_PASSWORD
```

**Still required** (if keeping database for traits):
```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_ALCHEMY_PROJECT_ID  (for trait image URLs only)
METAGAME_AWS_*  (if S3 trait images stay)
```

---

## UI/UX Considerations

### 13. Demo Mode Indicators

Add clear visual indicators that this is demo mode:

```typescript
// Banner component
<DemoBanner>
  🎨 Demo Mode - Your changes are saved locally in this browser
  <button onClick={clearAllData}>Reset Demo</button>
</DemoBanner>
```

### 14. Persistence Notifications

Toast notifications for key actions:
- "Avatar saved to browser" (on trait changes)
- "Achievement unlocked!" (on earning achievements)
- "Demo reset complete" (on clearing data)

### 15. Export Option (Optional Enhancement)

Allow users to export their demo avatar:
```typescript
const exportAvatar = () => {
  const state = getAvatarState()
  // Download composed image as PNG
  // Or generate shareable link/data
}
```

---

## Migration Checklist

### Phase 1: Core Infrastructure
- [ ] Create `DemoContext` provider
- [ ] Create localStorage utility functions
- [ ] Create demo types (`src/types/demo.ts`)
- [ ] Set up demo user generation

### Phase 2: Remove Auth Dependencies
- [ ] Remove `PrivyProvider` from `_app.tsx`
- [ ] Remove `PrivyWagmiConnector`
- [ ] Remove Privy hooks from all components
- [ ] Remove wagmi hooks from all components
- [ ] Update Navbar to use demo context

### Phase 3: Page Updates
- [ ] Update `pages/index.tsx` landing page
- [ ] Update `pages/home.tsx` for demo mode
- [ ] Update `pages/project/[project]/index.tsx`
- [ ] Update `pages/project/[project]/edit-avatar.tsx`

### Phase 4: Backend Cleanup
- [ ] Remove or stub unused tRPC routes
- [ ] Remove webhook API routes
- [ ] Clean up environment variables
- [ ] Remove unused dependencies from package.json

### Phase 5: Demo Features
- [ ] Add pre-populated demo achievements
- [ ] Add achievement trigger system
- [ ] Add demo mode banner/indicators
- [ ] Add "Reset Demo" functionality

### Phase 6: Testing & Polish
- [ ] Test full demo flow end-to-end
- [ ] Test localStorage persistence across sessions
- [ ] Test "Reset Demo" clears everything properly
- [ ] Verify no console errors from removed dependencies

---

## Dependencies to Remove

```json
// package.json - can be removed
"@privy-io/react-auth": "...",
"@privy-io/wagmi-connector": "...",
"wagmi": "...",
"viem": "...",
"ethers": "...",  // if present
```

**Note**: If keeping any blockchain-related display (like showing trait rarity from contract metadata), some dependencies may need to stay as read-only utilities.

---

## Open Questions

1. **Trait images**: Are trait images stored in S3 or on-chain? If S3, the AWS credentials and public URLs should continue working. If on-chain (IPFS gateway), those should still work without auth.

2. **Multiple demo projects**: Should the demo support switching between multiple projects, or focus on a single showcase project?

3. **Avatar composition**: Is avatar composition done client-side or server-side? If server-side, that API route needs to remain functional (but can be made public/unauthenticated).

4. **Data export**: Do you want users to be able to export/share their demo avatar creations?

5. **Reset scope**: Should "Reset Demo" clear just user selections, or also reset unlocked achievements?

---

This spec provides a complete roadmap for converting Avatar Studio to a demo site. The core change is moving from server-authenticated user data to browser-persisted anonymous sessions, while preserving the visual avatar composition experience.
