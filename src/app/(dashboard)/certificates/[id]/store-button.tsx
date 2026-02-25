'use client'

import { useState } from 'react'
import { storeSingleOnBlockchain } from '../actions'
import { Loader2, Link as LinkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function StoreOnBlockchainButton({ certificateId }: { certificateId: string }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleStore = async () => {
        setLoading(true)
        setError('')

        try {
            const result = await storeSingleOnBlockchain(certificateId)

            if (result.error) {
                setError(result.error)
            } else if (result.success) {
                // Refresh the page to show updated blockchain data
                router.refresh()
            } else {
                setError('No pending certificates found')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to store on blockchain')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <button
                onClick={handleStore}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Storing on blockchain...
                    </>
                ) : (
                    <>
                        <LinkIcon className="h-4 w-4" />
                        Store on Blockchain Now
                    </>
                )}
            </button>
            {error && (
                <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
            )}
        </div>
    )
}
