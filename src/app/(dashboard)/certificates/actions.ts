'use server'

import { createClient } from '@/lib/supabase/server'
import { storeCertificateHashBatch, storeCertificateHash, getExplorerUrl } from '@/lib/blockchain'

/**
 * Store certificate hashes on the blockchain.
 * Handles both queued items and orphaned certificates (no queue entry).
 */
export async function storeOnBlockchain(certificateIds?: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    if (!process.env.POLYGON_PRIVATE_KEY || process.env.POLYGON_PRIVATE_KEY === 'your-wallet-private-key') {
        return { error: 'Blockchain not configured — set POLYGON_PRIVATE_KEY in .env' }
    }

    if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
        return { error: 'Blockchain not configured — set CONTRACT_ADDRESS in .env' }
    }

    try {
        // If specific certificate IDs provided, store those directly
        if (certificateIds && certificateIds.length > 0) {
            const { data: certs, error: fetchErr } = await supabase
                .from('certificates')
                .select('id, payload_hash')
                .in('id', certificateIds)
                .is('blockchain_tx_hash', null)

            if (fetchErr) throw fetchErr
            if (!certs || certs.length === 0) {
                return { message: 'No pending certificates found', processed: 0 }
            }

            const hashes = certs.map(c => c.payload_hash)
            const txHash = await storeCertificateHashBatch(hashes)
            const now = new Date().toISOString()

            // Update certificates with tx hash
            for (const cert of certs) {
                await supabase
                    .from('certificates')
                    .update({
                        blockchain_tx_hash: txHash,
                        blockchain_stored_at: now,
                    })
                    .eq('id', cert.id)
            }

            // Also update any matching blockchain_queue entries
            await supabase
                .from('blockchain_queue')
                .update({
                    status: 'confirmed',
                    tx_hash: txHash,
                    processed_at: now,
                })
                .in('certificate_id', certs.map(c => c.id))

            return {
                success: true,
                processed: certs.length,
                txHash,
                explorerUrl: getExplorerUrl(txHash),
            }
        }

        // Otherwise, process all pending certificates (no tx hash)
        const { data: pendingCerts, error: pendingErr } = await supabase
            .from('certificates')
            .select('id, payload_hash')
            .is('blockchain_tx_hash', null)
            .limit(50)

        if (pendingErr) throw pendingErr
        if (!pendingCerts || pendingCerts.length === 0) {
            return { message: 'No pending certificates', processed: 0 }
        }

        const hashes = pendingCerts.map(c => c.payload_hash)
        const txHash = await storeCertificateHashBatch(hashes)
        const now = new Date().toISOString()

        for (const cert of pendingCerts) {
            await supabase
                .from('certificates')
                .update({
                    blockchain_tx_hash: txHash,
                    blockchain_stored_at: now,
                })
                .eq('id', cert.id)
        }

        // Update any matching queue entries
        await supabase
            .from('blockchain_queue')
            .update({
                status: 'confirmed',
                tx_hash: txHash,
                processed_at: now,
            })
            .in('certificate_id', pendingCerts.map(c => c.id))

        return {
            success: true,
            processed: pendingCerts.length,
            txHash,
            explorerUrl: getExplorerUrl(txHash),
        }

    } catch (err: any) {
        console.error('Blockchain store error:', err)
        return { error: err.message || 'Failed to store on blockchain' }
    }
}

/**
 * Store a single certificate hash on blockchain
 */
export async function storeSingleOnBlockchain(certificateId: string) {
    return storeOnBlockchain([certificateId])
}
