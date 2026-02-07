# Student App (SyncEvents) - Payment Integration

> **Date:** December 31, 2025  
> **Status:** Ready for Integration  
> **Last Updated:** After Cashfree Official Docs Verification  
> **Copy these prompts to the Student App AI assistant**

---

## ⚠️ IMPORTANT CORRECTIONS (READ FIRST)

### API URL Configuration
**DO NOT use Supabase Edge Functions URL.** The payment APIs are hosted on the **Next.js Admin App**.

```typescript
// ❌ WRONG - Don't use this
const API_URL = 'https://khpcilrcngwnsdytgubq.supabase.co/functions/v1'

// ✅ CORRECT - Use Admin App URL
// For local development (replace with your machine's IP):
const API_URL = 'http://192.168.X.X:3000/api'

// For production (when deployed):
const API_URL = 'https://your-admin-app-domain.vercel.app/api'
```

### Phone Number
The `students` table now has a `phone` column. You can:
1. Store phone during signup/profile update
2. Or prompt user before payment

### Test Cards (Sandbox)
- **Success:** `4111111111111111` (any future expiry, any CVV)
- **Failure:** `4111111111111112`
- **UPI:** Use `success@upi` for test

---

## 🔄 Payment Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STUDENT PAYMENT FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Student views paid event                                         │
│     └── Shows registration fee & "Register" button                   │
│                                                                      │
│  2. Student clicks "Register"                                        │
│     └── App calls POST /api/payments/create-order                    │
│     └── Returns payment_link (Cashfree checkout URL)                 │
│                                                                      │
│  3. Student redirected to Cashfree payment page                      │
│     └── Pays via UPI/Card/NetBanking                                 │
│                                                                      │
│  4. Payment completed                                                │
│     └── Cashfree redirects to callback URL                           │
│     └── Webhook updates payment status                               │
│                                                                      │
│  5. Registration confirmed                                           │
│     └── Student can now attend event                                 │
│     └── Will receive certificate after attendance                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 New Database Tables

### `event_registrations`
```sql
- id (uuid, PK)
- event_id (uuid, FK -> events)
- student_id (uuid, FK -> students)
- status ('pending' | 'confirmed' | 'cancelled' | 'refunded')
- payment_required (boolean)
- registered_at (timestamptz)
- confirmed_at (timestamptz, nullable)
```

### `payments`
```sql
- id (uuid, PK)
- order_id (text, unique)
- cf_order_id (text)
- registration_id (uuid, FK -> event_registrations)
- student_id (uuid, FK -> students)
- event_id (uuid, FK -> events)
- amount (decimal)
- currency (text, default: 'INR')
- status ('pending' | 'processing' | 'success' | 'failed' | 'refunded')
- payment_link (text)
- payment_session_id (text)
- cf_payment_id (text, nullable)
- payment_method (text, nullable)
- payment_time (timestamptz, nullable)
```

### Events table (new columns)
```sql
- registration_fee (decimal, default: 0)
- is_paid_event (boolean, default: false)
- registration_deadline (timestamptz, nullable)
```

---

## 🟢 PROMPT 1: Add Payment Types

```
## Task: Add Payment Types to SyncEvents

Add these TypeScript types to `src/lib/types.ts`:

```typescript
// Payment types
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded'
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'

export interface EventRegistration {
    id: string
    event_id: string
    student_id: string
    status: RegistrationStatus
    payment_required: boolean
    registered_at: string
    confirmed_at?: string
    // Joined
    event?: Event
}

export interface Payment {
    id: string
    order_id: string
    cf_order_id?: string
    registration_id?: string
    student_id: string
    event_id: string
    amount: number
    currency: string
    status: PaymentStatus
    payment_link?: string
    payment_time?: string
    // Joined
    event?: Event
}
```

Also update the `Event` interface to include:
```typescript
// Add to Event interface
registration_fee?: number
is_paid_event?: boolean
registration_deadline?: string
```
```

---

## 🟢 PROMPT 2: Create Payment Service

```
## Task: Create Payment Service

Create file `src/services/paymentService.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import * as WebBrowser from 'expo-web-browser'

