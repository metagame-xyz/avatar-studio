# Avatar Studio - Node/Vercel Upgrade Notes

## Current State
- **Vercel Project**: `avatar-studio` on team `metagame-xyz`
- **Current Vercel Node Version**: 18.x
- **Production URL**: https://robonova.shefi.org

## Vercel Supported Node Versions (as of Dec 2024)
- Node 18.x (maintenance LTS until April 2025)
- Node 20.x (active LTS - recommended)
- Node 22.x (current LTS)

## Validation Results (Node 18.19.0)

### Status: WORKING

All checks pass on Node 18.19.0:
- [x] `yarn install` - Success (peer dep warnings only)
- [x] `yarn type-check` - Success
- [x] `yarn lint` - Success (warnings only, no errors)
- [x] `yarn build` - Success (26s build time)

### Minor Warnings to Note
1. **Peer dependency warnings** - Common for older packages, non-blocking
2. **ESLint warnings** - Unused variables and `any` types, non-blocking
3. **Browserslist outdated** - Can update with `npx browserslist@latest --update-db`

## Conclusion

The app **works on Node 18.x** which Vercel still supports. No breaking changes needed to deploy.

### Optional Future Improvements
- Consider upgrading to Node 20.x (LTS) for longer support
- Update Next.js from 13.0.2 to a newer 13.x or 14.x
- Update wagmi from 0.12.7 to current version
- Update browserslist database

## Testing Commands
```bash
# Switch to Node 18 (add .nvmrc for team consistency)
nvm use 18

# Install deps
yarn install

# Type check
yarn type-check

# Build
yarn build
```
