# SafeKroy (Amar-Bazar) — AI Agent Instructions

> **For AI Agents:** This document is your primary context file. Read this FIRST before writing any code, making any architectural decisions, or asking the user questions. It contains critical project rules, technical constraints, and domain context that you MUST follow.

---

## 1. Project Identity

| Field | Value |
|:---|:---|
| **Project Name** | SafeKroy (codenamed: Amar-Bazar) |
| **Domain** | C2C (Customer-to-Customer) second-hand classifieds marketplace |
| **Target Country** | Bangladesh 🇧🇩 |
| **Core Differentiator** | Identity-first, anti-scam platform with mandatory NID e-KYC verification |
| **Language** | Bengali (Bangla) + English bilingual |
| **Currency** | BDT (Bangladeshi Taka ৳) |
| **MVP Phase** | Phase 1 — No escrow, no payment gateway integration (cash-on-delivery only) |

---

## 2. Reference Documents (Read Order)

Always read these files before starting work. They are the single source of truth:

| Priority | File | Purpose |
|:---|:---|:---|
| 1 | `PRD.md` | Product requirements, user flows, RBAC matrix, validation rules, error handling |
| 2 | `architecture.md` | System architecture, tech stack, layered monolith structure, Mongoose schemas, service design patterns |
| 3 | `database.md` | MongoDB collection list, relationships, indexing strategy, validation, aggregation, transactions |
| 4 | `database-schema.md` | All 8 collection schemas with field names, types, and references |
| 5 | `api-spec.md` | REST API endpoints, methods, auth requirements, request/response bodies, error codes |
| 6 | `prompt.md` | Step-by-step backend build prompts (execute in order if building from scratch) |

> **Rule:** If any instruction in this file contradicts a reference document, this file takes precedence. If you are unsure, ask the user.

---

## 3. Tech Stack (Non-Negotiable)

Do NOT substitute these technologies unless the user explicitly approves:

| Layer | Technology | Version |
|:---|:---|:---|
| **Backend Runtime** | Node.js | 20 LTS+ |
| **Backend Framework** | Express.js | 4.x |
| **Language** | TypeScript | 5.x (strict mode) |
| **Database** | MongoDB Atlas | 7.x (Replica Set) |
| **ODM** | Mongoose | 8.x |
| **Cache / Locks / Pub-Sub** | Redis (ioredis) | 7.x |
| **Real-Time** | Socket.io + @socket.io/redis-adapter | 4.x |
| **Job Queue** | BullMQ (Redis-backed) | Latest |
| **Validation** | Zod | Latest |
| **Image Processing** | Sharp.js | Latest |
| **Auth Tokens** | JWT (jsonwebtoken) | Latest |
| **Logging** | Winston | Latest |
| **Frontend** | Next.js 14+ (App Router) | *(Phase 2 — NOT in scope for backend-first build)* |

---

## 4. Architecture Rules

### 4.1 Pattern: Modular Layered Monolith (Clean Architecture)

The backend is a **single Express.js codebase** organized into strict layers. Each domain feature is a self-contained module.

```
src/
├── server.ts                  # Entry point, Socket.io init
├── app.ts                     # Express config & global middlewares
├── config/                    # env, database, redis, logger
├── shared/                    # Cross-cutting: middleware, errors, utils, queues
│   ├── middleware/            # auth, rbac, rateLimiter, validate, errorHandler
│   ├── errors/                # AppError + subclasses
│   ├── utils/                 # crypto, regex, nidNormalizer, apiResponse
│   └── queues/                # BullMQ queue definitions + workers
├── modules/                   # Domain Feature Modules
│   ├── auth/                  # OTP, JWT, session, refresh token rotation
│   ├── kyc/                   # NID verification, Porichoy API, liveness
│   ├── users/                 # Profiles, phone reveal, trust scores
│   ├── listings/              # Ads, search, quota, re-moderation
│   ├── chat/                  # Socket.io handlers, anti-scam interceptor
│   ├── reviews/               # Mutual reviews, Bayesian trust score
│   ├── moderation/            # Reports, circuit breaker, blacklist, ban appeals
│   ├── safespots/             # Geospatial safe meetup locations
│   └── quotas/                # Monthly ad quotas, monetization
└── routes/                    # Master API router assembly
```

### 4.2 Layer Rules (Strictly Enforced)

