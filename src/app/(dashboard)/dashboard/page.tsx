import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import {
    Calendar,
    Users,
    Award,
    Clock,
    ChevronRight,
    Plus
} from 'lucide-react'
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Event, Profile } from '@/lib/types'

async function getDashboardData() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Get recent events
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    // Get stats
    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

    const { count: openAttendance } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'attendance_open')

    const { count: totalCertificates } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })

    return {
        profile: profile as Profile,
        events: (events || []) as Event[],
        stats: {
            totalEvents: totalEvents || 0,
            openAttendance: openAttendance || 0,
            totalCertificates: totalCertificates || 0,
        }
    }
}

export default async function DashboardPage() {
    const { profile, events, stats } = await getDashboardData()

    const statCards = [
        { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'bg-blue-500' },
        { label: 'Open Attendance', value: stats.openAttendance, icon: Users, color: 'bg-green-500' },
        { label: 'Certificates', value: stats.totalCertificates, icon: Award, color: 'bg-purple-500' },
    ]

    return (
        <>
            <PageHeader
                title={`Hi, ${profile?.full_name?.split(' ')[0] || 'User'}`}
                action={
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full capitalize">
                        {profile?.role?.replace('_', ' ')}
                    </span>
                }
            />

            <main className="p-4 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {statCards.map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="card text-center">
                            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{value}</div>
                            <div className="text-xs text-gray-500">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <section>
                    <h2 className="section-title">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/events/new" className="card flex items-center gap-3 hover:bg-gray-50">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Plus className="h-5 w-5 text-primary-600" />
                            </div>
                            <span className="font-medium text-gray-900">New Event</span>
                        </Link>
                        <Link href="/attendance" className="card flex items-center gap-3 hover:bg-gray-50">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="font-medium text-gray-900">Scan QR</span>
                        </Link>
                    </div>
                </section>

                {/* Recent Events */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="section-title mb-0">Recent Events</h2>
                        <Link href="/events" className="text-sm text-primary-600 font-medium">
                            View All
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {events.length === 0 ? (
                            <div className="card text-center py-8 text-gray-500">
                                No events yet. Create your first event!
                            </div>
                        ) : (
                            events.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="card flex items-center justify-between hover:bg-gray-50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 truncate">{event.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <Clock className="h-4 w-4" />
                                            <span>{formatDate(event.event_date)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={getStatusBadgeClass(event.status)}>
                                            {getStatusLabel(event.status)}
                                        </span>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </>
    )
}
