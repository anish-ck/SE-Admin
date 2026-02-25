'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/alert'
import { Modal } from '@/components/modal'
import {
    CheckCircle,
    Unlock,
    Lock,
    Award,
    Users,
    Loader2,
    AlertTriangle
} from 'lucide-react'
import type { EventStatus } from '@/lib/types'
import { autoIssueCertificates } from './actions'

interface EventActionsProps {
    eventId: string
    status: EventStatus
    canAuthorize: boolean
    canOpenAttendance: boolean
    canLockAttendance: boolean
    canIssueCertificates: boolean
    attendanceCount: number
}

export function EventActions({
    eventId,
    status,
    canAuthorize,
    canOpenAttendance,
    canLockAttendance,
    canIssueCertificates,
    attendanceCount,
}: EventActionsProps) {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showLockModal, setShowLockModal] = useState(false)

    const handleAuthorize = async () => {
        setLoading(true)
        setError('')

        const { error: rpcError } = await supabase.rpc('authorize_event', {
            p_event_id: eventId
        })

        if (rpcError) {
            setError(rpcError.message)
            setLoading(false)
            return
        }

        setSuccess('Event authorized successfully!')
        setLoading(false)
        router.refresh()
    }

    const handleOpenAttendance = async () => {
        setLoading(true)
        setError('')

        const { error: rpcError } = await supabase.rpc('open_attendance', {
            p_event_id: eventId
        })

        if (rpcError) {
            setError(rpcError.message)
            setLoading(false)
            return
        }

        setSuccess('Attendance is now open!')
        setLoading(false)
        router.refresh()
    }

    const handleLockAttendance = async () => {
        setLoading(true)
        setError('')

        const { error: rpcError } = await supabase.rpc('lock_attendance', {
            p_event_id: eventId
        })

        if (rpcError) {
            setError(rpcError.message)
            setLoading(false)
            return
        }

        setShowLockModal(false)
        setSuccess('Attendance locked! Issuing certificates and storing on blockchain...')

        // Automatically issue certificates and store on blockchain
        try {
            const result = await autoIssueCertificates(eventId)
            if (result.error) {
                setSuccess('Attendance locked!')
                setError(`Certificate auto-issue failed: ${result.error}`)
            } else if (result.blockchain?.error) {
                setSuccess(`Attendance locked! ${result.issued} certificates issued. Blockchain: ${result.blockchain.error}`)
            } else {
                setSuccess(`Attendance locked! ${result.issued} certificates issued and stored on blockchain.`)
            }
        } catch (e: any) {
            setSuccess('Attendance locked!')
            setError(`Auto-issue error: ${e.message}`)
        }

        setLoading(false)
        router.refresh()
    }

    return (
        <div className="space-y-3">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            {/* Authorize Button */}
            {canAuthorize && (
                <button
                    onClick={handleAuthorize}
                    disabled={loading}
                    className="btn-primary w-full"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Authorize Event
                </button>
            )}

            {/* Open Attendance Button */}
            {canOpenAttendance && (
                <button
                    onClick={handleOpenAttendance}
                    disabled={loading}
                    className="btn-success w-full"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        <Unlock className="h-5 w-5 mr-2" />
                    )}
                    Open Attendance
                </button>
            )}

            {/* Manage Attendance Link */}
            {status === 'attendance_open' && (
                <Link
                    href={`/attendance?event=${eventId}`}
                    className="btn-primary w-full"
                >
                    <Users className="h-5 w-5 mr-2" />
                    Manage Attendance
                </Link>
            )}

            {/* Lock Attendance Button */}
            {canLockAttendance && (
                <button
                    onClick={() => setShowLockModal(true)}
                    disabled={loading}
                    className="btn-danger w-full"
                >
                    <Lock className="h-5 w-5 mr-2" />
                    Lock Attendance ({attendanceCount} attendees)
                </button>
            )}

            {/* Issue Certificates Link */}
            {canIssueCertificates && (
                <Link
                    href={`/certificates/issue?event=${eventId}`}
                    className="btn-success w-full"
                >
                    <Award className="h-5 w-5 mr-2" />
                    Issue Certificates ({attendanceCount})
                </Link>
            )}

            {/* View Certificates Link */}
            {status === 'certificates_issued' && (
                <Link
                    href={`/certificates?event=${eventId}`}
                    className="btn-primary w-full"
                >
                    <Award className="h-5 w-5 mr-2" />
                    View Certificates
                </Link>
            )}

            {/* Lock Confirmation Modal */}
            <Modal
                isOpen={showLockModal}
                onClose={() => setShowLockModal(false)}
                title="Lock Attendance"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-800">
                            <strong>Warning:</strong> This action is irreversible. Once locked, no more attendance can be marked.
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Award className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            Certificates will be <strong>automatically issued</strong> and stored on the blockchain for all {attendanceCount} attendees.
                        </div>
                    </div>

                    <div className="text-center py-4">
                        <div className="text-4xl font-bold text-gray-900">{attendanceCount}</div>
                        <div className="text-gray-500">Total Attendees</div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowLockModal(false)}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleLockAttendance}
                            disabled={loading}
                            className="btn-danger flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                'Lock & Issue Certificates'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
