'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/alert'
import { Modal } from '@/components/modal'
import { computePayloadHash, type CertificatePayload } from '@/lib/hash'
import {
    Award,
    Users,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Hash
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Event, Attendance, Student, CertificateTemplate } from '@/lib/types'

interface Props {
    event: Event & { template: CertificateTemplate | null }
    attendance: (Attendance & { student: Student })[]
    userId: string
    alreadyIssued: number
}

export function IssueCertificatesClient({ event, attendance, userId, alreadyIssued }: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [completed, setCompleted] = useState(false)

    const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'College Name'

    const handleIssueCertificates = async () => {
        setShowConfirmModal(false)
        setLoading(true)
        setError('')
        setProgress({ current: 0, total: attendance.length })

        const certificates = []
        const now = new Date().toISOString()

        try {
            // Generate certificates for each attendee
            for (let i = 0; i < attendance.length; i++) {
                const record = attendance[i]
                const student = record.student

                // Get next certificate number
                const { data: certNumData } = await supabase.rpc('generate_certificate_number')
                const certificateNumber = certNumData || `CERT-${Date.now()}-${i}`

                // Build canonical payload
                const payload: CertificatePayload = {
                    certificate_number: certificateNumber,
                    student_name: student.name,
                    student_roll: student.student_id,
                    event_name: event.name,
                    event_date: event.event_date,
                    institution_name: institutionName,
                    issued_at: now,
                }

                // Compute hash
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
                    issued_by: userId,
                    issued_at: now,
                })

                setProgress({ current: i + 1, total: attendance.length })
            }

            // Bulk insert certificates and get back inserted IDs
            const { data: insertedCerts, error: insertError } = await supabase
                .from('certificates')
                .insert(certificates)
                .select('id, payload_hash')

            if (insertError) {
                throw insertError
            }

            // Add to blockchain queue with actual certificate IDs
            if (insertedCerts && insertedCerts.length > 0) {
                const queueItems = insertedCerts.map((cert: { id: string; payload_hash: string }) => ({
                    certificate_id: cert.id,
                    payload_hash: cert.payload_hash,
                    status: 'pending',
                }))

                await supabase
                    .from('blockchain_queue')
                    .insert(queueItems)

                // Trigger blockchain processing via server action
                try {
                    const certIds = insertedCerts.map((c: { id: string }) => c.id)
                    const res = await fetch('/api/blockchain/store', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ certificateIds: certIds }),
                    })
                    if (!res.ok) {
                        console.warn('Blockchain store returned:', res.status)
                    }
                } catch (e) {
                    // Non-critical — can retry from certificate detail page
                    console.warn('Auto blockchain store trigger failed:', e)
                }
            }

            // Update event status
            await supabase
                .from('events')
                .update({
                    status: 'certificates_issued',
                    certificates_issued_at: now,
                })
                .eq('id', event.id)

            // Log audit
            await supabase.rpc('log_audit', {
                p_action: 'certificate_issued',
                p_resource_type: 'event',
                p_resource_id: event.id,
                p_details: {
                    count: certificates.length,
                    event_name: event.name
                }
            })

            setCompleted(true)
            setLoading(false)

        } catch (err: any) {
            setError(err.message || 'Failed to issue certificates')
            setLoading(false)
        }
    }

    if (completed) {
        return (
            <main className="p-4">
                <div className="card text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Certificates Issued!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {attendance.length} certificates have been generated and are being processed for blockchain storage.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push(`/certificates?event=${event.id}`)}
                            className="btn-primary w-full"
                        >
                            View Certificates
                        </button>
                        <button
                            onClick={() => router.push(`/events/${event.id}`)}
                            className="btn-secondary w-full"
                        >
                            Back to Event
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    if (attendance.length === 0) {
        return (
            <main className="p-4">
                <div className="card text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="h-8 w-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {alreadyIssued > 0 ? 'All Certificates Issued' : 'No Attendees'}
                    </h2>
                    <p className="text-gray-600 mb-4">
                        {alreadyIssued > 0
                            ? `${alreadyIssued} certificates have already been issued for this event.`
                            : 'No attendance records found for this event.'}
                    </p>
                    <button
                        onClick={() => router.push(`/events/${event.id}`)}
                        className="btn-secondary"
                    >
                        Back to Event
                    </button>
                </div>
            </main>
        )
    }

    return (
        <main className="p-4 space-y-4">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {/* Event Info */}
            <div className="card">
                <h2 className="font-bold text-gray-900 mb-1">{event.name}</h2>
                <p className="text-sm text-gray-500">{formatDate(event.event_date)}</p>
                {event.template && (
                    <p className="text-sm text-primary-600 mt-2">
                        Template: {event.template.name}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                    <Users className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{attendance.length}</div>
                    <div className="text-sm text-gray-500">To Issue</div>
                </div>
                <div className="card text-center">
                    <Award className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{alreadyIssued}</div>
                    <div className="text-sm text-gray-500">Already Issued</div>
                </div>
            </div>

            {/* Attendee Preview */}
            <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3">Recipients</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {attendance.slice(0, 10).map((record) => (
                        <div
                            key={record.id}
                            className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg"
                        >
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                                {record.student?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                    {record.student?.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {record.student?.student_id}
                                </div>
                            </div>
                        </div>
                    ))}
                    {attendance.length > 10 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                            +{attendance.length - 10} more
                        </p>
                    )}
                </div>
            </div>

            {/* Issue Button */}
            <button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading}
                className="btn-success w-full"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Issuing... ({progress.current}/{progress.total})
                    </>
                ) : (
                    <>
                        <Award className="h-5 w-5 mr-2" />
                        Issue {attendance.length} Certificates
                    </>
                )}
            </button>

            {/* Progress */}
            {loading && (
                <div className="card">
                    <div className="flex items-center gap-3 mb-2">
                        <Hash className="h-5 w-5 text-primary-600" />
                        <span className="text-sm font-medium">Generating hashes...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        {progress.current} of {progress.total} certificates
                    </p>
                </div>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Issue Certificates"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            This will generate <strong>{attendance.length} certificates</strong> with unique hashes.
                            The hashes will be queued for blockchain storage.
                        </div>
                    </div>

                    <div className="text-center py-4">
                        <Award className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-gray-900">{attendance.length}</div>
                        <div className="text-gray-500">Certificates to issue</div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleIssueCertificates}
                            className="btn-success flex-1"
                        >
                            Issue Certificates
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    )
}
