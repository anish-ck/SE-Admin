# System Architecture Diagram

```mermaid
graph TB
    subgraph Client[Client Layer]
        A[Admin PWA \n Next.js 14 App]
        V[Public Verify Page]
    end

    subgraph App[Application Layer - Next.js]
        UI[App Router Pages \n Dashboard, Attendance, Certificates]
        API[Route Handlers \n /api/verify, /api/payments/*, /api/blockchain/store]
        MW[Middleware \n Auth + Role Gate]
    end

    subgraph Data[Data & Identity Layer]
        SA[Supabase Auth]
        DB[(PostgreSQL \n profiles, events, students, attendance, certificates, audit_logs)]
        RLS[RLS Policies]
    end

    subgraph Chain[Blockchain Layer]
        SC[CertificateRegistry.sol]
        POLY[Polygon Amoy]
    end

    subgraph Payment[Payment Layer]
        CF[Cashfree API]
        WH[Webhook/Callback Handlers]
    end

    A --> UI
    V --> UI
    UI --> MW
    UI --> API
    MW --> SA

    API --> SA
    API --> DB
    DB --> RLS

    API --> SC
    SC --> POLY

    API --> CF
    CF --> WH
    WH --> API
```

## Main Data Flows

1. **Authentication & Access Control**
   - Users sign in through Supabase Auth.
   - Next.js middleware and server-side checks enforce role-based access and RLS-backed data authorization.

2. **Event to Certificate Lifecycle**
   - Event manager creates events.
   - Faculty/admin authorizes and manages attendance.
   - Certificate issuance computes hashes and stores records in PostgreSQL.

3. **On-chain Anchoring & Verification**
   - Server route handlers submit certificate hashes to the `CertificateRegistry` contract on Polygon.
   - Public verification checks certificate details against DB + on-chain hash proofs.

4. **Payments Integration**
   - Order creation and status updates go through Cashfree APIs.
   - Webhooks/callbacks update payment state in the app.
