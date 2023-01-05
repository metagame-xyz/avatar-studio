import { router } from '../trpc'
import { authRouter } from './auth'
import { exampleRouter } from './example'
import { memberRouter } from './member'

export const appRouter = router({
    example: exampleRouter,
    auth: authRouter,
    member: memberRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
