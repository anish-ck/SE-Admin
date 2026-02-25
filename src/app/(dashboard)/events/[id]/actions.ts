'use server'

import { createClient } from '@/lib/supabase/server'
import { computePayloadHash, type CertificatePayload } from '@/lib/hash'
import { storeCertificateHashBatch, getExplorerUrl } from '@/lib/blockchain'

/**
 * Automatically issue certificates for all attendees of an event
 * and store hashes on the blockchain in one step.
 * Called automatically after attendance is locked.
 */
export async function autoIssueCertificates(eventId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get event details
    const { data: event, error: eventErr } = await supabase
        .from('events')
        .select('id, name, event_date, template_id')
        .eq('id', eventId)
        .single()

    if (eventErr || !event) return { error: 'Event not found' }

    // Get all attendance records with student details
    const { data: attendance, error: attErr } = await supabase
        .from('attendance')
        .select('id, student_id, students(id, name, student_id)')
        .eq('event_id', eventId)
        .eq('status', 'present')

    if (attErr) return { error: attErr.message }
    if (!attendance || attendance.length === 0) return { error: 'No attendance records found' }

    // Check how many already have certificates
    const { data: existing } = await supabase
        .from('certificates')
        .select('student_id')
        .eq('event_id', eventId)

    const alreadyIssuedIds = new Set((existing || []).map((c: { student_id: string }) => c.student_id))
    const toIssue = attendance.filter((a: any) => !alreadyIssuedIds.has(a.student_id))

    if (toIssue.length === 0) return { message: 'All certificates already issued', processed: 0 }

    const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'College Name'
    const now = new Date().toISOString()
    const certificates = []

    for (const record of toIssue) {
        const student = (record as any).students

        // Generate unique certificate number
        const { data: certNumData } = await supabase.rpc('generate_certificate_number')
        const certificateNumber = certNumData || `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

        const payload: CertificatePayload = {
            certificate_number: certificateNumber,
            student_name: student.name,
            student_roll: student.student_id,
            event_name: event.name,
            event_date: event.event_date,
            institution_name: institutionName,
            issued_at: now,
        }

        const payloadHash = computePayloadHash(payload)

        certificates.push({
            certificate_number: certificateNumber,
            event_id: event.id,
            student_id: student.id,
            attendance_id: record.id,
            student_name: student.name,
            student_roll: student.student_id,
            event_name: event.name,
            event_date: event.event_date,
            institution_name: institutionName,
            payload_hash: payloadHash,
            template_id: event.template_id,
            issued_by: user.id,
            issued_at: now,
        })
    }

    // Bulk insert certificates
    const { data: insertedCerts, error: insertErr } = await supabase
        .from('certificates')
        .insert(certificates)
        .select('id, payload_hash')

    if (insertErr) return { error: insertErr.message }
    if (!insertedCerts || insertedCerts.length === 0) return { error: 'Certificate insert returned no rows' }

    // Update event status
    await supabase
        .from('events')
        .update({ status: 'certificates_issued', certificates_issued_at: now })
        .eq('id', eventId)

    // Store on blockchain if configured
    let blockchainResult: { txHash?: string; explorerUrl?: string; error?: string } = {}

    const privateKey = process.env.POLYGON_PRIVATE_KEY
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

    if (privateKey && privateKey !== 'your-wallet-private-key' && contractAddress) {
        try {
            const hashes = insertedCerts.map((c: { payload_hash: string }) => c.payload_hash)
            const txHash = await storeCertificateHashBatch(hashes)
            const storedAt = new Date().toISOString()

            // Update certificates with tx hash
            for (const cert of insertedCerts) {
                await supabase
                    .from('certificates')
                    .update({ blockchain_tx_hash: txHash, blockchain_stored_at: storedAt })
                    .eq('id', cert.id)
            }

            // Insert queue entries as confirmed
            await supabase.from('blockchain_queue').insert(
                insertedCerts.map((cert: { id: string; payload_hash: string }) => ({
                    certificate_id: cert.id,
                    payload_hash: cert.payload_hash,
                    status: 'confirmed',
                    tx_hash: txHash,
                    processed_at: storedAt,
                }))
            )

            blockchainResult = { txHash, explorerUrl: getExplorerUrl(txHash) }
        } catch (err: any) {
            // Non-fatal — certificates are saved, blockchain can be retried
            blockchainResult = { error: err.message }

            // Insert queue entries as pending for retry
            await supabase.from('blockchain_queue').insert(
                insertedCerts.map((cert: { id: string; payload_hash: string }) => ({
                    certificate_id: cert.id,
                    payload_hash: cert.payload_hash,
                    status: 'pending',
                }))
            )
        }
    } else {
        // Blockchain not configured — queue for later
        await supabase.from('blockchain_queue').insert(
            insertedCerts.map((cert: { id: string; payload_hash: string }) => ({
                certificate_id: cert.id,
                payload_hash: cert.payload_hash,
                status: 'pending',
            }))
        )
        blockchainResult = { error: 'Blockchain not configured — stored in queue' }
    }

    // Audit log
    await supabase.rpc('log_audit', {
        p_action: 'certificate_issued_auto',
        p_resource_type: 'event',
        p_resource_id: eventId,
        p_details: {
            count: insertedCerts.length,
            event_name: event.name,
            blockchain_tx: blockchainResult.txHash || null,
        }
    })

    return {
        success: true,
        issued: insertedCerts.length,
        blockchain: blockchainResult,
    }
}
