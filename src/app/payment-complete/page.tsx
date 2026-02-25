/**
 * Payment Complete Page
 * 
 * This page is shown after Cashfree payment redirect.
 * For mobile app users using expo-web-browser, the key behavior is:
 * - User sees this page briefly
 * - User taps the X / Done button in the browser
 * - expo-web-browser resolves and the app auto-checks payment status
 * 
 * We also attempt deep link redirect via custom scheme (syncevents://)
 * as a fallback for apps that support it.
 */

export default async function PaymentCompletePage({
    searchParams,
}: {
    searchParams: Promise<{ order_id?: string; status?: string }>
}) {
    const params = await searchParams
    const orderId = params.order_id || ''
    const status = params.status || 'processing'

    const isSuccess = status === 'success'
    const isFailed = status === 'failed'

    const statusColor = isSuccess ? '#4FD1C5' : isFailed ? '#FC8181' : '#F6E05E'

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Payment {isSuccess ? 'Successful' : isFailed ? 'Failed' : 'Processing'}</title>
            </head>
            <body
                style={{
                    margin: 0,
                    padding: 20,
                    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
                    background: '#0A0F1C',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ fontSize: 72, marginBottom: 16 }}>
                        {isSuccess ? '✅' : isFailed ? '❌' : '⏳'}
                    </div>
                    <h1 style={{ fontSize: 28, marginBottom: 12, color: statusColor, fontWeight: 700 }}>
                        {isSuccess
                            ? 'Payment Successful!'
                            : isFailed
                                ? 'Payment Failed'
                                : 'Payment Processing...'}
                    </h1>
                    <p style={{ fontSize: 16, color: '#A0AEC0', marginBottom: 24, lineHeight: 1.6 }}>
                        {isSuccess
                            ? 'Your registration has been confirmed.'
                            : isFailed
                                ? 'Something went wrong with your payment.'
                                : 'Your payment is being verified.'}
                    </p>

                    {/* Prominent close instruction */}
                    <div
                        style={{
                            background: 'rgba(79, 209, 197, 0.1)',
                            border: '2px dashed #4FD1C5',
                            borderRadius: 12,
                            padding: '20px 16px',
                            marginBottom: 20,
                        }}
                    >
                        <p style={{ fontSize: 20, color: '#4FD1C5', fontWeight: 700, marginBottom: 8 }}>
                            👆 Tap the X button above
                        </p>
                        <p style={{ fontSize: 14, color: '#A0AEC0', lineHeight: 1.5, margin: 0 }}>
                            Close this browser to return to the app.
                            <br />
                            Your payment status will be updated automatically.
                        </p>
                    </div>

                    {orderId && (
                        <p style={{ fontSize: 11, color: '#4A5568', fontFamily: 'monospace', marginTop: 16 }}>
                            Order: {orderId}
                        </p>
                    )}
                </div>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            // Try deep link first (for apps with custom scheme)
                            var deepLink = 'syncevents://payment-complete?status=${status}&order_id=${orderId}';
                            var expScheme = 'exp://payment-complete?status=${status}&order_id=${orderId}';
                            
                            // Attempt deep link redirect after short delay
                            setTimeout(function() {
                                try { window.location.href = deepLink; } catch(e) {}
                            }, 1500);
                            
                            // Also try window.close as fallback
                            setTimeout(function() {
                                try { window.close(); } catch(e) {}
                            }, 2000);
                        `,
                    }}
                />
            </body>
        </html>
    )
}