// ⚠️ IMPORTANT: Use your Admin App's IP/URL, NOT Supabase Edge Functions
// For local dev, use your computer's local IP (find via ipconfig/ifconfig)
const API_URL = 'http://192.168.1.100:3000/api' // Replace with your actual IP

interface CreateOrderResponse {
    success: boolean
    orderId: string
    cfOrderId: string
    paymentSessionId: string
    paymentLink: string
    amount: number
}

/**
 * Create payment order for event registration
 * Calls the Admin App's Next.js API route
 */
export async function createPaymentOrder(
    eventId: string, 
    studentId: string,
    customerPhone: string
): Promise<CreateOrderResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
        throw new Error('Not authenticated')
    }
    
    const response = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            eventId,
            studentId,
            customerPhone,
        }),
    })

    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create payment order')
    }

    return data
}

/**
 * Open Cashfree payment page in browser
 */
export async function openPaymentPage(paymentLink: string): Promise<WebBrowser.WebBrowserResult> {
    return await WebBrowser.openBrowserAsync(paymentLink, {
        dismissButtonStyle: 'cancel',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    })
}

/**
 * Check payment status by order ID
 */
export async function checkPaymentStatus(orderId: string): Promise<{
    status: string
    payment_status: string
    amount: number
    event_name?: string
}> {
    const response = await fetch(`${API_URL}/payments/status?order_id=${orderId}`)
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.message || 'Failed to check payment status')
    }

    return data
}

/**
 * Get student's registrations from Supabase
 */
export async function getMyRegistrations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!student) return []

    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
            *,
            event:events(*)
        `)
        .eq('student_id', student.id)
        .order('registered_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Get student's payment history from Supabase
 */
export async function getMyPayments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!student) return []

    const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            event:events(id, name)
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Get current student's ID
 */
export async function getCurrentStudentId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from('students')
        .select('id, phone')
        .eq('user_id', user.id)
        .single()

    return student?.id || null
}

/**
 * Get current student's phone (for payment)
 */
export async function getCurrentStudentPhone(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from('students')
        .select('phone')
        .eq('user_id', user.id)
        .single()

    return student?.phone || null
}

/**
 * Update student's phone number
 */
export async function updateStudentPhone(phone: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('students')
        .update({ phone })
        .eq('user_id', user.id)

    if (error) throw error
}
```

Install required package:
```bash
npx expo install expo-web-browser
```
```

---

## 🟢 PROMPT 3: Create Event Registration Screen

```
## Task: Create Event Registration Flow

Update the Event Detail screen to show registration option for paid events.

Add to your event detail screen:

