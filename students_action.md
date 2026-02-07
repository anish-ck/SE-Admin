# Student Project (SyncEvents) - Required Actions

> ⚠️ **DO NOT EXECUTE IN ADMIN PROJECT**  
> These are prompts to be given to the Student Project AI assistant.  
> Copy-paste each prompt section individually when ready.

---

## Current Student Project Status
- **Framework:** React Native Expo SDK 54
- **State:** UI Complete, Mock Data Only
- **Backend:** None (needs Supabase integration)
- **Repo:** `anish-ck/Sync_Events`
- **Location:** `c:\Users\proan\Desktop\SyncEvents`

---

## Shared Backend Configuration

```
Supabase Project ID: khpcilrcngwnsdytgubq
Supabase URL: https://khpcilrcngwnsdytgubq.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGNpbHJjbmd3bnNkeXRndWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDIyNDIsImV4cCI6MjA4MjU3ODI0Mn0.Z6HT9n0r35w79pTfpt8Pnhg1V-O2lA9eiJ-2FhG6-Fo
```

### ✅ Database Already Configured
The following have been applied to Supabase:
- `user_id` column added to `students` table
- RLS policies for student access (view own profile, certificates, attendance)
- RLS policy to view only authorized events (not drafts)
- Trigger to auto-link student on signup by email

---

# 🟡 PROMPT 1: Supabase Setup & Configuration

```
## Task: Add Supabase Integration to SyncEvents

### WHY THIS CHANGE IS NEEDED:
The admin application (SE_Admin) uses Supabase as the backend. The student app must connect to the SAME Supabase project to:
- Fetch real events created by admins
- Display certificates issued to students
- Show student profile with QR code for attendance scanning

### WHAT NEEDS TO BE DONE:

1. Install Supabase dependencies:
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

2. Create file `src/lib/supabase.ts`:
```typescript
import 'react-native-url-polyfill/dist/polyfill'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://khpcilrcngwnsdytgubq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGNpbHJjbmd3bnNkeXRndWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDIyNDIsImV4cCI6MjA4MjU3ODI0Mn0.Z6HT9n0r35w79pTfpt8Pnhg1V-O2lA9eiJ-2FhG6-Fo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

3. Install URL polyfill:
```bash
npx expo install react-native-url-polyfill
```

4. Create file `src/lib/types.ts` with these shared types:
```typescript
export interface Student {
  id: string
  student_id: string  // e.g., "CS2021001"
  name: string
  email?: string
  department?: string
  year_of_study?: number
  qr_code_data: string  // e.g., "QR-CS2021001"
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  description?: string
  event_date: string
  event_time?: string
  venue?: string
  department?: string
  max_participants?: number
  status: 'draft' | 'authorized' | 'attendance_open' | 'attendance_locked' | 'certificates_issued'
  created_at: string
}

export interface Certificate {
  id: string
  certificate_number: string  // e.g., "CERT-2025-000001"
  event_id: string
  student_id: string
  student_name: string
  student_roll: string
  event_name: string
  event_date: string
  institution_name: string
  payload_hash: string  // SHA-256 hash for blockchain verification
  blockchain_tx_hash?: string
  blockchain_stored_at?: string
  issued_at: string
}

export interface Attendance {
  id: string
  event_id: string
  student_id: string
  marked_at: string
  check_in_method: 'qr_scan' | 'manual'
}
```

### WHAT MUST NOT BE CHANGED:
- Do NOT modify the theme (`src/constants/theme.ts`)
- Do NOT change navigation structure
- Do NOT remove any existing screens
- Do NOT change component styling
- Keep all existing UI intact

### VERIFICATION:
After setup, the app should still run without errors:
```bash
npx expo start
```
```

---

# 🟡 PROMPT 2: Student Authentication

```
## Task: Add Student Login/Signup to SyncEvents

### WHY THIS CHANGE IS NEEDED:
Students must authenticate to:
- View their personal certificates
- Display their unique QR code for attendance
- Track their own credits and event participation

### WHAT NEEDS TO BE DONE:

