import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Award, ChevronRight, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Certificate } from '@/lib/types'

interface Props {
    searchParams: Promise<{ event?: string }>
}

async function getCertificates(eventId?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    let query = supabase
        .from('certificates')
        .select(`
      *,
      event:events(id, name)
    `)
        .order('issued_at', { ascending: false })
        .limit(100)

    if (eventId) {
        query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching certificates:', error)
        return []
    }

    return data as (Certificate & { event: { id: string; name: string } })[]
}

export default async function CertificatesPage({ searchParams }: Props) {
    const { event: eventId } = await searchParams
    const certificates = await getCertificates(eventId)

    return (
        <>
            <PageHeader title="Certificates" />

            <main className="p-4">
                {certificates.length === 0 ? (
                    <EmptyState
                        icon={<Award className="h-8 w-8 text-gray-400" />}
                        title="No certificates yet"
                        description="Certificates will appear here after they are issued for events with locked attendance."
                    />
                ) : (
                    <div className="space-y-3">
                        {certificates.map((cert) => (
                            <Link
                                key={cert.id}
                                href={`/certificates/${cert.id}`}
                                className="card block hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="font-medium text-gray-900">{cert.student_name}</div>
                                        <div className="text-sm text-gray-500">{cert.student_roll}</div>
                                    </div>
                                    {cert.blockchain_tx_hash ? (
                                        <span className="badge bg-green-100 text-green-700">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="badge bg-yellow-100 text-yellow-700">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Pending
                                        </span>
                                    )}
                                </div>

                                <div className="text-sm text-gray-500 mb-2">
                                    {cert.event?.name}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    <span>{cert.certificate_number}</span>
                                    <span>{formatDate(cert.issued_at)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}
