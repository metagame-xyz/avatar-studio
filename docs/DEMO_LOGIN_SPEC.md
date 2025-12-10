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
| Wallet | removed
| NFT Minting | Simulated (instant "mint" to localStorage) |
| Achievements | Pre-populated demo achievements (already in Supabase DB) |
| Project | Hardcoded to **CDMX Axolotls** (`cdmx-axolotls`) |

---

## Hardcoded Project: CDMX Axolotls

The demo site is locked to a single project: **CDMX Axolotls** (slug: `cdmx-axolotls`).

### Why CDMX Axolotls?
- Contains 7 trait categories with 38 traits - enough variety for a compelling demo
- Has 5 achievement categories for demonstrating the unlock system
- No existing member data to conflict with demo users
- Distinct, visually appealing theme

### Implementation

```typescript
// src/constants/demo.ts
export const DEMO_PROJECT_SLUG = 'cdmx-axolotls'
export const DEMO_PROJECT_NAME = 'CDMX Axolotls'
```

### Routing Changes

All project-specific routes redirect to the demo project:

| Current Route | Demo Behavior |
|---------------|---------------|
| `/` | Landing page with "Try Demo" button |
| `/home` | Redirects to `/project/cdmx-axolotls` |
| `/project/[project]` | Only `cdmx-axolotls` is accessible; others redirect to demo project |
| `/project/[project]/edit-avatar` | Only works for `cdmx-axolotls` |

### Page Simplification

Remove multi-project navigation entirely:
- Remove project selector/switcher components
- Remove organization views
- Remove admin/settings pages
- Landing page → "Try Demo" → directly to Axolotl avatar editor

```typescript
// Simplified routing in pages/index.tsx
const handleDemoLogin = () => {
  login()
  router.push(`/project/${DEMO_PROJECT_SLUG}`)
}
```

---

## Architecture

### 1. Demo User Identity

**Approach**: Generate a persistent anonymous user ID on first visit, and lets them set their own display name

```typescript
// src/utils/demoUser.ts
interface DemoUser {
  id: string           // UUID, generated once and persisted
  displayName: string  // form to set their name
  createdAt: string    // ISO timestamp
}

const DEMO_USER_KEY = 'avatar-studio-demo-user'

export function getDemoUser(): DemoUser {
  const stored = localStorage.getItem(DEMO_USER_KEY)
  if (stored) return JSON.parse(stored)

  const newUser: DemoUser = {
    id: crypto.randomUUID(),
    displayName: '', // from a form they can set it in
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
| `pages/index.tsx` | Replace Privy `login()` with demo login; redirect to `cdmx-axolotls` on login |
| `pages/home.tsx` | Remove entirely or redirect to `/project/cdmx-axolotls` |
| `pages/_app.tsx` | Remove PrivyProvider, add DemoProvider |
| `pages/project/[project]/index.tsx` | Enforce `cdmx-axolotls` only; use demo achievements |
| `pages/project/[project]/edit-avatar.tsx` | Enforce `cdmx-axolotls` only; remove wagmi, use demo state |

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

- Database remains for trait/project definitions
- Only user data moves to localStorage
- Most flexible, minimal changes to trait loading

---

## API & Backend Changes

### 11. tRPC Router Modifications (dont remove if not needed, the less changes the better)

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

**No longer required**: (but dont remove, its fine to just leave there)
```
PRIVY_APP_SECRET
VALIDATOR_PRIVATE_KEY
ALCHEMY_NOTIFY_TOKEN
EVENT_FORWARDER_AUTH_TOKEN
AIRTABLE_CLIENT_SECRET
WEBHOOK_PASSWORD
```

**Still required**
```
DATABASE_URL
DIRECT_URL
METAGAME_AWS_* 
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

### Phase 5: Demo Features
- [ ] Add pre-populated demo achievements
- [ ] Add achievement trigger system
- [ ] Add demo mode banner/indicators
- [ ] Add "Reset Demo" functionality

### Phase 6: Testing & Polish
- [ ] Test full demo flow end-to-end vs playright mcp
- [ ] Test localStorage persistence across sessions
- [ ] Test "Reset Demo" clears everything properly
- [ ] Verify no console errors from removed dependencies
