import { router } from '../trpc'
import { memberRouter } from './member'
import { organizationRouter } from './organization'
import { projectRouter } from './project'
import { traitRouter } from './trait'

export const appRouter = router({
    member: memberRouter,
    org: organizationRouter,
    project: projectRouter,
    trait: traitRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
