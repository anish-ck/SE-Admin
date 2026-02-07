'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/alert'
import { EmptyState } from '@/components/empty-state'
import { QRScanner } from './qr-scanner'
import {
    QrCode,
    Users,
    CheckCircle,
    Search,
    Loader2,
    Calendar
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Event, Student, Attendance } from '@/lib/types'

interface Props {
    events: Event[]
    initialEventId?: string
}

export function AttendanceClient({ events, initialEventId }: Props) {
    const supabase = createClient()

    const [selectedEventId, setSelectedEventId] = useState(initialEventId || '')
    const [showScanner, setShowScanner] = useState(false)
    const [attendanceList, setAttendanceList] = useState<(Attendance & { student: Student })[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [manualSearchResults, setManualSearchResults] = useState<Student[]>([])
    const [searchLoading, setSearchLoading] = useState(false)

    const loadAttendance = useCallback(async () => {
        if (!selectedEventId) return

        setLoading(true)
        const { data, error } = await supabase
            .from('attendance')
            .select(`
        *,
        student:students(*)
      `)
            .eq('event_id', selectedEventId)
            .order('marked_at', { ascending: false })

        if (error) {
            setError(error.message)
        } else {
            setAttendanceList(data || [])
        }
        setLoading(false)
    }, [selectedEventId, supabase])

    useEffect(() => {
        loadAttendance()
    }, [loadAttendance])

    const handleQRScan = async (qrData: string) => {
        if (!selectedEventId) {
            setError('Please select an event first')
            return
        }

        setShowScanner(false)
        setLoading(true)
        setError('')
        setSuccess('')

        // Find student by QR code
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('qr_code_data', qrData)
            .single()

        if (studentError || !student) {
            setError('Student not found. QR code may be invalid.')
            setLoading(false)
            return
        }

        // Check if already marked
        const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('event_id', selectedEventId)
            .eq('student_id', student.id)
            .single()

        if (existing) {
            setError(`${student.name} is already marked present.`)
            setLoading(false)
            return
        }

        // Mark attendance
        const { data: { user } } = await supabase.auth.getUser()

        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                event_id: selectedEventId,
                student_id: student.id,
                marked_by: user!.id,
                check_in_method: 'qr_scan',
            })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        // Log audit
        await supabase.rpc('log_audit', {
            p_action: 'attendance_marked',
            p_resource_type: 'attendance',
            p_details: {
                event_id: selectedEventId,
                student_id: student.id,
                method: 'qr_scan'
            }
        })

        setSuccess(`✓ ${student.name} marked present!`)
        loadAttendance()
    }

    const handleManualSearch = async () => {
        if (!searchQuery.trim()) return

        setSearchLoading(true)
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .or(`name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`)
            .limit(10)

        if (error) {
            setError(error.message)
        } else {
            setManualSearchResults(data || [])
        }
        setSearchLoading(false)
    }

    const handleManualMark = async (student: Student) => {
        if (!selectedEventId) return

        setLoading(true)
        setError('')
        setSuccess('')

        // Check if already marked
        const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('event_id', selectedEventId)
            .eq('student_id', student.id)
            .single()

        if (existing) {
            setError(`${student.name} is already marked present.`)
            setLoading(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()

        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                event_id: selectedEventId,
                student_id: student.id,
                marked_by: user!.id,
                check_in_method: 'manual',
            })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        await supabase.rpc('log_audit', {
            p_action: 'attendance_marked',
            p_resource_type: 'attendance',
            p_details: {
                event_id: selectedEventId,
                student_id: student.id,
                method: 'manual'
            }
        })

        setSuccess(`✓ ${student.name} marked present!`)
        setManualSearchResults([])
        setSearchQuery('')
        loadAttendance()
    }

    if (events.length === 0) {
        return (
            <main className="p-4">
                <EmptyState
                    icon={<Calendar className="h-8 w-8 text-gray-400" />}
                    title="No events open"
                    description="There are no events with open attendance. Authorize an event and open attendance first."
                />
            </main>
        )
    }

    return (
        <main className="p-4 space-y-4">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

            {/* Event Selector */}
            <div>
                <label className="label">Select Event</label>
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="input"
                >
                    <option value="">Choose an event...</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>
                            {event.name} - {formatDate(event.event_date)}
                        </option>
                    ))}
                </select>
            </div>

            {selectedEventId && (
                <>
                    {/* Scan QR Button */}
                    <button
                        onClick={() => setShowScanner(true)}
                        className="btn-primary w-full"
                    >
                        <QrCode className="h-5 w-5 mr-2" />
                        Scan Student QR Code
                    </button>

                    {/* Manual Search */}
                    <div className="card">
                        <h3 className="font-medium text-gray-900 mb-3">Manual Entry</h3>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                                    className="input pl-10"
                                    placeholder="Name or Roll No."
                                />
                            </div>
                            <button
                                onClick={handleManualSearch}
                                disabled={searchLoading}
                                className="btn-secondary"
                            >
                                {searchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                            </button>
                        </div>

                        {/* Search Results */}
                        {manualSearchResults.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {manualSearchResults.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{student.name}</div>
                                            <div className="text-sm text-gray-500">{student.student_id}</div>
                                        </div>
                                        <button
                                            onClick={() => handleManualMark(student)}
                                            disabled={loading}
                                            className="btn-success text-sm py-2"
                                        >
                                            Mark
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Attendance List */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900">
                                <Users className="h-5 w-5 inline mr-2" />
                                Attendees ({attendanceList.length})
                            </h3>
                        </div>

                        {loading && attendanceList.length === 0 ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                            </div>
                        ) : attendanceList.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                No attendance marked yet
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {attendanceList.map((record) => (
                                    <div
                                        key={record.id}
                                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                                    >
                                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">
                                                {record.student?.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {record.student?.student_id} • {record.check_in_method}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* QR Scanner Modal */}
            {showScanner && (
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </main>
    )
}
