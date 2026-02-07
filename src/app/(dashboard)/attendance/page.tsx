import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AttendanceClient } from './attendance-client'
import type { Event } from '@/lib/types'

interface Props {
    searchParams: Promise<{ event?: string }>
}

async function getOpenEvents() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: events } = await supabase
        .from('events')
        .select('id, name, event_date, venue')
        .eq('status', 'attendance_open')
        .order('event_date', { ascending: true })

    return events || []
}

export default async function AttendancePage({ searchParams }: Props) {
    const { event: selectedEventId } = await searchParams
    const events = await getOpenEvents()

    return (
        <>
            <PageHeader title="Attendance" />
            <AttendanceClient
                events={events as Event[]}
                initialEventId={selectedEventId}
            />
        </>
    )
}
