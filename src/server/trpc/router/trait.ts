import { env } from 'env/server.mjs'
import { getFromS3, getTraitCategoriesAndNames } from 'utils/s3'
import { z } from 'zod'
import { protectedProjectProcedure, publicProcedure, router } from '../trpc'

import * as AWS from 'aws-sdk'

AWS.config.update({
    accessKeyId: env.METAGAME_AWS_ACCESS_KEY,
    secretAccessKey: env.METAGAME_AWS_SECRET_ACCESS_KEY,
})

export const traitRouter = router({
    getFromS3: publicProcedure.input(z.string()).query(async ({ input }) => {
        return getTraitCategoriesAndNames(AWS, input)
    }),
    createFromS3: protectedProjectProcedure
        .input(z.object({ projectSlug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { projectSlug } = input

            await getFromS3(AWS, ctx.prisma, projectSlug)

            // return traits
        }),
})
