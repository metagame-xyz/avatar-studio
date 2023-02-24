import type { PrismaClient, TraitCategory } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { getS3LayersFolderUrl } from './constants';
import type { TraitWithCategory } from './types';

cloudinary.config({
  cloud_name: 'your_cloud_name',
  api_key: 'your_api_key',
  api_secret: 'your_api_secret',
});

const cloudinaryFoldersSchema = z.record(z.array(z.string()));
type CloudinaryFolders = z.infer<typeof cloudinaryFoldersSchema>;

export async function getTraitCategoriesAndNames(
  projectSlug: string
): Promise<CloudinaryFolders> {
    
  const cloudinaryResponse = await cloudinary.api.resources_by_asset_folder(`nft-images/${projectSlug}/Layers`)
  const result: CloudinaryFolders = {};

  cloudinaryResponse.resources.forEach((resource) => {
    // get the file name
    const fileName = resource.public_id.split('/').pop() as string;
    // take the last folder name as the key
    const traitCategory = resource.public_id.split('/').slice(-2)[0] as string;

    if (!result[traitCategory]) {
      result[traitCategory] = [fileName];
    } else {
      result[traitCategory]?.push(fileName);
    }
  });

  return result;
}

export const getFromCloudinary = async (
  prisma: PrismaClient,
  projectSlug: string
): Promise<{
  traitCategories: TraitCategory[];
  traits: TraitWithCategory[];
}> => {
  const project = await prisma.project.findUnique({
    where: {
      slug: projectSlug,
    },
    include: {
      organization: true,
    },
  });

  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }
