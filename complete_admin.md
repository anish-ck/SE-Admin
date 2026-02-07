# Certificate Verification Admin System - Complete Documentation

## Project Overview

A **mobile-first admin web application** for college certificate verification with blockchain integration. Faculty and event managers can create events, manage attendance via QR scanning, issue certificates, and store certificate hashes on the Polygon blockchain for tamper-proof verification.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.1 | React framework with App Router |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.4.1 | Styling (mobile-first) |
| **Supabase** | - | Database, Auth, Storage |
| **Polygon Amoy** | Testnet | Blockchain (certificate hashes) |
| **ethers.js** | 6.x | Blockchain interaction |
| **html5-qrcode** | 2.3.8 | QR code scanning |
| **crypto-js** | 4.2.0 | SHA-256 hashing |

---

## Supabase Project Details

| Property | Value |
|----------|-------|
| **Project ID** | `khpcilrcngwnsdytgubq` |
| **Project URL** | `https://khpcilrcngwnsdytgubq.supabase.co` |
| **Anon Key** | In `.env.local` file |
| **Region** | Check Supabase dashboard |

### Database Tables

#### 1. `profiles` - User profiles linked to auth.users
```sql
- id (uuid, PK, FK -> auth.users.id)
- email (text)
- full_name (text)
- role (user_role enum: 'admin', 'faculty', 'event_manager')
- department (text, nullable)
- phone (text, nullable)
- is_active (boolean, default: true)
- created_at, updated_at (timestamptz)
```

#### 2. `events` - Event/workshop information
```sql
- id (uuid, PK)
- name (text)
- description (text, nullable)
- event_date (date)
- event_time (time, nullable)
- venue (text, nullable)
- department (text, nullable)
- max_participants (integer, nullable)
- status (event_status enum: 'draft', 'authorized', 'attendance_open', 'attendance_locked', 'certificates_issued')
- template_id (uuid, FK -> certificate_templates.id)
- created_by (uuid, FK -> profiles.id)
- authorized_by (uuid, FK -> profiles.id, nullable)
- authorized_at (timestamptz, nullable)
- attendance_locked_at (timestamptz, nullable)
- attendance_locked_by (uuid, FK -> profiles.id, nullable)
- certificates_issued_at (timestamptz, nullable)
- created_at, updated_at (timestamptz)
```

#### 3. `students` - Student master data (10 sample records exist)
```sql
- id (uuid, PK)
- student_id (text, unique) -- e.g., "CS2021001"
- name (text)
- email (text, nullable)
- department (text, nullable)
- year_of_study (integer, nullable)
- qr_code_data (text, unique) -- QR code content
- created_at, updated_at (timestamptz)
```

#### 4. `attendance` - Event attendance records
```sql
- id (uuid, PK)
- event_id (uuid, FK -> events.id)
- student_id (uuid, FK -> students.id)
- marked_at (timestamptz, default: now())
- marked_by (uuid, FK -> profiles.id)
- check_in_method (text, default: 'qr_scan')
- notes (text, nullable)
- UNIQUE(event_id, student_id)
```

#### 5. `certificates` - Issued certificates
```sql
- id (uuid, PK)
- certificate_number (text, unique) -- e.g., "CERT-2025-ABC123"
- event_id (uuid, FK -> events.id)
- student_id (uuid, FK -> students.id)
- attendance_id (uuid, FK -> attendance.id)
- student_name (text) -- Denormalized for hash
- student_roll (text) -- Denormalized for hash
- event_name (text) -- Denormalized for hash
- event_date (date) -- Denormalized for hash
- institution_name (text, default: 'College Name')
- payload_hash (text) -- SHA-256 hash of certificate data
- blockchain_tx_hash (text, nullable) -- Polygon transaction hash
- blockchain_stored_at (timestamptz, nullable)
- template_id (uuid, FK -> certificate_templates.id, nullable)
- issued_by (uuid, FK -> profiles.id)
- issued_at (timestamptz, default: now())
```

#### 6. `certificate_templates` - Certificate design templates
```sql
- id (uuid, PK)
- name (text)
- description (text, nullable)
- template_html (text) -- HTML template for PDF generation
- preview_image_url (text, nullable)
- is_active (boolean, default: true)
- created_by (uuid, FK -> profiles.id, nullable)
- created_at, updated_at (timestamptz)
```

**Existing Templates:**
1. Standard Certificate
2. Workshop Certificate  
3. Achievement Award
4. Participation Certificate

#### 7. `audit_logs` - System audit trail
```sql
- id (uuid, PK)
- action (audit_action enum)
- user_id (uuid, FK -> profiles.id, nullable)
- user_email (text, nullable)
- resource_type (text, nullable)
- resource_id (uuid, nullable)
- details (jsonb, nullable)
- ip_address (text, nullable)
- user_agent (text, nullable)
- created_at (timestamptz, default: now())
```

#### 8. `blockchain_config` - Blockchain network configuration
```sql
- id (uuid, PK)
- network_name (text, default: 'polygon_amoy')
- chain_id (integer, default: 80002)
- contract_address (text, nullable) -- NEEDS TO BE SET AFTER DEPLOYMENT
- rpc_url (text, default: 'https://rpc-amoy.polygon.technology')
- explorer_url (text, default: 'https://amoy.polygonscan.com')
- is_active (boolean, default: true)
- created_at, updated_at (timestamptz)
```

#### 9. `blockchain_queue` - Queue for pending blockchain transactions
```sql
- id (uuid, PK)
- certificate_id (uuid, FK -> certificates.id)
- payload_hash (text)
- status (text, default: 'pending') -- 'pending', 'processing', 'confirmed', 'failed'
- attempts (integer, default: 0)
- last_error (text, nullable)
- tx_hash (text, nullable)
- created_at (timestamptz, default: now())
- processed_at (timestamptz, nullable)
```

### Database Functions (RPC)

```sql
-- Authorize an event (changes status from 'draft' to 'authorized')
authorize_event(p_event_id uuid)

-- Open attendance (changes status from 'authorized' to 'attendance_open')
open_attendance(p_event_id uuid)

-- Lock attendance (changes status from 'attendance_open' to 'attendance_locked')
lock_attendance(p_event_id uuid)

-- Log audit entry
log_audit(p_action, p_user_id, p_user_email, p_resource_type, p_resource_id, p_details)

-- Generate unique certificate number
generate_certificate_number() RETURNS text
```

### Row Level Security (RLS) Policies

All tables have RLS enabled with these policies:
- `profiles`: Users can only access their own profile
- `events`: Authenticated users have full access
- `students`: Authenticated users can read
- `attendance`: Authenticated users have full access
- `certificates`: Authenticated users have full access
- `certificate_templates`: Authenticated users can read
- `audit_logs`: Authenticated users can read and insert
- `blockchain_config`: Authenticated users can read
- `blockchain_queue`: Authenticated users have full access

### Auth Trigger

When a new user signs up, a trigger automatically creates their profile:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Project Structure

