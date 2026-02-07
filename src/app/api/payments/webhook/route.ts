import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/cashfree'

/**
 * POST /api/payments/webhook
 * Handle Cashfree webhook notifications
 * 
 * Webhook Events:
 * - PAYMENT_SUCCESS_WEBHOOK: Payment successful
 * - PAYMENT_FAILED_WEBHOOK: Payment failed
 * - PAYMENT_USER_DROPPED_WEBHOOK: User dropped off
 * 
 * Headers from Cashfree:
 * - x-webhook-timestamp: Unix timestamp in ms
 * - x-webhook-signature: Base64 HMAC-SHA256 signature
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()
        const timestamp = request.headers.get('x-webhook-timestamp') || ''
        const signature = request.headers.get('x-webhook-signature') || ''

        // Verify webhook signature (recommended for production)
        if (process.env.NODE_ENV === 'production' && process.env.CASHFREE_SECRET_KEY) {
            const isValid = verifyWebhookSignature(rawBody, timestamp, signature)
            if (!isValid) {
                console.error('Webhook signature verification failed')
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
            }
        }

        const payload = JSON.parse(rawBody)
        console.log('Cashfree Webhook:', JSON.stringify(payload, null, 2))

        const { type, data } = payload

        // Handle different webhook types
        if (type === 'PAYMENT_SUCCESS_WEBHOOK' || type === 'PAYMENT_FAILED_WEBHOOK') {
            const { order } = data
            const orderId = order.order_id
            const orderStatus = order.order_status

            const supabase = await createClient()

            // Get payment from payments
            const paymentData = data.payment || {}

            // Update payment record
            const newStatus = orderStatus === 'PAID' ? 'success' : 'failed'

            await supabase
                .from('payments')
                .update({
                    status: newStatus,
                    cf_payment_id: paymentData.cf_payment_id,
                    payment_method: paymentData.payment_group,
                    payment_time: paymentData.payment_completion_time,
                    response_data: payload,
                    updated_at: new Date().toISOString(),
                })
                .eq('order_id', orderId)

            // If payment successful, confirm registration
            if (newStatus === 'success') {
                // Get payment to find registration
                const { data: payment } = await supabase
                    .from('payments')
                    .select('registration_id, student_id, event_id')
                    .eq('order_id', orderId)
                    .single()

                if (payment?.registration_id) {
                    await supabase
                        .from('event_registrations')
                        .update({
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', payment.registration_id)
                }

                // Log audit
                await supabase.rpc('log_audit', {
                    p_action: 'payment_success',
                    p_resource_type: 'payment',
                    p_details: {
                        order_id: orderId,
                        cf_payment_id: paymentData.cf_payment_id,
                        amount: order.order_amount,
                    }
                })
            } else {
                // Log failed payment
                await supabase.rpc('log_audit', {
                    p_action: 'payment_failed',
                    p_resource_type: 'payment',
                    p_details: {
                        order_id: orderId,
                        error: paymentData.payment_message,
                    }
                })
            }
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Webhook error:', err)
        return NextResponse.json(
            { error: 'Webhook processing failed', message: err.message },
            { status: 500 }
        )
    }
}
