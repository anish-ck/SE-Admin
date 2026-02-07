import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { IssueCertificatesClient } from './issue-client'
import type { Event, Attendance, Student, CertificateTemplate } from '@/lib/types'

interface Props {
    searchParams: Promise<{ event?: string }>
}

async function getEventData(eventId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Check user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'faculty'].includes(profile.role)) {
        redirect('/dashboard')
    }

    // Get event
    const { data: event, error } = await supabase
        .from('events')
        .select(`
      *,
      template:certificate_templates(*)
    `)
        .eq('id', eventId)
        .single()

    if (error || !event) {
        notFound()
    }

    if (event.status !== 'attendance_locked') {
        redirect(`/events/${eventId}`)
    }

    // Get attendance with students
    const { data: attendance } = await supabase
        .from('attendance')
        .select(`
      *,
      student:students(*)
    `)
        .eq('event_id', eventId)
        .order('marked_at', { ascending: true })

    // Check for existing certificates
    const { data: existingCerts } = await supabase
        .from('certificates')
        .select('student_id')
        .eq('event_id', eventId)

    const existingStudentIds = new Set(existingCerts?.map((c: { student_id: string }) => c.student_id) || [])

    return {
        event: event as Event & { template: CertificateTemplate | null },
        attendance: (attendance || []) as (Attendance & { student: Student })[],
        existingStudentIds,
        userId: user.id,
    }
}

export default async function IssueCertificatesPage({ searchParams }: Props) {
    const { event: eventId } = await searchParams

    if (!eventId) {
        redirect('/events')
    }

    const { event, attendance, existingStudentIds, userId } = await getEventData(eventId)

    // Filter out students who already have certificates
    const pendingAttendance = attendance.filter(a => !existingStudentIds.has(a.student_id))

    return (
        <>
            <PageHeader title="Issue Certificates" showBack />
            <IssueCertificatesClient
                event={event}
                attendance={pendingAttendance}
                userId={userId}
                alreadyIssued={existingStudentIds.size}
            />
        </>
    )
}