1. Create `src/screens/auth/LoginScreen.tsx`:
- Email/password login form
- Use existing theme colors (primary: #0A0F1C, accent: #4FD1C5)
- Call `supabase.auth.signInWithPassword()`
- On success, navigate to HomeScreen

2. Create `src/screens/auth/SignupScreen.tsx`:
- Registration form with: email, password, full name, student ID, department
- Call `supabase.auth.signUp()` 
- Note: A database trigger will auto-create the student profile

3. Create `src/context/AuthContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Session, User } from '@supabase/supabase-js'
import { Student } from '../lib/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  student: Student | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  student: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchStudent(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchStudent(session.user.id)
      } else {
        setStudent(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchStudent = async (userId: string) => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single()
    setStudent(data)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user: session?.user ?? null, 
      student, 
      loading, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

4. Update `src/navigation/RootNavigator.tsx`:
- Add auth check
- Show LoginScreen if not authenticated
- Show TabNavigator if authenticated

5. Update navigation types in `src/navigation/types.ts`:
```typescript
// Add to RootStackParamList:
Login: undefined
Signup: undefined
```

### WHAT MUST NOT BE CHANGED:
- Keep existing TabNavigator structure
- Keep all 5 tabs intact
- Keep existing screen designs
- Do NOT modify theme colors

### DATABASE NOTE:
The admin has a `students` table. We need to link auth users to students.
Ask admin to add `user_id` column to students table if not present.
```

---

# 🟡 PROMPT 3: Fetch Real Events

```
## Task: Replace Mock Events with Real Supabase Data

### WHY THIS CHANGE IS NEEDED:
Events are created by admins in SE_Admin. Students should see ONLY authorized events (not drafts).

### WHAT NEEDS TO BE DONE:

1. Create `src/hooks/useEvents.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Event } from '../lib/types'

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('status', ['authorized', 'attendance_open', 'attendance_locked', 'certificates_issued'])
      .order('event_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  return { events, loading, error, refetch: fetchEvents }
}
```

2. Update `src/screens/EventsScreen.tsx`:
- Import and use `useEvents()` hook
- Replace `mockEvents` with real data
- Add loading state with ActivityIndicator
- Add pull-to-refresh functionality

3. Update `src/screens/EventDetailsScreen.tsx`:
- Fetch single event by ID from Supabase
- Show real event data

4. Update `src/screens/HomeScreen.tsx`:
- Use `useEvents()` for "Upcoming Events" section
- Limit to 3 events on home

### WHAT MUST NOT BE CHANGED:
- EventCard component design
- Screen layouts
- Navigation flow
- Filter tabs UI (just wire to real data)

### EVENT STATUS MEANINGS (for display):
- `authorized` → "Upcoming" (registration may be open)
- `attendance_open` → "Happening Now" (can check-in)
- `attendance_locked` → "Completed" (waiting for certs)
- `certificates_issued` → "Completed" (certs available)

### DO NOT SHOW:
- Events with status `draft` (admin-only)
```

---

# 🟡 PROMPT 4: Fetch Real Certificates

```
## Task: Replace Mock Certificates with Real Supabase Data

### WHY THIS CHANGE IS NEEDED:
Certificates are issued by admins. Students should only see their OWN certificates.

### WHAT NEEDS TO BE DONE:

1. Create `src/hooks/useCertificates.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Certificate } from '../lib/types'

export function useCertificates() {
  const { student } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (student?.id) {
      fetchCertificates()
    }
  }, [student?.id])

  const fetchCertificates = async () => {
    if (!student?.id) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', student.id)
      .order('issued_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setCertificates(data || [])
    }
    setLoading(false)
  }

  return { certificates, loading, error, refetch: fetchCertificates }
}
```

2. Update `src/screens/CertificatesScreen.tsx`:
- Use `useCertificates()` hook
- Replace mock data with real certificates
- Show empty state if no certificates

3. Update `src/screens/CertificateDetailsScreen.tsx`:
- Fetch certificate by ID
- Display real blockchain hash (`payload_hash`)
- Show blockchain transaction link if `blockchain_tx_hash` exists:
  `https://amoy.polygonscan.com/tx/${blockchain_tx_hash}`

4. Update `src/screens/HomeScreen.tsx`:
- Use real certificate count in stats
- Show recent certificates

