import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken, extractBearerToken } from '@/lib/supabase/server'
import { createPaymentLink, generateLinkId, generateOrderId } from '@/lib/cashfree'

/**
 * POST /api/payments/create-order
 * Create a payment order for event registration
 * 
 * Supports both:
 * - Cookie-based auth (web app)
 * - Bearer token auth (mobile app)
 * 
 * Request Body:
 * - eventId: string - Event UUID
 * - studentId: string - Student UUID
 * - customerPhone: string (optional) - Phone number for Cashfree
 * 
 * Returns:
 * - orderId: string - Our order ID
 * - cfOrderId: string - Cashfree order ID
 * - paymentSessionId: string - For SDK integration
 * - paymentLink: string - Direct payment URL
 * - amount: number - Payment amount
 * 
 * @see https://www.cashfree.com/docs/reference/pgcreateorder
 */
export async function POST(request: NextRequest) {
    try {
        // Try Bearer token first (mobile app), then fall back to cookies (web)
        const authHeader = request.headers.get('authorization')
        const bearerToken = extractBearerToken(authHeader)

        let supabase
        let user

        if (bearerToken) {
            // Mobile app with Bearer token
            supabase = createClientWithToken(bearerToken)
            const { data, error } = await supabase.auth.getUser()
            if (error || !data.user) {
                return NextResponse.json({ error: 'Unauthorized', message: 'Invalid token' }, { status: 401 })
            }
            user = data.user
        } else {
            // Web app with cookies
            supabase = await createClient()
            const { data, error } = await supabase.auth.getUser()
            if (error || !data.user) {
                return NextResponse.json({ error: 'Unauthorized', message: 'Not authenticated' }, { status: 401 })
            }
            user = data.user
        }

        const body = await request.json()
        const { eventId, studentId, customerPhone } = body

        if (!eventId || !studentId) {
            return NextResponse.json(
                { error: 'eventId and studentId are required' },
                { status: 400 }
            )
        }

        // Get event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        if (!event.is_paid_event || event.registration_fee <= 0) {
            return NextResponse.json(
                { error: 'This event does not require payment' },
                { status: 400 }
            )
        }

        // Get student details
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single()

        if (studentError || !student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        // Check if already registered
        const { data: existingReg } = await supabase
            .from('event_registrations')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('student_id', studentId)
            .single()

        if (existingReg?.status === 'confirmed') {
            return NextResponse.json(
                { error: 'Already registered for this event' },
                { status: 400 }
            )
        }

        // Generate unique IDs
        const orderId = generateOrderId(eventId, studentId)
        const linkId = generateLinkId()
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/callback?order_id=${orderId}`
        const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/webhook`

        // Set expiry to 30 minutes from now
        const expiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()

        // Create Cashfree Payment Link (returns a shareable URL)
        const cfLink = await createPaymentLink({
            linkId,
            linkAmount: event.registration_fee,
            linkCurrency: 'INR',
            linkPurpose: `Registration for ${event.name}`,
            customerDetails: {
                customerName: student.name,
                customerEmail: student.email || `${student.student_id}@student.college.edu`,
                customerPhone: customerPhone || '9999999999',
            },
            linkMeta: {
                returnUrl,
                notifyUrl,
            },
            linkExpiryTime: expiryTime,
        })

        // Create or update registration
        let registrationId = existingReg?.id
        if (!registrationId) {
            const { data: newReg, error: regError } = await supabase
                .from('event_registrations')
                .insert({
                    event_id: eventId,
                    student_id: studentId,
                    status: 'pending',
                    payment_required: true,
                })
                .select('id')
                .single()

            if (regError) {
                throw regError
            }
            registrationId = newReg.id
        }

        // Save payment record
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                order_id: orderId,
                cf_order_id: cfLink.cf_link_id,
                registration_id: registrationId,
                student_id: studentId,
                event_id: eventId,
                amount: event.registration_fee,
                currency: 'INR',
                status: 'pending',
                payment_session_id: linkId,
                payment_link: cfLink.link_url,
            })

        if (paymentError) {
            throw paymentError
        }

        // Log audit
        await supabase.rpc('log_audit', {
            p_action: 'payment_initiated',
            p_user_id: user.id,
            p_resource_type: 'payment',
            p_details: {
                order_id: orderId,
                event_id: eventId,
                student_id: studentId,
                amount: event.registration_fee,
            }
        })

        return NextResponse.json({
            success: true,
            orderId,
            linkId,
            cfLinkId: cfLink.cf_link_id,
            paymentLink: cfLink.link_url,  // This is a shareable URL that works in any browser!
            amount: event.registration_fee,
        })

    } catch (err: any) {
        console.error('Create order error:', err)
        return NextResponse.json(
            { error: 'Failed to create payment order', message: err.message },
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
