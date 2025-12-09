# Avatar Studio - Node/Vercel Upgrade Notes

## Current State
- **Vercel Project**: `avatar-studio` on team `metagame-xyz`
- **Current Vercel Node Version**: 18.x (NEEDS UPDATE)
- **Production URL**: https://robonova.shefi.org

## Vercel Supported Node Versions (as of Dec 2025)

Source: [Vercel Node.js Versions Docs](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

| Version | Status |
|---------|--------|
| **24.x** | Default for new projects |
| **22.x** | Supported |
| **20.x** | Supported (recommended for this project) |
| 18.x | **DEPRECATED Sept 1, 2025** - will be disabled |

See also: [Node.js 18 Deprecation Notice](https://vercel.com/changelog/node-js-18-is-being-deprecated)

## Action Required

**The project must be upgraded from Node 18.x to Node 20.x (or higher)** before September 1, 2025 or deployments will fail.

## Validation Results (Node 20.17.0)

### Status: WORKING

All checks pass on Node 20.17.0:
- [x] `yarn install` - Success (peer dep warnings only)
- [x] `yarn type-check` - Success
- [x] `yarn lint` - Success (warnings only, no errors)
- [x] `yarn build` - Success (16s build time)

No code changes required - the app works on Node 20.x as-is.

## To Deploy

1. Update Vercel project settings:
   - Go to [Vercel Dashboard](https://vercel.com) > avatar-studio > Settings
   - Build and Deployment > Node.js Version > Select **20.x**

2. Or add to `package.json`:
   ```json
   "engines": {
     "node": "20.x"
   }
   ```

## Files Changed
- `.nvmrc` - Set to `20` for local development consistency

## Minor Warnings (non-blocking)
1. **Peer dependency warnings** - Common for older packages
2. **ESLint warnings** - Unused variables and `any` types
3. **Browserslist outdated** - Can update with `npx browserslist@latest --update-db`

## Testing Commands
```bash
# Switch to Node 20
nvm use

# Install deps
yarn install

# Type check
yarn type-check

# Build
yarn build
```