### WHAT MUST NOT BE CHANGED:
- CertificateCard component design
- Certificate detail layout
- Navigation flow

### CERTIFICATE FIELDS TO DISPLAY:
- `certificate_number` → Certificate ID
- `event_name` → Event Name
- `event_date` → Event Date
- `issued_at` → Issue Date
- `payload_hash` → Blockchain Hash (show first 10 + last 10 chars)
- `blockchain_tx_hash` → Link to Polygonscan (if exists)
```

---

# 🟡 PROMPT 5: Profile Screen with Real QR Code

```
## Task: Update Profile Screen with Real Student Data & QR Code

### WHY THIS CHANGE IS NEEDED:
The QR code shown on ProfileScreen must match the `qr_code_data` field in the database.
Admins scan this QR code to mark attendance.

### WHAT NEEDS TO BE DONE:

1. Update `src/screens/ProfileScreen.tsx`:
```typescript
import { useAuth } from '../context/AuthContext'

// Inside component:
const { student, user, signOut } = useAuth()

// QR code value MUST be exactly:
const qrValue = student?.qr_code_data  // e.g., "QR-CS2021001"

// Display student info:
// - student.name
// - student.student_id (roll number)
// - student.department
// - student.email (from user)
```

2. The QR code component should encode EXACTLY `student.qr_code_data`:
- Admin's QR scanner looks for this exact value
- Format: `QR-{STUDENT_ID}` (e.g., "QR-CS2021001")

3. Add logout button that calls `signOut()`

### WHAT MUST NOT BE CHANGED:
- QR code visual design
- Profile layout
- Avatar component

### CRITICAL:
The QR code value MUST match what's stored in `students.qr_code_data` column.
Any mismatch will cause attendance marking to fail.
```

---

# 🟡 PROMPT 6: Certificate Verification Screen

```
## Task: Implement Real Certificate Verification

### WHY THIS CHANGE IS NEEDED:
Students (and anyone) should be able to verify certificate authenticity.
The admin has a public API endpoint for this.

### WHAT NEEDS TO BE DONE:

1. Update `src/screens/VerificationResultScreen.tsx`:

The verification API endpoint is:
```
GET https://[ADMIN_APP_URL]/api/verify?cert=CERT-2025-000001
```

Response format:
```json
{
  "valid": true,
  "status": "blockchain_verified" | "hash_verified" | "not_found" | "hash_mismatch",
  "certificate": {
    "certificate_number": "CERT-2025-000001",
    "student_name": "John Doe",
    "student_roll": "CS2021001",
    "event_name": "Workshop Name",
    "event_date": "2025-01-15",
    "institution_name": "College Name",
    "issued_at": "2025-01-16T10:00:00Z"
  },
  "hash": "0x...",
  "blockchain": {
    "exists": true,
    "timestamp": "2025-01-16T10:05:00Z",
    "issuer": "0x..."
  }
}
```

2. Create verification input screen:
- Text input for certificate number
- "Verify" button
- Navigate to results screen

3. Display verification result:
- ✅ Green checkmark if `valid: true` and `status: "blockchain_verified"`
- ✅ Yellow checkmark if `valid: true` and `status: "hash_verified"` (not on blockchain yet)
- ❌ Red X if `valid: false`

### WHAT MUST NOT BE CHANGED:
- Existing screen design patterns
- Color scheme
- Navigation structure

### NOTE:
For now, you can also verify directly via Supabase by:
1. Fetching certificate by number
2. Recomputing hash client-side (same algorithm as admin)
3. Comparing hashes

But the API method is preferred for blockchain verification.
```

---

# 🟡 PROMPT 7: Attendance History (Optional)

```
## Task: Add Attendance History to Student App

### WHY THIS CHANGE IS NEEDED:
Students want to see which events they've attended.

### WHAT NEEDS TO BE DONE:

