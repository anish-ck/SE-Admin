import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentLinkStatus } from '@/lib/cashfree'

/**
 * GET /api/payments/status
 * Check payment status for an order
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
        return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    try {
        const supabase = await createClient()

        // Get payment from database
        const { data: payment, error } = await supabase
            .from('payments')
            .select(`
                *,
                event:events(id, name, event_date),
                student:students(id, name, student_id)
            `)
            .eq('order_id', orderId)
            .single()

        if (error || !payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        // If still pending, check with Cashfree Payment Link status
        if (payment.status === 'pending' || payment.status === 'processing') {
            try {
                // payment_session_id stores the link_id for Payment Links
                const linkId = payment.payment_session_id
                if (linkId) {
                    const cfLinkStatus = await getPaymentLinkStatus(linkId)

                    // Update if payment completed (link_amount_paid > 0)
                    if (cfLinkStatus.link_status === 'PAID' || cfLinkStatus.link_amount_paid > 0) {
                        await supabase
                            .from('payments')
                            .update({
                                status: 'success',
                                updated_at: new Date().toISOString(),
                            })
                            .eq('order_id', orderId)

                        // Confirm registration
                        if (payment.registration_id) {
                            await supabase
                                .from('event_registrations')
                                .update({
                                    status: 'confirmed',
                                    confirmed_at: new Date().toISOString(),
                                })
                                .eq('id', payment.registration_id)
                        }

                        payment.status = 'success'
                    }
                }
            } catch (cfError) {
                console.error('Cashfree link status check error:', cfError)
                // Don't fail the request, just return DB status
            }
        }

        return NextResponse.json({
            orderId: payment.order_id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            event: payment.event,
            student: payment.student,
            paymentTime: payment.payment_time,
            createdAt: payment.created_at,
        })

    } catch (err: any) {
        console.error('Payment status error:', err)
        return NextResponse.json(
            { error: 'Failed to get payment status', message: err.message },
            { status: 500 }
        )
    }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
