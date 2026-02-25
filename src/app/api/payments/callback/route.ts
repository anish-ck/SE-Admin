import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentLinkStatus } from '@/lib/cashfree'

/**
 * GET /api/payments/callback
 * Handle payment redirect callback from Cashfree
 * 
 * After processing, redirects to /payment-complete page which:
 * - Shows payment status to the user
 * - Attempts to auto-close the browser (for mobile app users)
 * - Displays "Return to App" message
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const linkId = searchParams.get('link_id')

    if (!orderId && !linkId) {
        return NextResponse.redirect(new URL('/payment-complete?status=failed', request.url))
    }

    try {
        const supabase = await createClient()

        let newStatus = 'pending'

        // We use Payment Links API, so check link status
        if (linkId) {
            try {
                const linkStatus = await getPaymentLinkStatus(linkId)
                newStatus = linkStatus.link_status === 'PAID' ? 'success'
                    : linkStatus.link_status === 'EXPIRED' ? 'failed'
                        : 'pending'
            } catch (e) {
                console.error('Error checking link status:', e)
            }
        }

        // Also try to find payment by order_id and check via link_id stored as payment_session_id
        if (orderId && newStatus === 'pending') {
            const { data: payment } = await supabase
                .from('payments')
                .select('payment_session_id, status')
                .eq('order_id', orderId)
                .single()

            if (payment?.payment_session_id) {
                try {
                    const linkStatus = await getPaymentLinkStatus(payment.payment_session_id)
                    newStatus = linkStatus.link_status === 'PAID' ? 'success'
                        : linkStatus.link_status === 'EXPIRED' ? 'failed'
                            : 'pending'
                } catch (e) {
                    console.error('Error checking link status by payment_session_id:', e)
                }
            }

            // If already marked success in DB, use that
            if (payment?.status === 'success') {
                newStatus = 'success'
            }
        }

        // Update payment record if we have a definitive status
        if (orderId && (newStatus === 'success' || newStatus === 'failed')) {
            await supabase
                .from('payments')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                })
                .eq('order_id', orderId)

            // If successful, confirm registration
            if (newStatus === 'success') {
                const { data: payment } = await supabase
                    .from('payments')
                    .select('registration_id')
                    .eq('order_id', orderId)
                    .single()

                if (payment?.registration_id) {
                    await supabase
                        .from('event_registrations')
                        .update({
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                        })
                        .eq('id', payment.registration_id)
                }
            }
        }

        // Redirect to payment-complete page (mobile-friendly, auto-closes browser)
        const completeUrl = new URL('/payment-complete', request.url)
        completeUrl.searchParams.set('status', newStatus)
        if (orderId) completeUrl.searchParams.set('order_id', orderId)
        return NextResponse.redirect(completeUrl)

    } catch (err: any) {
        console.error('Payment callback error:', err)
        const errorUrl = new URL('/payment-complete', request.url)
        errorUrl.searchParams.set('status', 'failed')
        if (orderId) errorUrl.searchParams.set('order_id', orderId)
        return NextResponse.redirect(errorUrl)
    }
}