```
SE_Admin/
├── contracts/
│   └── CertificateRegistry.sol      # Solidity smart contract
├── public/
│   ├── icon-192.png                 # PWA icon (user added)
│   ├── icon-512.png                 # PWA icon (user added)
│   └── manifest.json                # PWA manifest
├── src/
│   ├── app/
│   │   ├── (dashboard)/             # Protected routes with bottom nav
│   │   │   ├── layout.tsx           # Dashboard layout with BottomNav
│   │   │   ├── dashboard/page.tsx   # Main dashboard
│   │   │   ├── events/
│   │   │   │   ├── page.tsx         # Events list
│   │   │   │   ├── new/page.tsx     # Create event form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Event detail
│   │   │   │       └── event-actions.tsx  # Action buttons
│   │   │   ├── attendance/
│   │   │   │   ├── page.tsx         # Attendance page
│   │   │   │   ├── attendance-client.tsx  # Client component
│   │   │   │   └── qr-scanner.tsx   # QR scanner component
│   │   │   ├── certificates/
│   │   │   │   ├── page.tsx         # Certificates list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx     # Certificate detail
│   │   │   │   │   └── copy-button.tsx
│   │   │   │   └── issue/
│   │   │   │       ├── page.tsx     # Issue certificates
│   │   │   │       └── issue-client.tsx
│   │   │   └── profile/
│   │   │       ├── page.tsx         # Profile page
│   │   │       └── profile-client.tsx
│   │   ├── api/
│   │   │   ├── verify/route.ts      # Public certificate verification API
│   │   │   └── blockchain/
│   │   │       └── store/route.ts   # Blockchain queue processing API
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── signup/page.tsx      # Signup page
│   │   ├── verify/page.tsx          # Public verification page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── bottom-nav.tsx           # Mobile bottom navigation
│   │   ├── page-header.tsx          # Page header with back button
│   │   ├── loading.tsx              # Loading spinner
│   │   ├── alert.tsx                # Alert/toast component
│   │   ├── modal.tsx                # Modal dialog
│   │   └── empty-state.tsx          # Empty state placeholder
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   ├── server.ts            # Server Supabase client
│   │   │   └── middleware.ts        # Auth middleware helper
│   │   ├── blockchain/
│   │   │   └── index.ts             # Blockchain interaction (ethers.js)
│   │   ├── hash.ts                  # SHA-256 hash generation
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── utils.ts                 # Utility functions
│   └── middleware.ts                # Next.js middleware for auth
├── .env.local                       # Environment variables
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Key Files Explained

### 1. Smart Contract (`contracts/CertificateRegistry.sol`)

```solidity
// Stores certificate hashes on Polygon
contract CertificateRegistry {
    mapping(bytes32 => bool) public certificateExists;
    mapping(bytes32 => uint256) public certificateTimestamp;
    mapping(bytes32 => address) public certificateIssuer;
    
    function storeCertificate(bytes32 _hash) external onlyAuthorized;
    function storeCertificateBatch(bytes32[] calldata _hashes) external onlyAuthorized;
    function verifyCertificate(bytes32 _hash) external view returns (bool, uint256, address);
}
```

**Contract Features:**
- Owner and authorized issuer roles
- Single and batch certificate storage
- Verification returns existence, timestamp, and issuer
- Events emitted for all operations

### 2. Hash Generation (`src/lib/hash.ts`)

```typescript
// Creates canonical payload for consistent hashing
export function createCanonicalPayload(data: CertificatePayload): string {
  return JSON.stringify({
    certificate_number: data.certificate_number,
    student_name: data.student_name,
    student_roll: data.student_roll,
    event_name: data.event_name,
    event_date: data.event_date,
    institution_name: data.institution_name,
  })
}

// Computes SHA-256 hash with 0x prefix
export function computePayloadHash(data: CertificatePayload): string {
  const canonical = createCanonicalPayload(data)
  return '0x' + SHA256(canonical).toString()
}
```

### 3. Blockchain Interaction (`src/lib/blockchain/index.ts`)

```typescript
// Server-side only - uses private key
export function getProvider() // Returns JsonRpcProvider for Polygon Amoy
export function getSigner()   // Returns wallet with private key
export async function storeCertificateHash(hash: string)      // Single hash
export async function storeCertificateHashBatch(hashes: string[]) // Batch
export async function verifyCertificateHash(hash: string)     // Verify
```

**Environment Variables Required:**
```env
BLOCKCHAIN_PRIVATE_KEY=0x...  # Wallet private key with MATIC
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  # Deployed contract address
```

### 4. Blockchain API (`src/app/api/blockchain/store/route.ts`)

- `POST /api/blockchain/store` - Process pending queue items, store on blockchain
- `GET /api/blockchain/store` - Get queue status (pending, processing, confirmed, failed counts)

### 5. Verification API (`src/app/api/verify/route.ts`)

- `GET /api/verify?certificate_number=CERT-2025-XXX` - Verify a certificate
- Returns certificate data, computed hash, and blockchain verification status

---

## Event Workflow

```
┌─────────┐    ┌────────────┐    ┌─────────────────┐    ┌───────────────────┐    ┌─────────────────────┐
│  DRAFT  │───▶│ AUTHORIZED │───▶│ ATTENDANCE_OPEN │───▶│ ATTENDANCE_LOCKED │───▶│ CERTIFICATES_ISSUED │
└─────────┘    └────────────┘    └─────────────────┘    └───────────────────┘    └─────────────────────┘
     │              │                    │                       │                        │
     │              │                    │                       │                        │
  Created      Admin/Faculty         Admin/Faculty           Admin/Faculty            Admin/Faculty
  by anyone    authorizes            opens attendance        locks attendance         issues certs
```

### Role Permissions

| Role | Create Event | Authorize | Open/Lock Attendance | Issue Certificates |
|------|-------------|-----------|---------------------|-------------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| faculty | ✅ | ✅ | ✅ | ✅ |
| event_manager | ✅ | ❌ | ❌ | ❌ |

---

## Blockchain Integration - WHAT'S LEFT TO DO

### Step 1: Get Test MATIC

1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Select **Amoy Testnet**
3. Enter your wallet address
4. Get free test MATIC

### Step 2: Deploy Smart Contract

Option A: Using Hardhat
```bash
# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Create hardhat.config.ts
npx hardhat init

