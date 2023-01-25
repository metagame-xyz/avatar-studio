import { env } from 'env/server.mjs'
import { ethers, Wallet } from 'ethers'
import { goerli, mainnet } from 'wagmi/chains'
import type { Signature } from './types'

export const createDomainSeparator = (
    name: string,
    contractAddress: string,
    network: string,
    tokenId = '1',
): string => {
    // tokenId is use for 1155s, where each tokenId has different mint requirements.
    // for 712s, tokenId is always 1.

    const networkId = network === 'mainnet' ? mainnet.id : goerli.id

    const DOMAIN_SEPARATOR = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'uint256', 'address'],
            [
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenId)),
                networkId,
                contractAddress,
            ],
        ),
    )

    return DOMAIN_SEPARATOR
}

export const generateSignature = async (address: string, domainSeparator: string) => {
    const signer = new Wallet(env.VALIDATOR_PRIVATE_KEY)

    const payloadHash = ethers.utils.defaultAbiCoder.encode(['bytes32', 'address'], [domainSeparator, address])
    const messageHash = ethers.utils.keccak256(payloadHash)

    const signedAddress = await signer.signMessage(ethers.utils.arrayify(messageHash))
    const signature: ethers.Signature = ethers.utils.splitSignature(signedAddress)
    return signature
}

export const generateMintingSignature = async (
    memberAddress: string,
    projectSlug: string,
    contractAddress: string,
    network: string,
): Promise<Signature> => {
    const domainSeparator = createDomainSeparator(projectSlug, contractAddress, network)
    const signature = await generateSignature(memberAddress, domainSeparator)
    return signature as Signature
}
