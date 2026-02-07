import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Calendar, Plus, ChevronRight, Clock, MapPin } from 'lucide-react'
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Event } from '@/lib/types'

async function getEvents() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: events, error } = await supabase
        .from('events')
        .select(`
      *,
      template:certificate_templates(id, name)
    `)
        .order('event_date', { ascending: false })

    if (error) {
        console.error('Error fetching events:', error)
        return []
    }

    return events as Event[]
}

export default async function EventsPage() {
    const events = await getEvents()

    return (
        <>
            <PageHeader
                title="Events"
                action={
                    <Link
                        href="/events/new"
                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        <Plus className="h-5 w-5" />
                    </Link>
                }
            />

            <main className="p-4">
                {events.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="h-8 w-8 text-gray-400" />}
                        title="No events yet"
                        description="Create your first event to start managing certificates"
                        action={
                            <Link href="/events/new" className="btn-primary">
                                <Plus className="h-5 w-5 mr-2" />
                                Create Event
                            </Link>
                        }
                    />
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/events/${event.id}`}
                                className="card block hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                                    <span className={getStatusBadgeClass(event.status)}>
                                        {getStatusLabel(event.status)}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{formatDate(event.event_date)}</span>
                                    </div>
                                    {event.venue && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <span className="truncate">{event.venue}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        {event.department || 'All Departments'}
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}