# Deploy
npx hardhat run scripts/deploy.js --network amoy
```

Option B: Using Remix IDE
1. Go to [Remix](https://remix.ethereum.org)
2. Create new file, paste `contracts/CertificateRegistry.sol`
3. Compile with Solidity 0.8.19
4. Deploy to Polygon Amoy (connect MetaMask)
5. Copy deployed contract address

### Step 3: Configure Environment

Update `.env.local`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Deployed contract address
BLOCKCHAIN_PRIVATE_KEY=0x...       # Private key of wallet with MATIC
```

### Step 4: Update Database Config

```sql
UPDATE blockchain_config 
SET contract_address = '0x...'  -- Your deployed contract address
WHERE network_name = 'polygon_amoy';
```

### Step 5: Set Authorized Issuer

After deployment, call `setAuthorizedIssuer` on the contract with the wallet address that will issue certificates (the one with BLOCKCHAIN_PRIVATE_KEY).

---

## Current User Accounts

| Email | Role | Password |
|-------|------|----------|
| 99240041423@klu.ac.in | admin | (user set) |
| panish902902@gmail.com | admin | (user set) |

---

## Sample Students in Database

10 students exist with:
- student_id: CS2021001 through CS2021010
- qr_code_data: QR-CS2021001 through QR-CS2021010
- Various departments and years

---

## Known Issues & Notes

1. **QR Scanner on Mobile**: Requires HTTPS. Use `ngrok` for testing or Chrome flag:
   - `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Add: `http://172.31.78.230:3000`

2. **Next.js 16 Warning**: "middleware" file convention deprecated - works but shows warning

3. **Blockchain Not Active**: Contract needs deployment before blockchain features work

4. **Certificate PDF Generation**: Not implemented - only data is stored

---

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /api/verify?certificate_number=X | Verify certificate | No |
| POST | /api/blockchain/store | Process blockchain queue | Yes |
| GET | /api/blockchain/store | Get queue status | Yes |

---

## Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://khpcilrcngwnsdytgubq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Blockchain (NEED TO SET)
NEXT_PUBLIC_CONTRACT_ADDRESS=  # Deploy contract first
BLOCKCHAIN_PRIVATE_KEY=        # Wallet private key with MATIC

# Optional
NEXT_PUBLIC_INSTITUTION_NAME=College Name
```

---

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Deploy contract (after setting up Hardhat)
npx hardhat run scripts/deploy.js --network amoy
```

---

## Next Steps for Blockchain Integration

1. **Create Hardhat config** for Polygon Amoy deployment
2. **Get test MATIC** from faucet
3. **Deploy CertificateRegistry.sol** to Polygon Amoy
4. **Update environment variables** with contract address and private key
5. **Update blockchain_config table** in Supabase
6. **Test the flow**: Issue certificate → Queue processes → Verify on blockchain
7. **Optional**: Create cron job to process blockchain queue automatically

---

## Files Modified in This Session

1. `src/app/globals.css` - Fixed CSS variable issues
2. `src/middleware.ts` - Fixed export name
3. `src/lib/supabase/middleware.ts` - Added type annotations
4. `src/app/(dashboard)/profile/page.tsx` - Added null handling
5. `src/app/(dashboard)/profile/profile-client.tsx` - Added null safety
6. `src/app/(dashboard)/certificates/issue/page.tsx` - Fixed type annotations
7. `src/app/api/blockchain/store/route.ts` - Fixed type annotations
8. `src/app/(dashboard)/attendance/qr-scanner.tsx` - Fixed scanner stop error
9. `public/manifest.json` - Updated icon paths

---

## Database Migrations Applied

8 migrations were applied to create the full schema. All tables, functions, triggers, and RLS policies are in place.

---

## Session: December 31, 2025 - Payment Gateway & Blockchain Fixes

### 1. Cashfree Payment Gateway Integration (MVP)

Implemented Cashfree Payment Links API for event registration payments.

#### New Database Tables

**`event_registrations`** - Track student event registrations
```sql
- id (uuid, PK)
- event_id (uuid, FK -> events.id)
- user_id (uuid, FK -> auth.users.id)
- student_name (text)
- student_email (text)
- student_phone (text)
- registration_number (text, unique)
- status ('pending', 'confirmed', 'cancelled')
- payment_status ('pending', 'completed', 'failed', 'refunded')
- amount (numeric)
- created_at, updated_at (timestamptz)
```

