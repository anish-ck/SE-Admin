import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCertificateHash } from '@/lib/blockchain'
import { computePayloadHash, type CertificatePayload } from '@/lib/hash'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const certNumber = searchParams.get('cert')
    const hash = searchParams.get('hash')

    if (!certNumber && !hash) {
        return NextResponse.json(
            { error: 'Certificate number or hash required' },
            { status: 400 }
        )
    }

    try {
        const supabase = await createClient()

        let certificate
        if (certNumber) {
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .eq('certificate_number', certNumber.toUpperCase())
                .single()

            if (error || !data) {
                return NextResponse.json({
                    valid: false,
                    status: 'not_found',
                    message: 'Certificate not found'
                })
            }
            certificate = data
        } else if (hash) {
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .eq('payload_hash', hash)
                .single()

            if (error || !data) {
                return NextResponse.json({
                    valid: false,
                    status: 'not_found',
                    message: 'Certificate not found'
                })
            }
            certificate = data
        }

        // Recompute hash for verification
        const payload: CertificatePayload = {
            certificate_number: certificate.certificate_number,
            student_name: certificate.student_name,
            student_roll: certificate.student_roll,
            event_name: certificate.event_name,
            event_date: certificate.event_date,
            institution_name: certificate.institution_name,
            issued_at: certificate.issued_at,
        }

        const recomputedHash = computePayloadHash(payload)
        const hashMatches = recomputedHash.toLowerCase() === certificate.payload_hash.toLowerCase()

        if (!hashMatches) {
            return NextResponse.json({
                valid: false,
                status: 'hash_mismatch',
                message: 'Certificate data has been tampered with',
            })
        }

        // Check blockchain if contract is configured
        let blockchainVerified = false
        let blockchainData = null

        if (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
            try {
                const result = await verifyCertificateHash(certificate.payload_hash)
                blockchainVerified = result.exists
                blockchainData = {
                    exists: result.exists,
                    timestamp: result.formattedDate,
                    issuer: result.issuer,
                }
            } catch (err) {
                console.error('Blockchain verification error:', err)
            }
        }

        // Log verification
        await supabase.rpc('log_audit', {
            p_action: 'certificate_verified',
            p_resource_type: 'certificate',
            p_resource_id: certificate.id,
            p_details: {
                certificate_number: certificate.certificate_number,
                blockchain_verified: blockchainVerified
            }
        })

        return NextResponse.json({
            valid: true,
            status: blockchainVerified ? 'blockchain_verified' : 'hash_verified',
            certificate: {
                certificate_number: certificate.certificate_number,
                student_name: certificate.student_name,
                student_roll: certificate.student_roll,
                event_name: certificate.event_name,
                event_date: certificate.event_date,
                institution_name: certificate.institution_name,
                issued_at: certificate.issued_at,
            },
            hash: certificate.payload_hash,
            blockchain: blockchainData,
        })

    } catch (err: any) {
        console.error('Verification error:', err)
        return NextResponse.json(
            { error: 'Verification failed', message: err.message },
            { status: 500 }
        )
    }
}
