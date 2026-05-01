# Payment Processing Service

Plataforma full-stack para procesamiento de pagos construida con NestJS, GraphQL, PostgreSQL y React. Maneja autorización de pagos, lógica de reintentos, idempotencia y trazabilidad completa para transacciones de comercios.

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAPA DE CLIENTE                               │
│                                                                      │
│   ┌──────────────────────┐          ┌──────────────────────────┐    │
│   │   React Frontend     │          │   Comercios Externos     │    │
│   │   (Vite + TanStack)  │          │   (Clientes REST API)    │    │
│   └──────────┬───────────┘          └────────────┬─────────────┘    │
│              │                                    │                  │
└──────────────┼────────────────────────────────────┼──────────────────┘
               │                                    │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CAPA DE API                                   │
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
│                      CAPA DE LÓGICA DE NEGOCIO                        │
│                                                                      │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │ TransactionSvc   │  │ AuthorizationSvc │  │   MerchantSvc    │  │
│   │ - Crear tx       │  │ - Autorizar      │  │ - CRUD           │  │
│   │ - Idempotencia   │  │ - Reintentos     │  │ - API Keys       │  │
│   │ - Gestión estado │  │ - Acquirer mock  │  │ - Validaciones   │  │
│   │ - Validaciones   │  │ - Backoff exp.   │  │                  │  │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            │                      │                      │            │
│            └──────────────────────┼──────────────────────┘            │
│                                   │                                   │
│                        ┌──────────▼──────────┐                        │
│                        │   AuditService      │                        │
│                        │ - Registro eventos  │                        │
│                        │ - Trazabilidad      │                        │
│                        │ - Correlación       │                        │
│                        └──────────┬──────────┘                        │
│                                   │                                   │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CAPA DE DATOS                                 │
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

## Flujo de Transacción

```
Comercio/Frontend                    Backend                        Acquirer (Mock)
      │                                │                                │
      │  POST /payments                │                                │
      │  {merchantId, amount,          │                                │
      │   currency, cardToken}         │                                │
      │───────────────────────────────►│                                │
      │                                │                                │
      │                                │ 1. Validar entrada             │
      │                                │    - Monto > 0, <= 100,000    │
      │                                │    - Moneda soportada          │
      │                                │    - Formato token (tok_)      │
      │                                │                                │
      │                                │ 2. Verificar idempotencia      │
      │                                │    - Por externalOrderId       │
      │                                │    - Por idempotencyKey        │
      │                                │                                │
      │                                │ 3. Crear transacción           │
      │                                │    Estado: PENDING             │
      │                                │                                │
      │                                │ 4. Registrar evento auditoría  │
      │                                │    TRANSACTION_CREATED         │
      │                                │                                │
      │                                │ 5. Iniciar autorización        │
      │                                │    Estado: PROCESSING          │
      │                                │    Log: AUTHORIZATION_STARTED  │
      │                                │                                │
      │                                │ 6. Enviar al acquirer ──────────────────────►
      │                                │                                │
      │                                │                                │ (70% aprobación aleatoria)
      │                                │                                │
      │                                │◄────────────────────────────── │
      │                                │ 7. Respuesta: aprobado/rechaz. │
      │                                │                                │
      │                                │ 8. Registrar eventos acquirer  │
      │                                │    ACQUIRER_REQUEST_SENT       │
      │                                │    ACQUIRER_RESPONSE_RECEIVED  │
      │                                │                                │
      │                                │ 9. Actualizar estado tx        │
      │                                │    APPROVED / DECLINED / FAILED│
      │                                │                                │
      │                                │ 10. Registrar evento final     │
      │                                │     TRANSACTION_APPROVED       │
      │                                │     o TRANSACTION_DECLINED     │
      │                                │                                │
      │◄───────────────────────────────│                                │
      │  {id, status, authorizationId, │                                │
      │   acquirerReference, message}  │                                │
      │                                │                                │
```

## Funcionalidades

### Núcleo del Sistema
- **Creación de Pagos** — REST `POST /payments` o GraphQL `createTransaction` mutation
- **Autorización** — Gateway de adquirente simulado con 70% de tasa de aprobación
- **Reintentos** — Reintento automático con backoff exponencial (hasta 3 intentos)
- **Idempotencia** — Previene transacciones duplicadas mediante `externalOrderId` e `idempotencyKey`
- **Audit Trail** — Historial completo de eventos para cada cambio de estado

### Validaciones
- El monto debe ser positivo y ≤ 100,000
- La moneda debe estar soportada (USD, EUR, GBP, MXN, BRL, ARS, COP)
- El token de tarjeta debe comenzar con `tok_` y tener ≥ 8 caracteres
- Validación de entrada mediante decoradores de `class-validator`