**`payments`** - Track payment transactions
```sql
- id (uuid, PK)
- registration_id (uuid, FK -> event_registrations.id)
- order_id (text, unique) -- Cashfree order ID
- link_id (text) -- Cashfree payment link ID
- amount (numeric)
- currency (text, default 'INR')
- status ('pending', 'paid', 'failed', 'refunded')
- payment_method (text, nullable)
- cashfree_payment_id (text, nullable)
- webhook_data (jsonb, nullable)
- created_at, updated_at (timestamptz)
```

#### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/cashfree/index.ts` | Cashfree API integration (Payment Links) |
| `src/app/api/payments/create-order/route.ts` | Create payment link for registration |
| `src/app/api/payments/status/route.ts` | Check payment status |
| `src/app/api/payments/callback/route.ts` | Handle payment return redirect |
| `src/app/api/payments/webhook/route.ts` | Handle Cashfree webhooks |

#### Cashfree Configuration

Using **Payment Links API** (not Orders API) for shareable payment URLs.

```env
# Add to .env.local
CASHFREE_APP_ID=TEST10853580ec076a5a59f777c4fcae08535801
CASHFREE_SECRET_KEY=cfsk_ma_test_xxx
CASHFREE_ENV=sandbox  # or 'production'
```

#### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/payments/create-order | Create payment link |
| GET | /api/payments/status?order_id=X | Check payment status |
| GET | /api/payments/callback | Handle return from Cashfree |
| POST | /api/payments/webhook | Process Cashfree webhooks |

#### Key Implementation Details

1. **Payment Links API** returns shareable URLs like:
   ```
   https://payments-test.cashfree.com/links/xxx
   ```

2. **Bearer Token Auth** added for mobile app integration:
   ```typescript
   // src/lib/supabase/server.ts
   export function createClientWithToken(accessToken: string)
   export function extractBearerToken(authHeader: string | null)
   ```

3. **Payment Flow**:
   - Mobile app calls `/api/payments/create-order` with Bearer token
   - API creates registration + payment records
   - Returns `link_url` for user to complete payment
   - Status polling via `/api/payments/status`
   - Auto-confirms registration when payment succeeds

---

### 2. Blockchain Certificate Queue Trigger Fix

**Problem**: Certificates were not being automatically added to the blockchain queue.

**Root Cause**: Missing database trigger on `certificates` table.

**Solution**: Created trigger to auto-queue certificates for blockchain storage.

#### Migration Applied: `add_certificate_blockchain_trigger`

```sql
-- Function to auto-add certificates to blockchain queue
CREATE OR REPLACE FUNCTION add_certificate_to_blockchain_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payload_hash IS NOT NULL AND NEW.blockchain_tx_hash IS NULL THEN
    INSERT INTO blockchain_queue (certificate_id, payload_hash, status)
    VALUES (NEW.id, NEW.payload_hash, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires after certificate insert
CREATE TRIGGER certificate_blockchain_queue_trigger
  AFTER INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION add_certificate_to_blockchain_queue();
```

#### Blockchain Processing

The blockchain queue is processed by calling:
```bash
# PowerShell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/blockchain/store"

# Or curl
curl -X POST http://localhost:3000/api/blockchain/store
```

**Note**: Consider setting up a cron job for automatic processing in production.

---

### 3. Environment Variables Updated

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://khpcilrcngwnsdytgubq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...


```

---

### 4. Successful Test Results

| Test | Result |
|------|--------|
| Payment Creation | ✅ Links created successfully |
| Payment Completion | ✅ 2 payments processed (₹200, ₹244) |
| Registration Confirmation | ✅ Auto-confirmed after payment |
| Certificate Issuance | ✅ CERT-2025-000003 issued |
| Blockchain Storage | ✅ TX: `0x34ef5a6d4eec089872b8644806e715b82285710e6f96de820b1389e715667e89` |

---

### 5. Files Modified This Session

| File | Changes |
|------|---------|
| `src/lib/supabase/server.ts` | Added `createClientWithToken()`, `extractBearerToken()` |
| `src/lib/cashfree/index.ts` | New file - Cashfree Payment Links API |
| `src/app/api/payments/*` | New payment API routes |
| Database | 2 new tables, 1 new trigger |

---

*Documentation updated: December 31, 2025*
*Payment gateway integrated, blockchain queue fixed*
