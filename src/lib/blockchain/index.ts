import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'
import { CERTIFICATE_REGISTRY_ABI } from './contract-abi'

// This module runs server-side only
// Private key is never exposed to client

export interface BlockchainVerificationResult {
    exists: boolean
    timestamp: number
    issuer: string
    formattedDate?: string
}

/**
 * Get a read-only provider for verification
 */
export function getProvider(): JsonRpcProvider {
    const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology'
    return new JsonRpcProvider(rpcUrl)
}

/**
 * Get a signer for write operations (server-side only)
 */
export function getSigner(): Wallet {
    const privateKey = process.env.POLYGON_PRIVATE_KEY
    if (!privateKey) {
        throw new Error('POLYGON_PRIVATE_KEY not configured')
    }
    const provider = getProvider()
    return new Wallet(privateKey, provider)
}

/**
 * Get the contract instance for reading
 */
export function getReadContract(): Contract {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    if (!contractAddress) {
        throw new Error('Contract address not configured')
    }
    const provider = getProvider()
    return new Contract(contractAddress, CERTIFICATE_REGISTRY_ABI, provider)
}

/**
 * Get the contract instance for writing (server-side only)
 */
export function getWriteContract(): Contract {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    if (!contractAddress) {
        throw new Error('Contract address not configured')
    }
    const signer = getSigner()
    return new Contract(contractAddress, CERTIFICATE_REGISTRY_ABI, signer)
}

/**
 * Store a single certificate hash on the blockchain
 */
export async function storeCertificateHash(hash: string): Promise<string> {
    const contract = getWriteContract()

    // Convert hex string to bytes32
    const hashBytes = hash.startsWith('0x') ? hash : `0x${hash}`

    const tx = await contract.storeCertificate(hashBytes)
    const receipt = await tx.wait()

    return receipt.hash
}

/**
 * Store multiple certificate hashes in a single transaction
 */
export async function storeCertificateHashBatch(hashes: string[]): Promise<string> {
    const contract = getWriteContract()

    // Convert all hashes to bytes32
    const hashBytes = hashes.map(h => h.startsWith('0x') ? h : `0x${h}`)

    const tx = await contract.storeCertificateBatch(hashBytes)
    const receipt = await tx.wait()

    return receipt.hash
}

/**
 * Verify a certificate hash on the blockchain
 */
export async function verifyCertificateHash(hash: string): Promise<BlockchainVerificationResult> {
    const contract = getReadContract()

    // Convert hex string to bytes32
    const hashBytes = hash.startsWith('0x') ? hash : `0x${hash}`

    const [exists, timestamp, issuer] = await contract.verifyCertificate(hashBytes)

    const timestampNum = Number(timestamp)

    return {
        exists,
        timestamp: timestampNum,
        issuer,
        formattedDate: timestampNum > 0
            ? new Date(timestampNum * 1000).toISOString()
            : undefined
    }
}

/**
 * Check if contract is configured and accessible
 */
export async function checkContractHealth(): Promise<boolean> {
    try {
        const contract = getReadContract()
        await contract.owner()
        return true
    } catch {
        return false
    }
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
    const explorer = process.env.NEXT_PUBLIC_POLYGON_EXPLORER || 'https://amoy.polygonscan.com'
    return `${explorer}/tx/${txHash}`
}
