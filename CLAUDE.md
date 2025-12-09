# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (starts Next.js dev server with localtunnel)
yarn dev

# Build
yarn build

# Type checking and linting
yarn type-check        # TypeScript type checking
yarn lint              # ESLint
yarn format            # Prettier formatting
yarn check             # Runs type-check, lint, and format

# Database
yarn dev-db-studio     # Prisma Studio for dev database (port 5556)
yarn prod-db-studio    # Prisma Studio for prod database (port 5557)
yarn reset-dev-db      # Reset dev database with migrations
yarn push-dev-db       # Push schema to dev database
```

## Architecture Overview

This is a T3 Stack application (Next.js + tRPC + Prisma + Tailwind) for managing NFT avatars with achievement-based trait unlocking.

### Core Data Flow

**Organizations → Projects → Members → Achievements → Traits → NFT Metadata**

- Organizations contain multiple Projects
- Projects have trait categories (e.g., "Background", "Hat") with individual traits
- Members earn Achievements through on-chain activity or Airtable-synced data
- Achievements unlock Traits that compose into NFT avatar images
- NftMetadata stores the final composed avatar state per member

### tRPC Router Structure (`src/server/trpc/`)

- `trpc.ts` - Defines middleware and procedure types:
  - `publicProcedure` - No auth required
  - `protectedProcedure` - Requires Privy authentication
  - `protectedOrgProcedure` - Requires org admin role
  - `protectedProjectProcedure` - Requires project's org admin role
  - `protectedMetagameAdminProcedure` - Requires METAGAME_ADMIN/OWNER role
- `router/_app.ts` - Combines all routers: member, org, project, trait, nftMetadata, achievement

### Authentication

Uses Privy for authentication with wagmi for wallet connections. Users are identified by `privyDID` (Privy's decentralized identifier).

### External Integrations

- **Airtable**: Syncs member achievements via OAuth. Projects can configure Airtable bases to pull achievement data.
- **Alchemy**: Webhook handlers for on-chain NFT mint events
- **AWS S3**: Stores trait images and composed avatar PNGs
- **Quirrel**: Background job processing for cron tasks

### API Routes (`src/pages/api/`)

- `/api/trpc/[trpc]` - tRPC endpoint
- `/api/metadata/[...params]` - NFT metadata endpoint (ERC-721 tokenURI)
- `/api/airtable/webhook` - Airtable webhook receiver
- `/api/alchemy/webhook` - Alchemy NFT mint webhook
- `/api/cron/*` - Quirrel cron jobs for Airtable auth refresh and webhook management

### Environment Variables

Schema defined in `src/env/schema.mjs`. Key variables:
- `DATABASE_URL` / `DIRECT_URL` - Prisma database connection
- `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_SECRET` - Privy auth
- `NEXT_PUBLIC_ALCHEMY_PROJECT_ID` - Blockchain provider
- Airtable OAuth credentials for achievement syncing

### Path Aliases

`tsconfig.json` sets `baseUrl: "src"`, so imports use absolute paths from src:
```typescript
import { trpc } from 'utils/trpc'
import { env } from 'env/client.mjs'
```