### Estados de Transacción
```
PENDING → PROCESSING → APPROVED
                      → DECLINED
                      → FAILED
```

## API Endpoints

### REST
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments` | Create and authorize a payment |
| `GET` | `/payments` | List all payments (optional `?merchant_id=`, `?status=`) |
| `GET` | `/payments/:id` | Get payment by ID |

### GraphQL (`/graphql`)
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

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | NestJS, GraphQL (Apollo), TypeORM, REST |
| **Base de datos** | PostgreSQL 17 |
| **Frontend** | React, Vite, TanStack Query, TailwindCSS |
| **Contenedores** | Docker, Docker Compose |
| **Validación** | class-validator, class-transformer |

## Estructura del Proyecto

```
payment-platform/
├── docker-compose.yml
├── docs/
│   └── diagrams.drawio          # Diagramas de arquitectura y secuencia
├── backend/
│   ├── src/
│   │   ├── main.ts              # Punto de entrada (CORS, validación, request ID)
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── typeorm.config.ts
│   │   └── modules/
│   │       ├── merchant/        # CRUD de comercios + generación de API keys
│   │       ├── transaction/     # Creación de transacciones + idempotencia
│   │       ├── authorization/   # Autorización de pagos + lógica de reintentos
│   │       ├── audit/           # Registro de eventos de trazabilidad
│   │       └── payment/         # Controlador REST para /payments
│   ├── Dockerfile               # Build multi-stage (Node 22 Alpine)
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
│   ├── Dockerfile               # Build multi-stage (Node + Nginx)
│   └── package.json
├── test-audit.js                # Test de auditoría vía GraphQL
└── test-rest.js                 # Test de integración REST API
```

## Inicio Rápido

### Prerrequisitos
- Docker & Docker Compose
- Node.js 22+ (para desarrollo local)

### Docker (Recomendado)
```bash
# Iniciar todos los servicios
docker compose up -d --build

# Ver logs
docker compose logs -f backend

# Detener todos los servicios
docker compose down
```

### Desarrollo Local
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

### Puntos de Acceso
- **Frontend**: http://localhost
- **GraphQL Playground**: http://localhost:3000/graphql
- **REST API**: http://localhost:3000/payments
- **Base de datos**: localhost:5432 (PostgreSQL)

## Testing

### Tests REST API
```bash
docker cp test-rest.js payment-platform-backend-1:/tmp/test-rest.js
docker exec payment-platform-backend-1 node /tmp/test-rest.js
```

### Tests de Auditoría GraphQL
```bash
docker cp test-audit.js payment-platform-backend-1:/tmp/test-audit.js
docker exec payment-platform-backend-1 node /tmp/test-audit.js
```

## Variables de Entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `POSTGRES_USER` | `postgres` | Usuario de base de datos |
| `POSTGRES_PASSWORD` | `postgres` | Contraseña de base de datos |
| `POSTGRES_DB` | `payment_db` | Nombre de la base de datos |
| `DB_HOST` | `db` | Host de la base de datos (nombre del servicio Docker) |
| `DB_PORT` | `5432` | Puerto de la base de datos |
| `NODE_ENV` | `development` | Entorno de la aplicación |
| `FRONTEND_URL` | `http://localhost:5173` | Origen permitido para CORS |

## Decisiones de Diseño

### API Híbrida (REST + GraphQL)
- **REST** (`POST /payments`) para comercios externos que necesitan una API HTTP simple y estándar
- **GraphQL** para el dashboard interno con consultas complejas, filtrado y necesidades de datos en tiempo real

### Patrón Repositorio
Cada entidad de dominio tiene un repositorio basado en interfaces, lo que facilita cambiar implementaciones o agregar caching más adelante sin tocar la lógica de negocio.

### Audit Trail como Módulo Independiente
Los eventos de auditoría se registran inyectando `AuditService` en los servicios de negocio. Esto mantiene la preocupación de auditoría separada mientras se conserva trazabilidad completa de cada cambio de estado.

### Estrategia de Idempotencia
Protección en dos capas:
1. **Por `externalOrderId`** — Mismo comercio + mismo order ID devuelve la transacción existente
2. **Por `idempotencyKey`** — Clave única previene procesamiento duplicado a través de reintentos

### Reintento con Backoff Exponencial
Cuando el acquirer falla (error de red, timeout), el sistema reintenta hasta 3 veces con delays crecientes (1s, 2s, 4s). Los rechazos a nivel de negocio (fondos insuficientes) NO se reintentan automáticamente — requieren una llamada explícita a `retryAuthorization`.
