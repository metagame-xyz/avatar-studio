import * as AWS from 'aws-sdk'
import { env } from 'env/server.mjs'
import { z } from 'zod'

AWS.config.update({
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3()

const S3FoldersSchema = z.record(z.array(z.string()))
type S3Folders = z.infer<typeof S3FoldersSchema>

export async function getTraitCategoriesAndNames(
    projectSlug: string,
): Promise<S3Folders> {
    const result: S3Folders = {}

    const params = {
        Bucket: 'metagame-xyz',
        Prefix: `nft-images/${projectSlug}/Layers`,
    }

    const data = await s3.listObjectsV2(params).promise()
    const files = data.Contents

    files?.forEach((file) => {
        // get the file name
        const traitName = file.Key?.split('/').pop()?.split('.')[0] as string
        // take the last folder name as the key
        const traitCategory = file.Key?.split('/').slice(-2)[0] as string

        if (!result[traitCategory]) {
            result[traitCategory] = [traitName]
        } else {
            result[traitCategory]?.push(traitName)
        }
    })
    return result
}
