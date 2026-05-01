# Payment Processing Service

A full-stack payment processing platform built with NestJS, GraphQL, PostgreSQL, and React. Handles payment authorization, retry logic, idempotency, and complete audit trail for merchant transactions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│   ┌──────────────────────┐          ┌──────────────────────────┐    │
│   │   React Frontend     │          │   External Merchants     │    │
│   │   (Vite + TanStack)  │          │   (REST API clients)     │    │
│   └──────────┬───────────┘          └────────────┬─────────────┘    │
│              │                                    │                  │
└──────────────┼────────────────────────────────────┼──────────────────┘
               │                                    │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER                                     │
│                                                                      │
│   ┌──────────────────────────┐     ┌────────────────────────────┐   │
│   │   GraphQL API (Apollo)   │     │   REST API (Payment Ctrl)  │   │
│   │   /graphql               │     │   POST /payments           │   │
│   │   Mutations + Queries    │     │   GET /payments/{id}       │   │
│   └──────────┬───────────────┘     └─────────────┬──────────────┘   │
│              │                                    │                   │
└──────────────┼────────────────────────────────────┼──────────────────┘
               │                                    │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                             │
│                                                                      │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │ TransactionSvc   │  │ AuthorizationSvc │  │   MerchantSvc    │  │
│   │ - Create         │  │ - Authorize      │  │ - CRUD           │  │
│   │ - Idempotency    │  │ - Retry          │  │ - API Keys       │  │
│   │ - Status mgmt    │  │ - Acquirer mock  │  │ - Validation     │  │
│   │ - Amount checks  │  │ - Backoff retry  │  │                  │  │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            │                      │                      │            │
│            └──────────────────────┼──────────────────────┘            │
│                                   │                                   │
│                        ┌──────────▼──────────┐                        │
│                        │   AuditService      │                        │
│                        │ - Event logging     │                        │
│                        │ - State tracking    │                        │
│                        │ - Correlation       │                        │
│                        └──────────┬──────────┘                        │
│                                   │                                   │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                      │
│                                                                      │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │   Merchant       │  │   Transaction    │  │ Authorization    │  │
│   │   Repository     │  │   Repository     │  │ Repository       │  │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            │                      │                      │            │
│            └──────────────────────┼──────────────────────┘            │
│                                   │                                   │
│                        ┌──────────▼──────────┐                        │
│                        │   PostgreSQL 17     │                        │
│                        │   (TypeORM)         │                        │
│                        └─────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Transaction Flow

```
Merchant/Frontend                    Backend                        Acquirer (Mock)
      │                                │                                │
      │  POST /payments                │                                │
      │  {merchantId, amount,          │                                │
      │   currency, cardToken}         │                                │
      │───────────────────────────────►│                                │
      │                                │                                │
      │                                │ 1. Validate input              │
      │                                │    - Amount > 0, <= 100,000    │
      │                                │    - Currency supported        │
      │                                │    - Card token format (tok_)  │
      │                                │                                │
      │                                │ 2. Check idempotency           │
      │                                │    - By externalOrderId        │
      │                                │    - By idempotencyKey         │
      │                                │                                │
      │                                │ 3. Create transaction          │
      │                                │    Status: PENDING             │
      │                                │                                │
      │                                │ 4. Log audit event             │
      │                                │    TRANSACTION_CREATED         │
      │                                │                                │
      │                                │ 5. Start authorization         │
      │                                │    Status: PROCESSING          │
      │                                │    Log: AUTHORIZATION_STARTED  │
      │                                │                                │
      │                                │ 6. Send to acquirer ──────────────────────────►
      │                                │                                │
      │                                │                                │ (random 70% approval)
      │                                │                                │
      │                                │◄────────────────────────────── │
      │                                │ 7. Response: approved/declined │
      │                                │                                │
      │                                │ 8. Log acquirer events         │
      │                                │    ACQUIRER_REQUEST_SENT       │
      │                                │    ACQUIRER_RESPONSE_RECEIVED  │
      │                                │                                │
      │                                │ 9. Update transaction status   │
      │                                │    APPROVED / DECLINED / FAILED│
      │                                │                                │
      │                                │ 10. Log final event            │
      │                                │     TRANSACTION_APPROVED       │
      │                                │     or TRANSACTION_DECLINED    │
      │                                │                                │
      │◄───────────────────────────────│                                │
      │  {id, status, authorizationId, │                                │
      │   acquirerReference, message}  │                                │
      │                                │                                │
```

## Features

### Core Functionality
- **Payment Creation** — REST `POST /payments` or GraphQL `createTransaction` mutation
- **Authorization** — Simulated acquirer gateway with 70% approval rate
- **Retry Logic** — Automatic retry with exponential backoff (up to 3 attempts)
- **Idempotency** — Prevents duplicate transactions via `externalOrderId` and `idempotencyKey`
- **Audit Trail** — Complete event history for every transaction state change