1. Create `src/hooks/useAttendance.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface AttendanceRecord {
  id: string
  marked_at: string
  event: {
    id: string
    name: string
    event_date: string
    venue: string
  }
}

export function useAttendance() {
  const { student } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (student?.id) {
      fetchAttendance()
    }
  }, [student?.id])

  const fetchAttendance = async () => {
    if (!student?.id) return
    
    const { data } = await supabase
      .from('attendance')
      .select(`
        id,
        marked_at,
        event:events(id, name, event_date, venue)
      `)
      .eq('student_id', student.id)
      .order('marked_at', { ascending: false })

    setAttendance(data || [])
    setLoading(false)
  }

  return { attendance, loading, refetch: fetchAttendance }
}
```

2. Add attendance section to HomeScreen or create AttendanceHistoryScreen

3. Show:
- Event name
- Date attended
- Check-in time

### WHAT MUST NOT BE CHANGED:
- Existing screens
- Navigation tabs (can add as a sub-screen)
```

---

## ~~Admin-Side Actions Needed First~~ ✅ COMPLETED

~~Before running student prompts, the admin project may need these changes:~~

### ✅ Admin Action 1: Add `user_id` to Students Table - DONE
```sql
-- Already applied via migration: add_user_id_to_students
ALTER TABLE students ADD COLUMN user_id uuid REFERENCES auth.users(id);
CREATE INDEX idx_students_user_id ON students(user_id);
```

### ✅ Admin Action 2: Update RLS for Student Access - DONE
```sql
-- Already applied via migration: add_student_rls_policies
-- Students can view own profile, authorized events, own certificates, own attendance
```

### ✅ Admin Action 3: Auto-Link Student on Signup - DONE
```sql
-- Already applied via migration: add_student_signup_handler
-- When a student signs up with email matching students table, user_id is auto-linked
```

---

## Execution Order

1. ~~✅ **Admin**: Run SQL migrations in Supabase~~ **COMPLETED**
2. 🟡 **Student**: Run PROMPT 1 (Supabase Setup)
3. 🟡 **Student**: Run PROMPT 2 (Authentication)
4. 🟡 **Student**: Run PROMPT 3 (Events)
5. 🟡 **Student**: Run PROMPT 4 (Certificates)
6. 🟡 **Student**: Run PROMPT 5 (Profile/QR)
7. 🟡 **Student**: Run PROMPT 6 (Verification)
8. 🟡 **Student**: Run PROMPT 7 (Attendance History - Optional)

---

## Current Students in Database

| Student ID | Name | Email | Department | QR Code |
|------------|------|-------|------------|---------|
| 2024CS001 | Rahul Sharma | rahul.sharma@college.edu | Computer Science | STU-2024CS001-QR |
| 2024CS002 | Priya Patel | priya.patel@college.edu | Computer Science | STU-2024CS002-QR |
| 2024CS003 | Amit Kumar | amit.kumar@college.edu | Computer Science | STU-2024CS003-QR |
| 2024EC001 | Sneha Gupta | sneha.gupta@college.edu | Electronics | STU-2024EC001-QR |
| 2024EC002 | Vikram Singh | vikram.singh@college.edu | Electronics | STU-2024EC002-QR |
| 2024IT001 | Meera Iyer | meera.iyer@college.edu | Information Technology | STU-2024IT001-QR |
| 2024ME001 | Ananya Reddy | ananya.reddy@college.edu | Mechanical | STU-2024ME001-QR |
| 2024ME002 | Karthik Nair | karthik.nair@college.edu | Mechanical | STU-2024ME002-QR |
| 2024CE001 | Divya Menon | divya.menon@college.edu | Civil | STU-2024CE001-QR |
| 2024CE002 | Arjun Das | arjun.das@college.edu | Civil | STU-2024CE002-QR |

> **Note:** When students sign up with these emails, their accounts will auto-link to their student profiles.

---

## Compatibility Checklist

| Feature | Admin | Student | Status |
|---------|-------|---------|--------|
| Events CRUD | ✅ Create/Update | 📖 Read Only | Compatible |
| Attendance | ✅ Mark via QR | 📖 View History | Compatible |
| Certificates | ✅ Issue | 📖 View Own | Compatible |
| QR Code | ✅ Scan | 📖 Display | Compatible |
| Verification | ✅ API Endpoint | 📖 Call API | Compatible |
| Auth | ✅ Admin accounts | 🔄 Student accounts | Needs PROMPT 2 |

---

*Last Updated: December 29, 2025*
