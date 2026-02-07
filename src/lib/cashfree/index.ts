/**
 * Cashfree Payment Gateway Integration
 * Using Cashfree Payment Gateway API v2023-08-01
 * 
 * Official Docs: https://www.cashfree.com/docs/api-reference/payments/previous/v2023-08-01/overview
 * 
 * Endpoints:
 * - Sandbox: https://sandbox.cashfree.com/pg
 * - Production: https://api.cashfree.com/pg
 */

import crypto from 'crypto'

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox' // 'sandbox' or 'production'

const BASE_URL = CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'

export interface CreateOrderRequest {
    orderId: string
    orderAmount: number
    orderCurrency?: string
    customerDetails: {
        customerId: string
        customerName: string
        customerEmail: string
        customerPhone: string
    }
    orderMeta?: {
        returnUrl?: string
        notifyUrl?: string
        paymentMethods?: string
    }
    orderNote?: string
}

export interface CashfreeOrderResponse {
    cf_order_id: string
    order_id: string
    order_status: string
    order_token: string
    payment_session_id: string
    order_amount: number
    order_currency: string
    order_expiry_time: string
    customer_details: {
        customer_id: string
        customer_name: string
        customer_email: string
        customer_phone: string
    }
    payments?: {
        url: string
    }
}

export interface PaymentStatus {
    cf_order_id: string
    order_id: string
    order_status: 'ACTIVE' | 'PAID' | 'EXPIRED'
    order_amount: number
    order_currency: string
    cf_payment_id?: string
    payment_status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'USER_DROPPED'
    payment_amount?: number
    payment_method?: string
    payment_time?: string
}

/**
 * Create a new payment order with Cashfree
 */
export async function createOrder(request: CreateOrderRequest): Promise<CashfreeOrderResponse> {
    const response = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
            order_id: request.orderId,
            order_amount: request.orderAmount,
            order_currency: request.orderCurrency || 'INR',
            customer_details: {
                customer_id: request.customerDetails.customerId,
                customer_name: request.customerDetails.customerName,
                customer_email: request.customerDetails.customerEmail,
                customer_phone: request.customerDetails.customerPhone,
            },
            order_meta: {
                return_url: request.orderMeta?.returnUrl,
                notify_url: request.orderMeta?.notifyUrl,
                payment_methods: request.orderMeta?.paymentMethods,
            },
            order_note: request.orderNote,
        }),
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('Cashfree create order error:', error)
        throw new Error(error.message || 'Failed to create Cashfree order')
    }

    const data = await response.json()
    console.log('Cashfree order response:', JSON.stringify(data, null, 2))
    return data
}

/**
 * Get payment status for an order
 */
export async function getOrderStatus(orderId: string): Promise<PaymentStatus> {
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
        method: 'GET',
        headers: {
            'x-api-version': '2023-08-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch order status')
    }

    return response.json()
}

/**
 * Get payment details for an order
 */
export async function getPayments(orderId: string): Promise<any[]> {
    const response = await fetch(`${BASE_URL}/orders/${orderId}/payments`, {
        method: 'GET',
        headers: {
            'x-api-version': '2023-08-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch payments')
    }

    return response.json()
}

/**
 * Verify webhook signature from Cashfree
 * Based on: https://www.cashfree.com/docs/payments/webhooks#webhook-signature-verification
 * 
 * signature = Base64Encode(HMACSHA256(timestamp + rawBody, secretKey))
 */
export function verifyWebhookSignature(
    rawBody: string,
    timestamp: string,
    signature: string
): boolean {
    const signedPayload = timestamp + rawBody
    const expectedSignature = crypto
        .createHmac('sha256', CASHFREE_SECRET_KEY)
        .update(signedPayload)
        .digest('base64')

    return signature === expectedSignature
}

/**
 * Generate unique order ID
 */
export function generateOrderId(eventId: string, studentId: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORD-${timestamp}-${random}`
}

/**
 * Generate unique link ID for payment links
 */
export function generateLinkId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `LINK-${timestamp}-${random}`
}

export interface PaymentLinkRequest {
    linkId: string
    linkAmount: number
    linkCurrency?: string
    linkPurpose: string
    customerDetails: {
        customerName: string
        customerEmail: string
        customerPhone: string
    }
    linkMeta?: {
        returnUrl?: string
        notifyUrl?: string
    }
    linkExpiryTime?: string
}

export interface PaymentLinkResponse {
    cf_link_id: string
    link_id: string
    link_status: string
    link_currency: string
    link_amount: number
    link_url: string
    link_expiry_time: string
    link_purpose: string
}

/**
 * Create a Payment Link (shareable URL that works in any browser)
 * This is the recommended approach for mobile apps without SDK
 * 
 * @see https://www.cashfree.com/docs/api-reference/payments/latest/payment-links/create
 */
export async function createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const response = await fetch(`${BASE_URL}/links`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
            link_id: request.linkId,
            link_amount: request.linkAmount,
            link_currency: request.linkCurrency || 'INR',
            link_purpose: request.linkPurpose,
            customer_details: {
                customer_name: request.customerDetails.customerName,
                customer_email: request.customerDetails.customerEmail,
                customer_phone: request.customerDetails.customerPhone,
            },
            link_meta: {
                return_url: request.linkMeta?.returnUrl,
                notify_url: request.linkMeta?.notifyUrl,
            },
            link_expiry_time: request.linkExpiryTime,
            link_auto_reminders: false,
            link_notify: {
                send_sms: false,
                send_email: false,
            },
        }),
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('Cashfree create payment link error:', error)
        throw new Error(error.message || 'Failed to create payment link')
    }

    const data = await response.json()
    console.log('Cashfree payment link response:', JSON.stringify(data, null, 2))
    return data
}

/**
 * Get payment link status
 */
export async function getPaymentLinkStatus(linkId: string): Promise<PaymentLinkResponse> {
    const response = await fetch(`${BASE_URL}/links/${linkId}`, {
        method: 'GET',
        headers: {
            'x-api-version': '2023-08-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
        },
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch payment link status')
    }

    return response.json()
}

/**
 * Get payment link URL for frontend redirect
 * NOTE: This is for the orders API approach (requires SDK/JS)
 * For mobile apps, use createPaymentLink() which returns link_url directly
 */
export function getPaymentUrl(paymentSessionId: string): string {
    const basePaymentUrl = CASHFREE_ENV === 'production'
        ? 'https://api.cashfree.com/pg/orders/pay'
        : 'https://sandbox.cashfree.com/pg/orders/pay'

    return `${basePaymentUrl}/${paymentSessionId}`
}
