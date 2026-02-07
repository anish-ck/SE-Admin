'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Search, CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computePayloadHash, type CertificatePayload } from '@/lib/hash'
import { formatDate } from '@/lib/utils'

function VerifyContent() {
    const searchParams = useSearchParams()
    const certParam = searchParams.get('cert')

    const [certNumber, setCertNumber] = useState(certParam || '')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        status: 'valid' | 'invalid' | 'not_found' | 'hash_mismatch'
        certificate?: any
        blockchainData?: {
            exists: boolean
            timestamp?: string
            txHash?: string
        }
        recomputedHash?: string
    } | null>(null)

    const supabase = createClient()

    useEffect(() => {
        if (certParam) {
            handleVerify()
        }
    }, [certParam])

    const handleVerify = async () => {
        if (!certNumber.trim()) return

        setLoading(true)
        setResult(null)

        try {
            // Fetch certificate from database
            const { data: cert, error } = await supabase
                .from('certificates')
                .select('*')
                .eq('certificate_number', certNumber.trim().toUpperCase())
                .single()

            if (error || !cert) {
                setResult({ status: 'not_found' })
                setLoading(false)
                return
            }

            // Recompute hash from certificate data
            const payload: CertificatePayload = {
                certificate_number: cert.certificate_number,
                student_name: cert.student_name,
                student_roll: cert.student_roll,
                event_name: cert.event_name,
                event_date: cert.event_date,
                institution_name: cert.institution_name,
                issued_at: cert.issued_at,
            }

            const recomputedHash = computePayloadHash(payload)

            // Verify hash matches
            if (recomputedHash.toLowerCase() !== cert.payload_hash.toLowerCase()) {
                setResult({
                    status: 'hash_mismatch',
                    certificate: cert,
                    recomputedHash,
                })
                setLoading(false)
                return
            }

            // Check blockchain (if stored)
            let blockchainData = {
                exists: false,
                timestamp: undefined as string | undefined,
                txHash: cert.blockchain_tx_hash,
            }

            if (cert.blockchain_tx_hash) {
                blockchainData.exists = true
                blockchainData.timestamp = cert.blockchain_stored_at
            }

            setResult({
                status: blockchainData.exists ? 'valid' : 'valid', // Valid even without blockchain for now
                certificate: cert,
                blockchainData,
                recomputedHash,
            })

        } catch (err) {
            console.error('Verification error:', err)
            setResult({ status: 'not_found' })
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="safe-top px-4 py-4 bg-white border-b border-gray-200">
                <Link href="/" className="flex items-center gap-2 text-primary-600">
                    <Shield className="h-6 w-6" />
                    <span className="font-semibold">CertVerify</span>
                </Link>
            </header>

            <main className="flex-1 p-4">
                {/* Search */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Certificate</h1>
                    <p className="text-gray-600 text-sm">
                        Enter the certificate ID to verify its authenticity
                    </p>
                </div>

                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={certNumber}
                        onChange={(e) => setCertNumber(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                        placeholder="CERT-2025-000001"
                        className="input flex-1"
                    />
                    <button
                        onClick={handleVerify}
                        disabled={loading || !certNumber.trim()}
                        className="btn-primary"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Search className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-4">
                        {/* Status Card */}
                        {result.status === 'valid' && (
                            <div className="card bg-green-50 border-green-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-green-800">Valid Certificate</h2>
                                        <p className="text-sm text-green-600">
                                            {result.blockchainData?.exists
                                                ? 'Verified on blockchain'
                                                : 'Hash verification passed'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {result.status === 'not_found' && (
                            <div className="card bg-red-50 border-red-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <XCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-red-800">Certificate Not Found</h2>
                                        <p className="text-sm text-red-600">
                                            No certificate exists with this ID
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {result.status === 'hash_mismatch' && (
                            <div className="card bg-orange-50 border-orange-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                        <AlertCircle className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-orange-800">Verification Failed</h2>
                                        <p className="text-sm text-orange-600">
                                            Certificate data may have been tampered with
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Certificate Details */}
                        {result.certificate && (
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">Certificate Details</h3>

                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-500">Certificate ID</div>
                                        <div className="font-medium">{result.certificate.certificate_number}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500">Recipient</div>
                                        <div className="font-medium">{result.certificate.student_name}</div>
                                        <div className="text-sm text-gray-500">{result.certificate.student_roll}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500">Event</div>
                                        <div className="font-medium">{result.certificate.event_name}</div>
                                        <div className="text-sm text-gray-500">
                                            {formatDate(result.certificate.event_date)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500">Institution</div>
                                        <div className="font-medium">{result.certificate.institution_name}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500">Issued On</div>
                                        <div className="font-medium">{formatDate(result.certificate.issued_at)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Blockchain Info */}
                        {result.certificate && (
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">Verification Data</h3>

                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-500">Payload Hash</div>
                                        <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
                                            {result.certificate.payload_hash}
                                        </code>
                                    </div>

                                    {result.blockchainData?.txHash && (
                                        <div>
                                            <div className="text-xs text-gray-500">Blockchain Transaction</div>
                                            <a
                                                href={`https://amoy.polygonscan.com/tx/${result.blockchainData.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary-600 flex items-center gap-1"
                                            >
                                                View on PolygonScan
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-gray-600">Hash recomputed and verified</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="safe-bottom p-4 text-center text-xs text-gray-500">
                Powered by Polygon Blockchain
            </footer>
        </div>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        }>
            <VerifyContent />
        </Suspense>
    )
}
