import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import {
    Award,
    User,
    Calendar,
    Building,
    Hash,
    ExternalLink,
    CheckCircle,
    Clock,
    Copy
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { Certificate } from '@/lib/types'
import { CopyButton } from './copy-button'
import { StoreOnBlockchainButton } from './store-button'

interface Props {
    params: Promise<{ id: string }>
}

async function getCertificate(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: certificate, error } = await supabase
        .from('certificates')
        .select(`
      *,
      event:events(id, name, event_date, venue),
      template:certificate_templates(id, name)
    `)
        .eq('id', id)
        .single()

    if (error || !certificate) {
        notFound()
    }

    // Get blockchain config for explorer URL
    const { data: config } = await supabase
        .from('blockchain_config')
        .select('explorer_url')
        .eq('is_active', true)
        .single()

    return {
        certificate: certificate as Certificate & {
            event: { id: string; name: string; event_date: string; venue: string };
            template: { id: string; name: string } | null;
        },
        explorerUrl: config?.explorer_url || 'https://amoy.polygonscan.com'
    }
}

export default async function CertificateDetailPage({ params }: Props) {
    const { id } = await params
    const { certificate: cert, explorerUrl } = await getCertificate(id)

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/verify?cert=${cert.certificate_number}`

    return (
        <>
            <PageHeader title="Certificate" showBack />

            <main className="p-4 space-y-4">
                {/* Status Card */}
                <div className={`card ${cert.blockchain_tx_hash ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center gap-3">
                        {cert.blockchain_tx_hash ? (
                            <>
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                    <div className="font-medium text-green-800">Blockchain Verified</div>
                                    <div className="text-sm text-green-600">Certificate is stored on Polygon</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Clock className="h-6 w-6 text-yellow-600" />
                                <div className="flex-1">
                                    <div className="font-medium text-yellow-800">Pending Blockchain</div>
                                    <div className="text-sm text-yellow-600">Awaiting blockchain confirmation</div>
                                </div>
                            </>
                        )}
                    </div>
                    {!cert.blockchain_tx_hash && (
                        <div className="mt-3">
                            <StoreOnBlockchainButton certificateId={cert.id} />
                        </div>
                    )}
                </div>

                {/* Certificate Info */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Award className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">{cert.certificate_number}</div>
                            <div className="text-sm text-gray-500">Certificate ID</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                                <div className="text-sm text-gray-500">Recipient</div>
                                <div className="font-medium text-gray-900">{cert.student_name}</div>
                                <div className="text-sm text-gray-500">{cert.student_roll}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                                <div className="text-sm text-gray-500">Event</div>
                                <div className="font-medium text-gray-900">{cert.event_name}</div>
                                <div className="text-sm text-gray-500">{formatDate(cert.event_date)}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                                <div className="text-sm text-gray-500">Institution</div>
                                <div className="font-medium text-gray-900">{cert.institution_name}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                                <div className="text-sm text-gray-500">Issued On</div>
                                <div className="font-medium text-gray-900">{formatDateTime(cert.issued_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hash Info */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-3">
                        <Hash className="h-5 w-5 inline mr-2" />
                        Blockchain Data
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Payload Hash</div>
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                                    {cert.payload_hash}
                                </code>
                                <CopyButton text={cert.payload_hash} />
                            </div>
                        </div>

                        {cert.blockchain_tx_hash && (
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Transaction Hash</div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                                        {cert.blockchain_tx_hash}
                                    </code>
                                    <a
                                        href={`${explorerUrl}/tx/${cert.blockchain_tx_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Verify Link */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-2">Verification Link</h3>
                    <p className="text-sm text-gray-500 mb-3">
                        Share this link to verify the certificate
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={verifyUrl}
                            readOnly
                            className="input text-sm"
                        />
                        <CopyButton text={verifyUrl} />
                    </div>
                </div>
            </main>
        </>
    )
}
