import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const metagameAddress = '0x9d8395a406fa264dea71671c772269e844264e8c'
async function main() {
    const brenner = await prisma.user.upsert({
        where: { address: metagameAddress },
        update: {},
        create: {
            address: metagameAddress,
            email: 'brenner@themetagame.xyz',
            accounts: {
                create: [
                    {
                        type: 'evm',
                        provider: 'ethereum',
                        providerAccountId: metagameAddress,
                    },
                ],
            },
            firstName: 'Brenner',
            lastName: 'Spear',
        },
    })
    const brassFactory = await prisma.organization.upsert({
        where: { slug: 'brass-factory-blockchain-club' },
        update: {},
        create: {
            name: 'Brass Factory Blockchain Club',
            slug: 'brass-factory-blockchain-club',
        },
    })
    const haabGoblins = await prisma.organization.upsert({
        where: { slug: 'haab-goblins-crypto-club' },
        update: {},
        create: {
            name: 'Haab Goblins Crypto Club',
            slug: 'haab-goblins-crypto-club',
        },
    })
    const { organizations } = await prisma.user.update({
        where: { address: metagameAddress },
        data: {
            organizations: {
                create: [
                    {
                        organizationId: brassFactory.id,
                        role: 'OWNER',
                    },
                ],
            },
        },
        include: {
            organizations: true,
        },
    })

    const invitation = await prisma.organizationInvitation.create({
        data: {
            organizationId: haabGoblins.id,
            inviteeAddress: metagameAddress,
            role: 'OWNER',
            issuedById: brenner.id,
        },
    })
    const acceptedInvitation = await prisma.organizationInvitation.create({
        data: {
            organizationId: brassFactory.id,
            inviteeAddress: metagameAddress,
            role: 'OWNER',
            issuedById: brenner.id,
            status: 'ACCEPTED',
        },
    })

    console.log({ brenner, brassFactory, organizations, invitation })
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