```tsx
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native'
import { 
    createPaymentOrder, 
    openPaymentPage, 
    getCurrentStudentId,
    getCurrentStudentPhone,
    updateStudentPhone,
    checkPaymentStatus 
} from '@/services/paymentService'
import { supabase } from '@/lib/supabase'

interface Props {
    event: Event
}

function EventRegistration({ event }: Props) {
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [registered, setRegistered] = useState(false)
    const [registrationStatus, setRegistrationStatus] = useState<string | null>(null)
    const [studentId, setStudentId] = useState<string | null>(null)
    const [showPhoneModal, setShowPhoneModal] = useState(false)
    const [phone, setPhone] = useState('')

    // Check existing registration on mount
    useEffect(() => {
        checkExistingRegistration()
    }, [event.id])

    const checkExistingRegistration = async () => {
        try {
            setChecking(true)
            const id = await getCurrentStudentId()
            setStudentId(id)
            
            if (!id) return

            const { data } = await supabase
                .from('event_registrations')
                .select('status')
                .eq('event_id', event.id)
                .eq('student_id', id)
                .single()

            if (data) {
                setRegistered(true)
                setRegistrationStatus(data.status)
            }
        } catch (error) {
            // No existing registration
        } finally {
            setChecking(false)
        }
    }

    // Check if event is paid
    if (!event.is_paid_event || !event.registration_fee) {
        return null // Free event, no registration needed
    }

    const handleRegister = async () => {
        if (!studentId) {
            Alert.alert('Error', 'Student profile not found')
            return
        }

        // Check if phone exists
        const existingPhone = await getCurrentStudentPhone()
        if (!existingPhone) {
            setShowPhoneModal(true)
            return
        }

        await initiatePayment(existingPhone)
    }

    const initiatePayment = async (customerPhone: string) => {
        try {
            setLoading(true)

            // Create payment order via Admin App API
            const { paymentLink, orderId, amount } = await createPaymentOrder(
                event.id,
                studentId!,
                customerPhone
            )

            // Open Cashfree payment page in browser
            const result = await openPaymentPage(paymentLink)

            // After browser closes, check payment status
            if (result.type === 'dismiss' || result.type === 'cancel') {
                // Poll for payment status
                setTimeout(async () => {
                    try {
                        const status = await checkPaymentStatus(orderId)
                        if (status.payment_status === 'success') {
                            Alert.alert('Success', 'Payment successful! You are now registered.')
                            setRegistered(true)
                            setRegistrationStatus('confirmed')
                        } else {
                            Alert.alert(
                                'Payment Status',
                                'Payment is being processed. Check "My Registrations" for status.',
                                [{ text: 'OK' }]
                            )
                        }
                    } catch (e) {
                        // Status check failed, but payment may still process via webhook
                    }
                }, 2000)
            }

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to initiate payment')
        } finally {
            setLoading(false)
        }
    }

    const handlePhoneSubmit = async () => {
        if (!phone || phone.length !== 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number')
            return
        }

        try {
            await updateStudentPhone(phone)
            setShowPhoneModal(false)
            await initiatePayment(phone)
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save phone number')
        }
    }

    if (checking) {
        return (
            <View className="bg-white p-4 rounded-lg">
                <ActivityIndicator />
            </View>
        )
    }

    if (registered) {
        const statusColor = registrationStatus === 'confirmed' ? 'green' : 'yellow'
        return (
            <View className={`bg-${statusColor}-100 p-4 rounded-lg`}>
                <Text className={`text-${statusColor}-800 font-medium`}>
                    {registrationStatus === 'confirmed' 
                        ? '✓ You are registered for this event'
                        : '⏳ Registration pending - awaiting payment confirmation'}
                </Text>
            </View>
        )
    }

    return (
        <>
            <View className="bg-white p-4 rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Registration Required</Text>
                <Text className="text-gray-600 mb-4">
                    This is a paid event. Registration fee: ₹{event.registration_fee}
                </Text>
                
                <TouchableOpacity
                    onPress={handleRegister}
                    disabled={loading}
                    className={`py-3 px-4 rounded-lg ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-center font-medium">
                            Pay ₹{event.registration_fee} & Register
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Phone Number Modal */}
            <Modal visible={showPhoneModal} transparent animationType="slide">
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white p-6 rounded-xl w-80">
                        <Text className="text-lg font-bold mb-2">Phone Number Required</Text>
                        <Text className="text-gray-600 mb-4">
                            Cashfree requires your phone number for payment
                        </Text>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter 10-digit phone"
                            keyboardType="phone-pad"
                            maxLength={10}
                            className="border border-gray-300 rounded-lg p-3 mb-4"
                        />
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => setShowPhoneModal(false)}
                                className="flex-1 py-2 rounded-lg bg-gray-200"
                            >
                                <Text className="text-center">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handlePhoneSubmit}
                                className="flex-1 py-2 rounded-lg bg-blue-600"
                            >
                                <Text className="text-white text-center">Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}
```
```

---

## 🟢 PROMPT 4: Create My Registrations Screen

```
## Task: Create Registrations Screen

Create a screen to show student's event registrations and payment history.

Create `src/screens/MyRegistrationsScreen.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getMyRegistrations, getMyPayments, checkPaymentStatus } from '@/services/paymentService'

