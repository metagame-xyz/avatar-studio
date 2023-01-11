import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const metagameAddress = '0x9d8395a406fa264dea71671c772269e844264e8c'
const privyDID_1 = 'did:privy:clcqu9l350001m908u2ojo5gc'
const brennerEmail = 'brenner@themetagame.xyz'
async function main() {
    const brenner = await prisma.user.create({
        data: {
            address: metagameAddress,
            email: brennerEmail,
            id: privyDID_1,
            accounts: {
                create: [
                    {
                        type: 'wallet',
                        address: metagameAddress,
                        chainType: 'ethereum',
                    },
                    {
                        type: 'email',
                        address: brennerEmail,
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

    const brassBuddies = await prisma.project.upsert({
        where: { slug: 'brass-buddies' },
        update: {},
        create: {
            name: 'Brass Buddies',
            slug: 'brass-buddies',
            organizationId: brassFactory.id,
        },
    })

    // console.log({ brenner, brassFactory, organizations, invitation })
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
