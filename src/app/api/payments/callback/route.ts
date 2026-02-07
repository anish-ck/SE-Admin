import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrderStatus, getPayments } from '@/lib/cashfree'

/**
 * GET /api/payments/callback
 * Handle payment redirect callback from Cashfree
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
        return NextResponse.redirect(new URL('/payment-failed?error=missing_order', request.url))
    }

    try {
        const supabase = await createClient()

        // Get order status from Cashfree
        const orderStatus = await getOrderStatus(orderId)

        // Get payment details
        let paymentDetails: any = null
        try {
            const payments = await getPayments(orderId)
            paymentDetails = payments[0] || null
        } catch {
            // Ignore if no payments yet
        }

        // Update payment in database
        const newStatus = orderStatus.order_status === 'PAID' ? 'success'
            : orderStatus.order_status === 'EXPIRED' ? 'failed'
                : 'pending'

        await supabase
            .from('payments')
            .update({
                status: newStatus,
                cf_payment_id: paymentDetails?.cf_payment_id,
                payment_method: paymentDetails?.payment_group,
                payment_time: paymentDetails?.payment_completion_time,
                response_data: { order: orderStatus, payment: paymentDetails },
                updated_at: new Date().toISOString(),
            })
            .eq('order_id', orderId)

        // If successful, confirm registration
        if (newStatus === 'success') {
            const { data: payment } = await supabase
                .from('payments')
                .select('registration_id, event_id')
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

            // Redirect to success page
            const successUrl = new URL('/payment-success', request.url)
            successUrl.searchParams.set('order_id', orderId)
            if (payment?.event_id) {
                successUrl.searchParams.set('event_id', payment.event_id)
            }
            return NextResponse.redirect(successUrl)
        }

        // Redirect to appropriate page based on status
        if (newStatus === 'failed') {
            return NextResponse.redirect(new URL(`/payment-failed?order_id=${orderId}`, request.url))
        }

        // Still pending - redirect to status check page
        return NextResponse.redirect(new URL(`/payment-status?order_id=${orderId}`, request.url))

    } catch (err: any) {
        console.error('Payment callback error:', err)
        return NextResponse.redirect(new URL(`/payment-failed?error=${encodeURIComponent(err.message)}`, request.url))
    }
}