export default function MyRegistrationsScreen() {
    const [registrations, setRegistrations] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadData = async () => {
        try {
            const data = await getMyRegistrations()
            setRegistrations(data)
        } catch (error) {
            console.error('Error loading registrations:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-green-600'
            case 'pending': return 'text-yellow-600'
            case 'cancelled': return 'text-red-600'
            default: return 'text-gray-600'
        }
    }

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100'
            case 'pending': return 'bg-yellow-100'
            case 'cancelled': return 'bg-red-100'
            default: return 'bg-gray-100'
        }
    }

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-white p-4 rounded-lg mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-lg font-bold flex-1">
                    {item.event?.name || 'Unknown Event'}
                </Text>
                <View className={`px-2 py-1 rounded ${getStatusBg(item.status)}`}>
                    <Text className={`text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
            
            <Text className="text-gray-600 text-sm">
                {new Date(item.event?.event_date).toLocaleDateString()}
            </Text>
            
            {item.payment_required && (
                <Text className="text-gray-500 text-xs mt-1">
                    Payment required
                </Text>
            )}
            
            {item.confirmed_at && (
                <Text className="text-green-600 text-xs mt-1">
                    Confirmed: {new Date(item.confirmed_at).toLocaleString()}
                </Text>
            )}
        </View>
    )

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <Text>Loading...</Text>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="p-4">
                <Text className="text-2xl font-bold mb-4">My Registrations</Text>
                
                <FlatList
                    data={registrations}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true)
                                loadData()
                            }}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center py-8">
                            <Text className="text-gray-500">No registrations yet</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    )
}
```
```

---

## 🟢 PROMPT 5: Update Events List to Show Paid Badge

```
## Task: Show Paid Event Badge

Update your Events List screen to show a badge for paid events:

```tsx
// In your event card component, add:

{event.is_paid_event && (
    <View className="absolute top-2 right-2 bg-yellow-500 px-2 py-1 rounded">
        <Text className="text-white text-xs font-bold">
            ₹{event.registration_fee}
        </Text>
    </View>
)}

// Or as a row item:
{event.is_paid_event && (
    <View className="flex-row items-center mt-2">
        <Text className="text-yellow-600 font-medium">
            Registration Fee: ₹{event.registration_fee}
        </Text>
    </View>
)}
```

Also update the events query to include new fields:
```typescript
const { data: events } = await supabase
    .from('events')
    .select('*, is_paid_event, registration_fee, registration_deadline')
    .in('status', ['authorized', 'attendance_open'])
    .order('event_date', { ascending: true })
```
```

---

## 📝 API Endpoints Reference

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/payments/create-order` | Create Cashfree payment order | Bearer Token |
| GET | `/api/payments/status?order_id=X` | Check payment status | None |
| GET | `/api/payments/callback` | Payment redirect callback | None |
| POST | `/api/payments/webhook` | Cashfree webhook handler | Signature |

**Base URL:** Your Admin App URL (e.g., `http://192.168.1.100:3000/api` for local dev)

---

## 🔐 RLS Policies Already Applied

Students can:
- View their own registrations
- Insert their own registrations
- View their own payments

---

## ⚠️ Important Notes

1. **API URL**: Use the Admin App's Next.js API URL, **NOT** Supabase Edge Functions.

2. **Phone Number**: The `students` table now has a `phone` column. Store it during profile setup or prompt before payment.

3. **WebBrowser**: Using `expo-web-browser` for payment redirect. Install with `npx expo install expo-web-browser`.

4. **Deep Linking**: For better UX, set up deep linking to handle payment callback in-app (optional).

5. **Payment Confirmation**: Actual confirmation happens via webhook. The UI should poll status or listen to Supabase realtime.

6. **Test Mode**: Currently using Cashfree sandbox. Test credentials:
   - **Card Success:** `4111111111111111` (any future expiry, any CVV)
   - **Card Failure:** `4111111111111112`
   - **UPI Success:** `success@upi`
   - **UPI Failure:** `failure@upi`

7. **Local Testing**: When testing locally:
   - Run Admin App: `npm run dev` (starts on port 3000)
   - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update `API_URL` in paymentService.ts

8. **Network**: Ensure phone and computer are on same WiFi network for local testing.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Network request failed" | Check API_URL, ensure same WiFi |
| "Unauthorized" | Check auth token is being sent |
| "Event not found" | Verify eventId is correct UUID |
| "Student not found" | Ensure student profile exists |
| Payment stuck on "pending" | Webhook may not have fired; poll status |

---

*Generated: December 31, 2025*
*Verified against Cashfree Official Docs: https://www.cashfree.com/docs/reference/pgcreateorder*
