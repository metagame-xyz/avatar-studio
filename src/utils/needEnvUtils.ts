import { clientEnv } from 'env/schema.mjs'
import { ethers, providers } from 'ethers'
import { isAddress } from 'utils'

export async function getAddressFromString(addressString: string): Promise<string> {
    const lowercaseAddress = addressString.toLowerCase().trim()
    try {
        if (ethers.utils.isAddress(lowercaseAddress)) {
            // If the string is a valid EVM address, return it
            return lowercaseAddress
        }

        // within a long string that might have multiple words, pull out the word that includes .eth in it
        const ensRegex = /(\w+\.eth)/g
        const ensMatch = lowercaseAddress.match(ensRegex)
        if (!ensMatch) {
            throw new Error(`Invalid address or ENS name: ${lowercaseAddress}`)
        }

        // if (!lowercaseAddress.endsWith('.eth')) {
        //     // If the string does not end with ".eth", it's not a valid ENS name
        //     throw new Error(`Invalid address or ENS name: ${lowercaseAddress}`)
        // }

        // Otherwise, assume it's an ENS name and attempt to resolve it
        const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)
        const resolvedAddress = await provider.resolveName(ensMatch[0])
        if (!resolvedAddress) {
            throw new Error(`Could not resolve ENS name: ${ensMatch[0]}`)
        } else {
            return resolvedAddress
        }
    } catch (e) {
        // If it's not a valid ENS name, throw an error
        console.log(`Could not resolve ENS name: ${lowercaseAddress}`)
        throw e
    }
}

export const getEns = async (address: string): Promise<string | null> => {
    if (!isAddress(address)) return null

    const provider = new providers.AlchemyProvider('homestead', clientEnv.NEXT_PUBLIC_ALCHEMY_PROJECT_ID)
    const ens = await provider.lookupAddress(address)
    return ens
}
