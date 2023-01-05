import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const brenner = await prisma.user.upsert({
        where: { address: '0x9d8395a406fa264dea71671c772269e844264e8c' },
        update: {},
        create: {
            address: '0x9d8395a406fa264dea71671c772269e844264e8c',
            email: 'blspear@gmail.com',
            accounts: {
                create: [
                    {
                        type: 'evm',
                        provider: 'ethereum',
                        providerAccountId:
                            '0x9d8395a406fa264dea71671c772269e844264e8c',
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
    const { organizations } = await prisma.user.update({
        where: { address: '0x9d8395a406fa264dea71671c772269e844264e8c' },
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

    console.log({ brenner, brassFactory, organizations })
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
