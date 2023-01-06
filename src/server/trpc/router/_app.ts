import { router } from '../trpc'
import { authRouter } from './auth'
import { exampleRouter } from './example'
import { memberRouter } from './member'
import { organizationRouter } from './organization'

export const appRouter = router({
    example: exampleRouter,
    auth: authRouter,
    member: memberRouter,
    org: organizationRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
