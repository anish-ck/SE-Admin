import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { CreditCard, CheckCircle, XCircle, Clock, IndianRupee } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Payment } from '@/lib/types'

async function getPayments() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Check if admin/faculty
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'faculty'].includes(profile.role)) {
        redirect('/dashboard')
    }

    const { data: payments, error } = await supabase
        .from('payments')
        .select(`
            *,
            event:events(id, name, event_date),
            student:students(id, name, student_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching payments:', error)
        return []
    }

    return payments as Payment[]
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'success':
            return <CheckCircle className="h-5 w-5 text-green-600" />
        case 'failed':
            return <XCircle className="h-5 w-5 text-red-600" />
        case 'pending':
        case 'processing':
            return <Clock className="h-5 w-5 text-yellow-600" />
        default:
            return <Clock className="h-5 w-5 text-gray-400" />
    }
}

function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
        success: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        refunded: 'bg-purple-100 text-purple-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
}

export default async function PaymentsPage() {
    const payments = await getPayments()

    // Calculate stats
    const totalAmount = payments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    const successCount = payments.filter(p => p.status === 'success').length
    const pendingCount = payments.filter(p => p.status === 'pending').length

    return (
        <>
            <PageHeader title="Payments" />

            <main className="p-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-green-600">₹{totalAmount}</div>
                        <div className="text-xs text-gray-500">Total Collected</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-blue-600">{successCount}</div>
                        <div className="text-xs text-gray-500">Successful</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                    </div>
                </div>

                {/* Payments List */}
                {payments.length === 0 ? (
                    <EmptyState
                        icon={<CreditCard className="h-8 w-8 text-gray-400" />}
                        title="No payments yet"
                        description="Payment records will appear here when students register for paid events"
                    />
                ) : (
                    <div className="space-y-3">
                        {payments.map((payment) => (
                            <div key={payment.id} className="card">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(payment.status)}
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {payment.student?.name || 'Unknown Student'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {payment.student?.student_id}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900">₹{payment.amount}</div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(payment.status)}`}>
                                            {payment.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 mb-2">
                                    {payment.event?.name || 'Unknown Event'}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Order: {payment.order_id}</span>
                                    <span>{formatDate(payment.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}
