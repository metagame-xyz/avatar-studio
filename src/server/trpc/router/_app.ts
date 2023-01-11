import { router } from '../trpc'
import { authRouter } from './auth'
import { memberRouter } from './member'
import { organizationRouter } from './organization'

export const appRouter = router({
    auth: authRouter,
    member: memberRouter,
    org: organizationRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
