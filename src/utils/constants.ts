// Metagame specific constants
export const EVENT_FORWARDER_AUTH_TOKEN_HEADER = 'x-event-forwarder-auth-token'
export const THE_METAGAME_ETH_ADDRESS = '0x902A37155438982884ca26A5DBccf73f5ae8194b'

export const INFURA_IPFS_PROJECT_ID_HEADER = `x-ipfs-project-id`
export const INFURA_IPFS_SECRET_HEADER = `x-ipfs-project-secret`

// Prod vs Dev constants
export const isProdEnv = process.env.NODE_ENV === 'production'
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'goerli'
export const networkStrings = getNetworkString(NETWORK)

type NetworkStrings = {
    alchemy: string
    ethers: string
    etherscan: string
    etherscanAPI: string
    polygonscanAPI: string
    opensea: string
    openseaAPI: string
    web3Modal: string
    networkId?: number
}

function getNetworkString(network: string): NetworkStrings {
    const defaultStrings = {
        alchemy: `eth-${network}.`,
        ethers: network,
        etherscan: `${network}.`,
        etherscanAPI: `api-${network}.`,
        polygonscanAPI: `api-testnet.`,
        opensea: 'testnets.',
        openseaAPI: `testnets-api.`,
        web3Modal: network,
    }

    switch (network.toLowerCase()) {
        case 'ethereum':
        case 'mainnet':
        case 'homestead':
            return {
                alchemy: 'eth-mainnet.',
                ethers: 'homestead',
                etherscan: '',
                etherscanAPI: 'api.',
                polygonscanAPI: 'api.',
                opensea: '',
                openseaAPI: 'api.',
                web3Modal: 'mainnet',
                networkId: 1,
            }
        case 'goerli':
            return { ...defaultStrings, networkId: 5 }
        default:
            return defaultStrings
    }
}

export const s3BaseFolderUrl = 'https://metagame-xyz.s3.us-east-1.amazonaws.com/nft-images/'
export const s3AcceleratedFolderUrl = 'https://metagame-xyz.s3-accelerate.amazonaws.com/nft-images/'

export const cloudfrontFolderUrl = 'https://d17y9jhu28q4cz.cloudfront.net/nft-images/'

export const getS3LayersFolderUrl = (project: string): string => `${s3BaseFolderUrl}${project}/Layers/`

export const getCloudfrontLayersFolderUrl = (project: string): string => `${cloudfrontFolderUrl}${project}/Layers/`

export const getS3CompleteImagesFolderUrlForUpload = (project: string): string =>
    `${s3AcceleratedFolderUrl}${project}/complete-images/`

export const getCloudfrontCompleteImagesFolderUrl = (project: string): string =>
    `${cloudfrontFolderUrl}${project}/complete-images/`

export const getR2LayersFolderUrl = (project: string): string =>
    `https://pub-f973221ec7dc4a44b71a25a1c673e6e8.r2.dev/${project}/Layers/`

export const getTwicPicFolderUrl = (project: string): string =>
    `https://metagame.twic.pics/nft-images/${project}/Layers/`

export type ProductionNetworks = 'ethereum' | 'polygon' | 'fantom' | 'avalanche'

// export const networkScanAPIKeys = {
// ethereum: ETHERSCAN_API_KEY,
// polygon: POLYGONSCAN_API_KEY,
// fantom: FTMSCAN_API_KEY, // fantom
// avalanche: SNOWTRACE_API_KEY, // avalanche
// }

export const productionNetworkApiURLs = {
    ethereum: 'api.etherscan.io',
    polygon: 'api.polygonscan.com',
    fantom: 'api.ftmscan.com',
    avalanche: 'api.snowtrace.io',
}

export const blackholeAddress = '0x0000000000000000000000000000000000000000'

export const slackErrorsChannelId = ''

// export const etherscanUrl = `https://${networkStrings.etherscan}etherscan.io/address/${}`
export const twitterUrl = 'https://twitter.com/Metagame'
export const openseaUrl = `https://opensea.io/collection/`
