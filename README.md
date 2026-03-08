# Certificate Verification Admin

A mobile-first admin web application for college certificate verification system, secured by Polygon blockchain.

## Features

- **Event Management**: Create, authorize, and manage events
- **Attendance Tracking**: QR code scanning for live attendance
- **Certificate Issuance**: Bulk certificate generation with cryptographic hashes
- **Blockchain Verification**: Store and verify certificate hashes on Polygon
- **Role-based Access**: Admin, Faculty, and Event Manager roles
- **Audit Logging**: Complete audit trail of all actions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Blockchain**: Polygon Amoy Testnet
- **Mobile**: PWA-ready, mobile-first design

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (database already configured)
- Polygon wallet with testnet MATIC (for blockchain operations)

### Installation

1. Clone the repository and install dependencies:

```bash
cd SE_Admin
npm install
```

2. Configure environment variables (already set in `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://khpcilrcngwnsdytgubq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_ADDRESS=your-contract-address
POLYGON_PRIVATE_KEY=your-private-key (server-side only)
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deploying the Smart Contract

The smart contract is in `contracts/CertificateRegistry.sol`. To deploy:

1. Use Remix IDE or Hardhat
2. Deploy to Polygon Amoy testnet
3. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`
4. Update the contract address in Supabase `blockchain_config` table

## Database Schema

The Supabase database includes:

- `profiles` - User profiles with roles
- `events` - Event management
- `students` - Student records
- `attendance` - Attendance tracking
- `certificates` - Issued certificates
- `certificate_templates` - Certificate designs
- `audit_logs` - Action logging
- `blockchain_config` - Blockchain settings
- `blockchain_queue` - Pending blockchain transactions

## User Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access, manage users, view audit logs |
| Faculty | Authorize events, lock attendance, issue certificates |
| Event Manager | Create events, manage attendance |

## System Architecture

See the architecture diagram in [`system_architecture.md`](system_architecture.md).

## Workflow

1. **Create Event**: Event manager creates a new event
2. **Authorize**: Faculty/admin authorizes the event
3. **Open Attendance**: Faculty opens attendance for QR scanning
4. **Mark Attendance**: Scan student QR codes or manual entry
5. **Lock Attendance**: Faculty locks attendance (irreversible)
6. **Issue Certificates**: Generate certificates with cryptographic hashes
7. **Blockchain Storage**: Hashes stored on Polygon (batch processing)
8. **Verification**: Anyone can verify certificates via the public page

## API Endpoints

- `GET /api/verify?cert=CERT-2025-000001` - Verify certificate
- `POST /api/blockchain/store` - Process blockchain queue (cron)
- `GET /api/blockchain/store` - Get queue status

## Security

- Row Level Security (RLS) on all tables
- Role-based access control
- Server-side blockchain operations
- Immutable attendance after lock
- Cryptographic hash verification

## License

MIT