| Layer | Files | Can Import From | CANNOT Import From |
|:---|:---|:---|:---|
| **Presentation** | `*.controller.ts`, `*.routes.ts` | Service, Validation | Repository, Model directly |
| **Service** | `*.service.ts` | Repository, Shared Utils, Queue | Controller, Routes |
| **Repository** | `*.repository.ts` | Model | Controller, Service |
| **Model** | `*.model.ts` | Nothing (leaf layer) | Everything |

> **Critical:** Controllers NEVER write raw Mongoose queries. Services NEVER import Express `req` or `res`. Repositories NEVER contain business logic.

### 4.3 Module Structure Template

Every module follows this file structure:

```
modules/<module_name>/
├── <module>.model.ts          # Mongoose schema & TypeScript interface
├── <module>.repository.ts     # Data access (all Mongoose queries go here)
├── <module>.service.ts        # Business logic & orchestration
├── <module>.controller.ts     # HTTP request handling
├── <module>.routes.ts         # Express Router definition
└── <module>.validation.ts     # Zod schemas for request validation
```

---

## 5. Critical Business Rules

These are domain-specific rules that MUST be implemented exactly as described. Violating any of these breaks the product's core value proposition.

### 5.1 Identity & Security

| Rule | Implementation |
|:---|:---|
| **NID is NEVER stored in plaintext** | Store as `HMAC-SHA256(NID_Number, SERVER_PEPPER)`. Use `hashNID()` utility. |
| **1 NID = 1 Account** | Unique constraint on `nidHash` field in Users collection (sparse index). |
| **18+ Age Policy** | Validate `DOB <= Today - 18 Years` before KYC submission. |
| **13-Digit NID Auto-Normalization** | Extract 4-digit birth year from DOB, prepend to make 17 digits. |
| **Blacklist is permanent & immutable** | Once an NID hash enters the Blacklist collection, it can only be removed via a successful ban appeal reviewed by a Super Admin. |
| **Device fingerprinting** | Track Hardware UUID / Canvas hash. Flag new registrations from previously banned devices. |

### 5.2 Ad Listing Rules

| Rule | Implementation |
|:---|:---|
| **2 free ads per month** | Track in `AdQuota` collection: `{ userId, monthYear: "YYYY-MM", usedFreeAds }`. Reject if >= 2. |
| **Category price floors** | Smartphones: ≥ 1,000 BDT, Laptops: ≥ 3,000 BDT, Motorbikes: ≥ 20,000 BDT. Enforced in Zod validation. |
| **Image watermarking** | All published images get a semi-transparent watermark: `"SafeKroy — ID #<listingId>"`. Processed by Sharp.js via BullMQ worker. |
| **Re-moderation trigger** | If title, category, images, or price (Δ > 30%) are edited on an active ad, status flips to `pending_remod`. |
| **30-day ad expiry** | Listings auto-expire after 30 days via MongoDB TTL index on `expiresAt`. |

### 5.3 Chat & Anti-Scam

| Rule | Implementation |
|:---|:---|
| **Real-time scam keyword interceptor** | Regex patterns matching: bKash, Nagad, Rocket, advance, booking, courier charge — in both English and Bengali script. Also matches 11-digit mobile wallet numbers. |
| **Scam warning is unskippable** | When detected, emit a `SCAM_WARNING` Socket.io event. The frontend MUST render a blocking modal. |
| **Seller repeat offender** | If a seller triggers scam filter ≥ 3 times, auto-restrict account and escalate to moderator queue. |
| **90-day message audit vault** | Deleted messages are soft-deleted from UI but preserved in the database for 90 days for law enforcement. |
| **Phone number masking** | Seller phones are hidden by default. Revealed via rate-limited API: max 5 reveals per verified user per 24 hours. |

### 5.4 Reputation & Moderation

| Rule | Implementation |
|:---|:---|
| **Mutual reviews only after deal** | Reviews can ONLY be submitted if listing.status === "sold" AND reviewer is buyer/seller of that deal. |
| **14-day review window** | Review submission closes 14 days after the ad was marked as sold. |
| **Bayesian trust score** | `W = (R * v + C * m) / (v + m)` where C=4.5, m=5. Prevents gaming with few fake reviews. |
| **Circuit breaker** | ≥ 3 unique reports on a listing within 10 minutes → auto-suppress. Redis sliding window counter. |
| **Ban appeal SLA** | 48-hour human review SLA for ban appeals. |

