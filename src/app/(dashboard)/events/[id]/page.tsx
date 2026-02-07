import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EventActions } from './event-actions'
import {
    Calendar,
    Clock,
    MapPin,
    Building,
    Users,
    User,
    FileText
} from 'lucide-react'
import { formatDate, formatTime, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Event, Attendance } from '@/lib/types'

interface Props {
    params: Promise<{ id: string }>
}

async function getEvent(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: event, error } = await supabase
        .from('events')
        .select(`
      *,
      template:certificate_templates(id, name),
      creator:profiles!events_created_by_fkey(full_name),
      authorizer:profiles!events_authorized_by_fkey(full_name)
    `)
        .eq('id', id)
        .single()

    if (error || !event) {
        notFound()
    }

    // Get attendance count
    const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)

    // Get certificate count
    const { count: certificateCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)

    // Get user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return {
        event: event as Event & { creator: { full_name: string }, authorizer?: { full_name: string } },
        attendanceCount: attendanceCount || 0,
        certificateCount: certificateCount || 0,
        userRole: profile?.role || 'event_manager',
        userId: user.id,
    }
}

export default async function EventDetailPage({ params }: Props) {
    const { id } = await params
    const { event, attendanceCount, certificateCount, userRole, userId } = await getEvent(id)

    const canAuthorize = ['admin', 'faculty'].includes(userRole) && event.status === 'draft'
    const canOpenAttendance = ['admin', 'faculty'].includes(userRole) && event.status === 'authorized'
    const canLockAttendance = ['admin', 'faculty'].includes(userRole) && event.status === 'attendance_open'
    const canIssueCertificates = ['admin', 'faculty'].includes(userRole) && event.status === 'attendance_locked'

    const details = [
        { icon: Calendar, label: 'Date', value: formatDate(event.event_date) },
        { icon: Clock, label: 'Time', value: event.event_time ? formatTime(event.event_time) : 'Not set' },
        { icon: MapPin, label: 'Venue', value: event.venue || 'Not specified' },
        { icon: Building, label: 'Department', value: event.department || 'All Departments' },
        { icon: Users, label: 'Max Participants', value: event.max_participants?.toString() || 'Unlimited' },
        { icon: User, label: 'Created By', value: event.creator?.full_name || 'Unknown' },
        { icon: FileText, label: 'Template', value: event.template?.name || 'Not selected' },
    ]

    return (
        <>
            <PageHeader title="Event Details" showBack />

            <main className="p-4 space-y-4">
                {/* Header Card */}
                <div className="card">
                    <div className="flex items-start justify-between mb-3">
                        <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
                        <span className={getStatusBadgeClass(event.status)}>
                            {getStatusLabel(event.status)}
                        </span>
                    </div>
                    {event.description && (
                        <p className="text-gray-600 text-sm">{event.description}</p>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="card text-center">
                        <div className="text-3xl font-bold text-primary-600">{attendanceCount}</div>
                        <div className="text-sm text-gray-500">Attendees</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-3xl font-bold text-purple-600">{certificateCount}</div>
                        <div className="text-sm text-gray-500">Certificates</div>
                    </div>
                </div>

                {/* Details */}
                <div className="card">
                    <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
                    <div className="space-y-3">
                        {details.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-gray-500" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">{label}</div>
                                    <div className="text-sm font-medium text-gray-900">{value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Authorization Info */}
                {event.authorized_at && (
                    <div className="card bg-blue-50 border-blue-200">
                        <div className="text-sm text-blue-800">
                            <strong>Authorized</strong> by {event.authorizer?.full_name || 'Admin'} on{' '}
                            {formatDate(event.authorized_at)}
                        </div>
                    </div>
                )}

                {/* Lock Info */}
                {event.attendance_locked_at && (
                    <div className="card bg-orange-50 border-orange-200">
                        <div className="text-sm text-orange-800">
                            <strong>Attendance Locked</strong> on {formatDate(event.attendance_locked_at)}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <EventActions
                    eventId={event.id}
                    status={event.status}
                    canAuthorize={canAuthorize}
                    canOpenAttendance={canOpenAttendance}
                    canLockAttendance={canLockAttendance}
                    canIssueCertificates={canIssueCertificates}
                    attendanceCount={attendanceCount}
                />
            </main>
        </>
    )
}
