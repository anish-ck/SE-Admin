import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storeCertificateHashBatch, getExplorerUrl } from '@/lib/blockchain'

// This endpoint processes the blockchain queue
// Should be called by a cron job or webhook
export async function POST(request: NextRequest) {
    // Verify this is an authorized request (e.g., from cron or admin)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.POLYGON_PRIVATE_KEY) {
        return NextResponse.json(
            { error: 'Blockchain not configured - POLYGON_PRIVATE_KEY missing' },
            { status: 500 }
        )
    }

    if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
        return NextResponse.json(
            { error: 'Blockchain not configured - CONTRACT_ADDRESS missing' },
            { status: 500 }
        )
    }

    try {
        const supabase = await createClient()

        // Get pending items from queue
        const { data: pendingItems, error: fetchError } = await supabase
            .from('blockchain_queue')
            .select('*')
            .eq('status', 'pending')
            .lt('attempts', 3)
            .limit(50)

        if (fetchError) {
            throw fetchError
        }

        if (!pendingItems || pendingItems.length === 0) {
            return NextResponse.json({ message: 'No pending items', processed: 0 })
        }

        // Update status to processing
        const queueIds = pendingItems.map((item: { id: string }) => item.id)
        await supabase
            .from('blockchain_queue')
            .update({ status: 'processing' })
            .in('id', queueIds)

        // Get unique hashes
        const hashes = pendingItems.map((item: { payload_hash: string }) => item.payload_hash)

        try {
            // Store hashes on blockchain
            const txHash = await storeCertificateHashBatch(hashes)
            const now = new Date().toISOString()

            // Update queue items
            await supabase
                .from('blockchain_queue')
                .update({
                    status: 'confirmed',
                    tx_hash: txHash,
                    processed_at: now,
                })
                .in('id', queueIds)

            // Update certificates with tx hash
            for (const item of pendingItems) {
                await supabase
                    .from('certificates')
                    .update({
                        blockchain_tx_hash: txHash,
                        blockchain_stored_at: now,
                    })
                    .eq('id', item.certificate_id)
            }

            return NextResponse.json({
                success: true,
                processed: pendingItems.length,
                txHash,
                explorerUrl: getExplorerUrl(txHash),
            })

        } catch (blockchainError: any) {
            // Mark as failed
            await supabase
                .from('blockchain_queue')
                .update({
                    status: 'pending',
                    attempts: pendingItems[0].attempts + 1,
                    last_error: blockchainError.message,
                })
                .in('id', queueIds)

            throw blockchainError
        }

    } catch (err: any) {
        console.error('Blockchain store error:', err)
        return NextResponse.json(
            { error: 'Failed to store on blockchain', message: err.message },
            { status: 500 }
        )
    }
}

// Get queue status
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: stats, error } = await supabase
            .from('blockchain_queue')
            .select('status')

        if (error) throw error

        const statusCounts = (stats || []).reduce((acc: Record<string, number>, item: { status: string }) => {
            acc[item.status] = (acc[item.status] || 0) + 1
            return acc
        }, {})

        return NextResponse.json({
            pending: statusCounts['pending'] || 0,
            processing: statusCounts['processing'] || 0,
            confirmed: statusCounts['confirmed'] || 0,
            failed: statusCounts['failed'] || 0,
        })

    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        )
    }
}