---

## 6. Auth Strategy

Implement a **Hybrid Dual-Token** system:

| Token | Type | Storage | TTL |
|:---|:---|:---|:---|
| **Access Token** | Signed JWT | `Authorization: Bearer` header OR HttpOnly cookie | 15 minutes |
| **Refresh Token** | Opaque random (64 bytes hex) | HttpOnly, Secure, SameSite=Strict cookie | 30 days |

**Refresh Token Rotation (RTR):**
- Every refresh generates a new token pair. Old refresh token is invalidated.
- If an invalidated refresh token is reused → **token theft detected** → purge ALL sessions for that user.

**JWT Payload:**
```json
{
  "userId": "ObjectId",
  "role": "registered | verified | moderator | superadmin",
  "isNidVerified": true,
  "deviceId": "hardware_fingerprint"
}
```

---

## 7. RBAC (Role-Based Access Control)

There are 5 roles. Always check role before allowing actions:

| Role | Can Do |
|:---|:---|
| **Guest** | Search, browse listings (public endpoints only) |
| **Registered (Unverified)** | Guest + save favorites, file reports |
| **Verified Citizen (NID)** | Registered + post ads, chat, reveal phone, leave reviews, mark sold |
| **Community Moderator** | Review flagged content, suppress ads, issue warnings |
| **Super Admin** | Everything + permanent NID blacklisting, raw audit logs, system config |

**Middleware chain pattern:**
```typescript
// Verified user creating a listing
router.post("/", authenticate, requireVerified, validate(createListingSchema), listingController.create);

// Admin banning a user
router.post("/:id/ban", authenticate, authorize("superadmin"), moderationController.banUser);
```

---

## 8. Error Handling Convention

ALL API responses must follow this envelope format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { "field": "reason" }
  }
}
```

**Standard error codes:** `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `DUPLICATE_RESOURCE` (409), `RATE_LIMIT_EXCEEDED` (429), `INTERNAL_SERVER_ERROR` (500), `UPSTREAM_GATEWAY_TIMEOUT` (502).

---

## 9. API Versioning

- All endpoints are prefixed with `/api/v1/`.
- Breaking changes require a version bump (`v2`).
- Non-breaking changes (adding fields) are applied directly to `v1`.

---

## 10. Database Conventions

### Naming
- Collection names: **PascalCase plural** in Mongoose model (`User`, `Listing`, `Conversation`).
- Field names: **camelCase** (`sellerId`, `nidHash`, `lastMessageAt`).
- Index names: Mongoose auto-generates.

### Timestamps
- ALL collections use Mongoose `{ timestamps: true }` which auto-manages `createdAt` and `updatedAt`.

### References
- Use Mongoose `ref` for foreign keys. Populate only when needed (avoid deep population chains).
- Pattern: Extended Reference (store minimal denormalized data for read-heavy paths).

### Transactions
- Use MongoDB multi-document ACID transactions ONLY for:
  - "Mark as Sold" (update listing + close conversations + trigger review)
  - Payment/Quota operations
- Do NOT wrap single-document operations in transactions (unnecessary overhead).

---

## 11. Background Job Conventions

Use BullMQ for ALL async/non-blocking operations:

| Queue Name | Purpose | Retry Strategy |
|:---|:---|:---|
| `sms-queue` | SMS OTP delivery via telco gateway | 3 retries, exponential backoff |
| `kyc-processing-queue` | Porichoy e-KYC API calls + face match | 3 retries (2m, 5m, 15m) |
| `image-processing-queue` | Sharp.js watermarking + WebP conversion | 2 retries |
| `notification-queue` | Push notifications, review prompts, expiry alerts | 3 retries |

> **Rule:** NEVER call external APIs (Porichoy, SMS gateway, payment gateway) synchronously in the HTTP request thread. Always dispatch to a BullMQ worker.

---

## 12. Coding Standards

### TypeScript
- **Strict mode** (`strict: true` in tsconfig).
- Use explicit return types on all exported functions.
- Use `interface` for data shapes, `type` for unions/intersections.
- No `any` type. Use `unknown` and narrow with type guards.

### File Naming
- All filenames: `kebab-case` or `camelCase` (be consistent within the project — prefer `camelCase` to match the architecture.md convention: `user.model.ts`, `auth.service.ts`).