### Validation
- Amount must be positive and ≤ 100,000
- Currency must be supported (USD, EUR, GBP, MXN, BRL, ARS, COP)
- Card token must start with `tok_` prefix and be ≥ 8 characters
- Input validation via class-validator decorators

### Transaction States
```
PENDING → PROCESSING → APPROVED
                      → DECLINED
                      → FAILED
```

### API Endpoints

#### REST
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments` | Create and authorize a payment |
| `GET` | `/payments` | List all payments (optional `?merchant_id=`, `?status=`) |
| `GET` | `/payments/:id` | Get payment by ID |

#### GraphQL (`/graphql`)
| Type | Operation | Description |
|------|-----------|-------------|
| Mutation | `createMerchant` | Register a new merchant |
| Mutation | `createTransaction` | Create a transaction |
| Mutation | `authorizeTransaction` | Authorize a pending transaction |
| Mutation | `retryAuthorization` | Retry a declined/failed transaction |
| Query | `merchants` | List all merchants |
| Query | `transactions` | List transactions (optional `merchantId` filter) |
| Query | `transaction` | Get transaction by ID |
| Query | `transactionEvents` | Get audit events for a transaction |
| Query | `authorizationsByTransaction` | Get authorization history |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS, GraphQL (Apollo), TypeORM, REST |
| **Database** | PostgreSQL 17 |
| **Frontend** | React, Vite, TanStack Query, TailwindCSS |
| **Containerization** | Docker, Docker Compose |
| **Validation** | class-validator, class-transformer |

## Project Structure

```
payment-platform/
├── docker-compose.yml
├── docs/
│   └── diagrams.drawio          # Architecture & sequence diagrams
├── backend/
│   ├── src/
│   │   ├── main.ts              # Entry point (CORS, validation, request ID)
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── typeorm.config.ts
│   │   └── modules/
│   │       ├── merchant/        # Merchant CRUD + API key generation
│   │       ├── transaction/     # Transaction creation + idempotency
│   │       ├── authorization/   # Payment authorization + retry logic
│   │       ├── audit/           # Event trail logging
│   │       └── payment/         # REST controller for /payments
│   ├── Dockerfile               # Multi-stage build (Node 22 Alpine)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── MerchantSection.tsx
│   │   │   └── TransactionPanel.tsx
│   │   ├── hooks/
│   │   │   └── usePayment.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── graphql-client.ts
│   │   └── types/
│   │       └── index.ts
│   ├── Dockerfile               # Multi-stage build (Node + Nginx)
│   └── package.json
├── test-audit.js                # GraphQL audit trail test
└── test-rest.js                 # REST API integration test
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 22+ (for local development)

### Docker (Recommended)
```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop all services
docker compose down
```

### Local Development
```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

### Access Points
- **Frontend**: http://localhost
- **GraphQL Playground**: http://localhost:3000/graphql
- **REST API**: http://localhost:3000/payments
- **Database**: localhost:5432 (PostgreSQL)

## Testing

### REST API Tests
```bash
docker cp test-rest.js payment-platform-backend-1:/tmp/test-rest.js
docker exec payment-platform-backend-1 node /tmp/test-rest.js
```

### GraphQL Audit Trail Tests
```bash
docker cp test-audit.js payment-platform-backend-1:/tmp/test-audit.js
docker exec payment-platform-backend-1 node /tmp/test-audit.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `payment_db` | Database name |
| `DB_HOST` | `db` | Database host (Docker service name) |
| `DB_PORT` | `5432` | Database port |
| `NODE_ENV` | `development` | Application environment |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

## Design Decisions

### Hybrid API (REST + GraphQL)
- **REST** (`POST /payments`) for external merchants who need a simple, standard HTTP API
- **GraphQL** for the frontend dashboard with complex queries, filtering, and real-time data needs

### Repository Pattern
Each domain entity has an interface-based repository, making it easy to swap implementations or add caching later without touching business logic.

### Audit Trail as Separate Module
Audit events are logged by injecting `AuditService` into business services. This keeps the audit concern separate while maintaining full traceability of every state change.

### Idempotency Strategy
Double-layer protection:
1. **By `externalOrderId`** — Same merchant + same order ID returns existing transaction
2. **By `idempotencyKey`** — Unique key prevents duplicate processing across retries

### Retry with Exponential Backoff
When the acquirer fails (network error, timeout), the system retries up to 3 times with increasing delays (1s, 2s, 4s). Business-level declines (insufficient funds) are NOT retried automatically — they require explicit `retryAuthorization`.