### Imports
- Use relative imports within a module (`./user.model`).
- Use path aliases for cross-module imports (`@shared/middleware/auth`).

### Environment Variables
- All env vars validated at startup via Zod in `src/config/env.ts`.
- If any required var is missing, the server MUST fail fast with a clear error message.

### Logging
- Use Winston logger, NOT `console.log`.
- Log levels: `error` for 5xx, `warn` for 4xx, `info` for business events, `debug` for development.
- NEVER log PII (NID numbers, phone numbers, passwords). Log only hashes or masked values.

---

## 13. Bangladesh-Specific Context

This is important domain knowledge for making correct implementation decisions:

| Context | Detail |
|:---|:---|
| **Phone format** | Bangladeshi mobiles: `+8801[3-9]XXXXXXXX` (11 digits). Regex: `^(?:\+?88)?01[3-9]\d{8}$` |
| **NID formats** | Smart Card: 10 digits. Legacy: 13 digits (needs birth year prepended) or 17 digits. |
| **Mobile wallets** | bKash, Nagad, Rocket — the primary scam vector. Scammers demand advance payments via these. |
| **Connectivity** | Users are often on 3G/4G with intermittent connections. Design for offline-first (IndexedDB message queue on frontend). |
| **Location hierarchy** | Bangladesh → 8 Divisions → 64 Districts → 495 Thana/Upazilas. Location selectors must follow this cascade. |
| **Legal name** | Stored in Bengali script (e.g., `মোঃ তানভীর আহমেদ`). Auto-populated from government DB, NOT user-editable. |
| **e-KYC provider** | Porichoy (government API). Frequently has 502/504 errors. MUST be called asynchronously via BullMQ. |
| **Legal compliance** | Cyber Security Act 2023 / ICT Act. Zero plaintext NID storage. 90-day chat retention for law enforcement. |

---

## 14. Common Pitfalls (Avoid These)

| ❌ Don't Do This | ✅ Do This Instead |
|:---|:---|
| Store NID numbers in plaintext | Hash with HMAC-SHA256 + server pepper |
| Call Porichoy API synchronously in the request handler | Dispatch to BullMQ `kyc-processing-queue`, return HTTP 202 |
| Put business logic in controllers | Put it in the service layer |
| Write raw Mongoose queries in services | Use the repository layer |
| Use `console.log` | Use Winston logger |
| Allow any user to post ads | Require `role === "verified"` (NID e-KYC completed) |
| Embed phone numbers in HTML/SSR | Serve via rate-limited authenticated API endpoint |
| Delete chat messages permanently | Soft-delete only. Preserve in 90-day audit vault |
| Allow unlimited ad posting | Enforce 2 free ads/month quota |
| Trust client-side price validation only | Enforce category price floors on the backend |
| Use localStorage for JWT tokens | Use HttpOnly Secure cookies |
| Allow reviews without a completed deal | Verify listing.status === "sold" AND reviewer is buyer/seller |
| Block the event loop with image processing | Offload to BullMQ `image-processing-queue` with Sharp.js |

---

## 15. Testing Expectations

- Every service method should have unit tests (mock the repository layer).
- Every API endpoint should have integration tests (use supertest + in-memory MongoDB).
- Test edge cases from the PRD's Error Handling table (EH-01 through EX-05).
- Test the scam interceptor with Bengali script keywords, not just English.
- Test NID normalization for all 3 formats (10, 13, 17 digits).
- Test rate limiters (OTP: 3/hr, phone reveal: 5/day, KYC: 3/day).
- Test Refresh Token Rotation breach detection.

---

## 16. Quick Start Checklist

When starting fresh development on this project:

1. ☐ Read all reference documents (Section 2 above).
2. ☐ Set up `.env` file with all required variables.
3. ☐ Ensure MongoDB Atlas cluster is running with a replica set (required for transactions).
4. ☐ Ensure Redis server is running.
5. ☐ Follow `prompt.md` prompts sequentially (Phase 1 → Phase 7).
6. ☐ Run seed script to populate sample data.
7. ☐ Run health check script to verify all connections.
8. ☐ Test each module's API endpoints with Postman or similar.

---

> **Final Note to AI Agents:** This project prioritizes **user safety over speed**. Every feature is designed to prevent scams in the Bangladeshi online marketplace. When in doubt about a design decision, always choose the option that makes the platform safer for verified citizens, even if it adds complexity.
