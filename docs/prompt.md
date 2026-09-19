# SafeKroy (Amar-Bazar) — Backend Build Prompts

> **Purpose:** This document contains sequential, copy-paste-ready prompts to build the complete SafeKroy Express.js TypeScript backend from scratch. Execute each prompt in order. Each prompt builds on the output of the previous one.

---

## Phase 1: Project Foundation & Configuration

### Prompt 1.1 — Initialize Project & Install Dependencies

```
Initialize a new Node.js backend project for "SafeKroy" — a C2C classifieds marketplace built with Express.js and TypeScript.

**Project Setup:**
1. Run `npm init -y` and configure `package.json` with:
   - name: "safekroy-backend"
   - scripts: `dev`, `build`, `start`, `lint`
2. Install production dependencies:
   - express, cors, helmet, cookie-parser, compression, morgan
   - mongoose (MongoDB ODM)
   - ioredis (Redis client)
   - socket.io, @socket.io/redis-adapter (Real-time chat)
   - bullmq (Background job queue)
   - jsonwebtoken, bcryptjs (Auth tokens & hashing)
   - zod (Runtime schema validation)
   - multer (File uploads)
   - sharp (Image processing & watermarking)
   - winston (Structured logging)
   - dotenv (Environment variables)
   - uuid (Unique ID generation)
3. Install dev dependencies:
   - typescript, ts-node, tsx, nodemon
   - @types/express, @types/cors, @types/cookie-parser, @types/compression, @types/morgan, @types/jsonwebtoken, @types/bcryptjs, @types/multer, @types/uuid
   - eslint, prettier
4. Create `tsconfig.json` with strict mode enabled, target ES2022, module NodeNext, outDir `./dist`, rootDir `./src`.
5. Configure nodemon to watch `src/` and restart on `.ts` file changes.

Do NOT create any source files yet, only the project configuration files.
```

---

### Prompt 1.2 — Environment & Configuration Layer

```
Create the configuration layer for the SafeKroy backend inside `src/config/`.

**Files to create:**

1. `src/config/env.ts`:
   - Load and validate all environment variables using Zod schema.
   - Required vars: PORT, NODE_ENV, MONGO_URI, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRY (default "15m"), JWT_REFRESH_EXPIRY (default "30d"), SERVER_PEPPER (for NID hashing), AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SMS_API_KEY, SMS_API_URL, PORICHOY_API_KEY, PORICHOY_API_URL.
   - Export a typed `env` config object.

2. `src/config/database.ts`:
   - Create a `connectDatabase()` function using Mongoose.
   - Connect to MongoDB Atlas with connection pooling (maxPoolSize: 10).
   - Log connection success/failure using Winston logger.
   - Handle graceful disconnect on SIGTERM/SIGINT.

3. `src/config/redis.ts`:
   - Create and export a singleton Redis client using ioredis.
   - Handle connection events (connect, error, reconnecting).
   - Export a separate `createRedisSubscriber()` for Socket.io adapter.

4. `src/config/logger.ts`:
   - Create a Winston logger with JSON format for production and colorized console for development.
   - Log levels: error, warn, info, http, debug.

Create a `.env.example` file listing all required environment variables with placeholder values.
```

---

### Prompt 1.3 — Express App & Server Entry Point

```
Create the Express application setup and server entry point for SafeKroy.

**Files to create:**

1. `src/app.ts`:
   - Initialize Express app.
   - Apply global middlewares in order: helmet (security headers), cors (with credentials: true, origin from env), compression, express.json (limit: "10mb"), express.urlencoded, cookie-parser, morgan (HTTP logging via Winston stream).
   - Mount the API router at `/api/v1`.
   - Apply global error handling middleware (created later) as the LAST middleware.
   - Export the Express app.

2. `src/server.ts`:
   - Import the Express app.
   - Create HTTP server from the app.
   - Initialize Socket.io server with Redis adapter (for multi-node scaling), CORS config, and connection state recovery.
   - Call `connectDatabase()` and wait for MongoDB connection.
   - Start listening on the configured PORT.
   - Handle unhandled promise rejections and uncaught exceptions gracefully (log and shutdown).

The server should NOT crash on unhandled errors — it should log them and attempt graceful shutdown.
```

---

## Phase 2: Shared Infrastructure (Middleware, Errors, Utils)

### Prompt 2.1 — Custom Error Classes

```
Create a centralized error handling system in `src/shared/errors/`.

**Files to create:**

1. `src/shared/errors/AppError.ts`:
   - Create a base `AppError` class extending the native Error.
   - Properties: `statusCode` (number), `code` (string enum), `isOperational` (boolean, default true).
   - The `code` field maps to API error codes like: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, RATE_LIMIT_EXCEEDED, INTERNAL_SERVER_ERROR, UPSTREAM_GATEWAY_TIMEOUT, DUPLICATE_RESOURCE, KYC_PROCESSING, QUOTA_EXCEEDED.

2. Create specific error subclasses, each in its own file:
   - `BadRequestError` (400, VALIDATION_ERROR)
   - `UnauthorizedError` (401, UNAUTHORIZED)
   - `ForbiddenError` (403, FORBIDDEN)
   - `NotFoundError` (404, NOT_FOUND)
   - `RateLimitError` (429, RATE_LIMIT_EXCEEDED)
   - `ConflictError` (409, DUPLICATE_RESOURCE)

3. `src/shared/errors/index.ts`: Re-export all error classes.
```

---

### Prompt 2.2 — Core Middlewares

```
Create the shared middleware layer in `src/shared/middleware/`.

**Files to create:**

1. `src/shared/middleware/errorHandler.ts`:
   - Global Express error handler middleware (4 args: err, req, res, next).
   - If error is an instance of AppError, return its statusCode and code.
   - If error is a Mongoose ValidationError, map it to a 400 VALIDATION_ERROR with field-level details.
   - If error is a Mongoose CastError (invalid ObjectId), return 400.
   - If error is a JWT TokenExpiredError or JsonWebTokenError, return 401.
   - For unknown errors, return 500 INTERNAL_SERVER_ERROR.
   - Always return the standard JSON error envelope:
     ```json
     { "success": false, "error": { "code": "...", "message": "...", "details": {} } }
     ```
   - Log all 5xx errors with full stack trace using Winston.

2. `src/shared/middleware/auth.ts`:
   - `authenticate` middleware: Extract JWT access token from the `Authorization: Bearer <token>` header OR from an HttpOnly cookie named `accessToken`. Verify it. Attach the decoded user payload (`userId`, `role`, `isNidVerified`, `deviceId`) to `req.user`.
   - `authorize(...roles: string[])` middleware factory: Check if `req.user.role` is in the allowed roles list. If not, throw ForbiddenError.
   - `requireVerified` middleware: Check if `req.user.isNidVerified === true`. If not, throw ForbiddenError with message "NID verification required to perform this action."

3. `src/shared/middleware/rateLimiter.ts`:
   - Create a configurable Redis-backed sliding window rate limiter.
   - Factory function: `createRateLimiter({ windowMs, maxRequests, keyPrefix })`.
   - Uses Redis INCR + EXPIRE pattern.
   - On limit exceeded, throw RateLimitError with `Retry-After` header.

4. `src/shared/middleware/validate.ts`:
   - Create a `validate(schema: ZodSchema)` middleware factory.
   - Validates `req.body`, `req.query`, and `req.params` against the provided Zod schema.
   - On failure, throw BadRequestError with Zod's formatted error details.
```

---

### Prompt 2.3 — Shared Utilities

```
Create shared utility functions in `src/shared/utils/`.

**Files to create:**

1. `src/shared/utils/crypto.ts`:
   - `hashNID(nidNumber: string): string` — Generates HMAC-SHA256 hash of the NID number using SERVER_PEPPER from env config. Used for 1:1 identity binding. NID is NEVER stored in plaintext.
   - `hashPhone(phone: string): string` — Similar HMAC-SHA256 hash for phone numbers in the blacklist vault.
   - `generateOTP(): string` — Generates a random 6-digit numeric OTP.

2. `src/shared/utils/regex.ts`:
   - Export pre-compiled regex constants:
     - `BD_PHONE_REGEX`: `/^(?:\+?88)?01[3-9]\d{8}$/` (Bangladeshi mobile)
     - `NID_REGEX`: `/^(\d{10}|\d{13}|\d{17})$/` (10, 13, or 17 digit NID)
     - `SCAM_PATTERNS`: Array of RegExp for bKash/Nagad/advance payment keywords including Bengali script:
       - `/(?:bKash|bkash|নগদ|nagad|rocket|রকেট)/i`
       - `/(?:advance|agrim|অগ্রিম|booking|বুকিং|courier charge|কুরিয়ার চার্জ)/i`
       - `/(?:\+?88)?01[3-9]\d{8}/` (mobile wallet number pattern)

3. `src/shared/utils/nidNormalizer.ts`:
   - `normalizeNID(nidNumber: string, dob: Date): string` — If NID is 13 digits, extract the 4-digit birth year from DOB and prepend it to create the 17-digit format required by the Election Commission API. If 10 or 17 digits, return as-is.

4. `src/shared/utils/apiResponse.ts`:
   - `sendSuccess(res, data, statusCode = 200)` — Standard success response: `{ success: true, data }`.
   - `sendCreated(res, data)` — Calls sendSuccess with 201.
   - `sendPaginated(res, data, pagination: { page, limit, total })` — Paginated response.
```

---

## Phase 3: Domain Modules — Models & Repositories

### Prompt 3.1 — User Module (Model + Repository)

```
Create the User domain module in `src/modules/users/`.

**Files to create:**

1. `src/modules/users/user.model.ts`:
   - Define `IUser` TypeScript interface extending Mongoose Document:
     - `phone`: string (required, unique)
     - `role`: enum ["guest", "registered", "verified", "moderator", "superadmin"] (default: "registered")
     - `nidHash`: string (unique, sparse index — only present after KYC)
     - `legalNameBangla`: string (auto-populated from e-KYC response, uneditable by user)
     - `displayName`: string (required)
     - `trustScore`: number (default: 5.0)
     - `totalDeals`: number (default: 0)
     - `totalReviews`: number (default: 0)
     - `deviceIds`: string[] (array of hardware fingerprints)
     - `status`: enum ["active", "quarantined", "suspended", "banned"] (default: "active")
     - `banReason`: string (optional)
     - `lastActiveAt`: Date
   - Enable Mongoose `timestamps: true` for automatic `createdAt` and `updatedAt`.
   - Define indexes: unique on `phone`, unique sparse on `nidHash`, index on `status`, index on `deviceIds`.

2. `src/modules/users/user.repository.ts`:
   - `findByPhone(phone: string)` — Find user by phone number.
   - `findByNidHash(nidHash: string)` — Find user by salted NID hash.
   - `findById(userId: string)` — Find user by _id.
   - `createUser(data: Partial<IUser>)` — Create a new user document.
   - `updateUserRole(userId: string, role: string)` — Update user's role (e.g., registered → verified).
   - `updateTrustScore(userId: string, score: number)` — Update the computed Bayesian trust score.
   - `checkBlacklist(nidHash: string, phoneHash: string, deviceId: string)` — Query the Blacklist collection to check if any identifier is banned.
```

---

### Prompt 3.2 — Listing Module (Model + Repository)

```
Create the Listing domain module in `src/modules/listings/`.

**Files to create:**

1. `src/modules/listings/listing.model.ts`:
   - Define `IListing` TypeScript interface extending Mongoose Document:
     - `sellerId`: ObjectId (ref: "User", required)
     - `title`: string (required, maxlength: 80)
     - `description`: string (required, maxlength: 2000)
     - `category`: enum ["smartphones", "laptops", "motorbikes", "electronics", "furniture", "clothing", "others"] (required)
     - `subcategory`: string (optional)
     - `price`: number (required, min: 0)
     - `condition`: enum ["Like New", "Good", "Fair", "For Parts"] (required)
     - `location`: GeoJSON object with `type` ("Point"), `coordinates` ([lng, lat]), `division`, `district`, `thana` — all required.
     - `imageUrls`: string[] (required, 1 to 5 items)
     - `status`: enum ["active", "pending_remod", "reserved", "sold", "temporarily_suppressed"] (default: "active")
     - `buyerId`: ObjectId (ref: "User", optional — set on "Mark as Sold")
     - `remodReason`: string (optional)
     - `isFeatured`: boolean (default: false)
     - `isUrgent`: boolean (default: false)
     - `reportCount`: number (default: 0)
     - `viewCount`: number (default: 0)
     - `expiresAt`: Date (30-day TTL from creation)
   - Enable `timestamps: true`.
   - Define indexes:
     - `{ location: "2dsphere" }` — Geospatial search.
     - `{ title: "text", description: "text" }` with weights (title: 5, description: 1) — Full-text search.
     - `{ status: 1, category: 1, "location.thana": 1, createdAt: -1 }` — Compound filter index.
     - `{ sellerId: 1 }` — For "my ads" queries.
     - `{ expiresAt: 1 }` with TTL index for auto-cleanup.

2. `src/modules/listings/listing.repository.ts`:
   - `create(data)` — Insert a new listing.
   - `findById(id)` — Find listing by _id, populate seller's displayName and trustScore.
   - `search(filters)` — Advanced search with optional: category, minPrice, maxPrice, thana, text search ($text), geospatial ($near), status = "active" only. Support pagination (page, limit). Return sorted by createdAt descending.
   - `updateStatus(id, status, buyerId?)` — Atomic update of listing status.
   - `findBySeller(sellerId, page, limit)` — Get listings owned by a specific seller.
   - `incrementReportCount(id)` — Atomic increment of reportCount. Return new count.
   - `checkRemodTrigger(originalListing, updateData)` — Compare title, category, imageUrls, and price (Δ > 30%) to determine if re-moderation is needed.
```

---

### Prompt 3.3 — Chat Module (Conversation + Message Models & Repository)

```
Create the Chat domain module in `src/modules/chat/`.

**Files to create:**

1. `src/modules/chat/conversation.model.ts`:
   - Define `IConversation` interface:
     - `listingId`: ObjectId (ref: "Listing", required)
     - `participantIds`: ObjectId[] (array of exactly 2 User refs)
     - `lastMessage`: string
     - `lastMessageAt`: Date
     - `isClosed`: boolean (default: false — closed when listing is sold)
   - Enable `timestamps: true`.
   - Index on `{ participantIds: 1 }` for fast user conversation retrieval.
   - Compound index on `{ listingId: 1, participantIds: 1 }` to prevent duplicate conversations per listing-pair.

2. `src/modules/chat/message.model.ts`:
   - Define `IMessage` interface:
     - `conversationId`: ObjectId (ref: "Conversation", required)
     - `senderId`: ObjectId (ref: "User", required)
     - `text`: string (required, maxlength: 1000)
     - `isScamFlagged`: boolean (default: false)
     - `flaggedKeywords`: string[] (the matched scam keywords, if any)
     - `isDeletedBySender`: boolean (default: false)
     - `isDeletedByRecipient`: boolean (default: false)
   - Enable `timestamps: true`.
   - Compound index on `{ conversationId: 1, createdAt: 1 }` for message history pagination.

3. `src/modules/chat/chat.repository.ts`:
   - `findOrCreateConversation(listingId, participantIds)` — Upsert conversation.
   - `getConversationsByUser(userId, page, limit)` — Paginated list of user's conversations, sorted by lastMessageAt descending, with listing title populated.
   - `createMessage(data)` — Insert a message document.
   - `getMessages(conversationId, page, limit)` — Paginated messages for a conversation, sorted by createdAt ascending.
   - `updateLastMessage(conversationId, text)` — Update the conversation's lastMessage and lastMessageAt.
   - `closeConversationsByListing(listingId)` — Bulk-set isClosed = true for all conversations of a sold listing.
```

---

### Prompt 3.4 — Review, Report, Blacklist & Quota Models

```
Create the remaining domain modules:

**1. Reviews Module — `src/modules/reviews/`:**
- `review.model.ts`: Define `IReview`:
  - `listingId`: ObjectId (ref: "Listing", required)
  - `reviewerId`: ObjectId (ref: "User", required)
  - `revieweeId`: ObjectId (ref: "User", required)
  - `rating`: number (required, min: 1, max: 5)
  - `tags`: string[] (enum: ["Item as Described", "Punctual Meetup", "Polite", "Smooth Deal", "Defective Item", "Demanded Advance Money", "Late / No-Show", "Rude"])
  - `comment`: string (optional, maxlength: 500)
  - Enable `timestamps: true`.
  - Index on `{ revieweeId: 1 }` for trust score aggregation.
  - Unique compound index on `{ listingId: 1, reviewerId: 1 }` to prevent duplicate reviews.
- `review.repository.ts`:
  - `create(data)` — Insert review.
  - `getByUser(revieweeId, page, limit)` — Paginated reviews received by a user.
  - `calculateAverageRating(revieweeId)` — Aggregation pipeline: group by revieweeId, compute average rating and count.

**2. Reports Module — `src/modules/moderation/`:**
- `report.model.ts`: Define `IReport`:
  - `reporterId`: ObjectId (ref: "User", required)
  - `targetType`: enum ["Listing", "User", "Message"] (required)
  - `targetId`: ObjectId (required)
  - `reason`: string (required)
  - `evidenceUrls`: string[] (optional, screenshot attachments)
  - `status`: enum ["pending", "reviewed", "resolved", "dismissed"] (default: "pending")
  - `reviewedBy`: ObjectId (ref: "User", optional — the moderator)
  - `resolution`: string (optional)
  - Enable `timestamps: true`.

- `blacklist.model.ts`: Define `IBlacklist`:
  - `nidHash`: string (required, unique)
  - `phoneHash`: string (required)
  - `deviceId`: string (optional)
  - `banReason`: string (required)
  - `bannedBy`: ObjectId (ref: "User", required — the admin/moderator)
  - `bannedAt`: Date (default: Date.now)
  - Enable `timestamps: true`.
  - Index on `nidHash` (unique), `phoneHash`, `deviceId`.

- `banAppeal.model.ts`: Define `IBanAppeal`:
  - `userId`: ObjectId (ref: "User", required)
  - `nidHash`: string (required)
  - `statement`: string (required, maxlength: 2000)
  - `proofUrls`: string[] (optional)
  - `status`: enum ["pending", "approved", "rejected"] (default: "pending")
  - `reviewedBy`: ObjectId (optional)
  - `resolvedAt`: Date (optional)
  - Enable `timestamps: true`.

- `moderation.repository.ts`:
  - `createReport(data)` — Insert report.
  - `addToBlacklist(data)` — Insert into blacklist.
  - `isBlacklisted(nidHash?, phoneHash?, deviceId?)` — Check if any identifier exists in blacklist.
  - `createBanAppeal(data)` — Insert appeal.
  - `getPendingAppeals(page, limit)` — For moderator queue.

**3. Quotas Module — `src/modules/quotas/`:**
- `quota.model.ts`: Define `IAdQuota`:
  - `userId`: ObjectId (ref: "User", required)
  - `monthYear`: string (format: "YYYY-MM", required)
  - `usedFreeAds`: number (default: 0)
  - `purchasedAds`: number (default: 0)
  - Enable `timestamps: true`.
  - Unique compound index on `{ userId: 1, monthYear: 1 }`.
- `quota.repository.ts`:
  - `getOrCreateQuota(userId, monthYear)` — Upsert the monthly quota document.
  - `incrementUsedFreeAds(userId, monthYear)` — Atomic increment. Return new count.
  - `incrementPurchasedAds(userId, monthYear)` — Atomic increment after payment.
  - `canPostFreeAd(userId, monthYear)` — Returns true if usedFreeAds < 2.

**4. KYC Records Module — `src/modules/kyc/`:**
- `kyc.model.ts`: Define `IKycRecord`:
  - `userId`: ObjectId (ref: "User", required)
  - `nidHash`: string (unique)
  - `documentType`: enum ["smart_card_10", "legacy_13", "legacy_17"]
  - `livenessConfidence`: number (the face match % from Porichoy)
  - `status`: enum ["processing", "verified", "rejected", "pending_manual"] (default: "processing")
  - `attemptsToday`: number (default: 1)
  - `rejectionReason`: string (optional)
  - Enable `timestamps: true`.

**5. Safe Meetup Spots — `src/modules/safespots/`:**
- `safespot.model.ts`: Define `ISafeSpot`:
  - `name`: string (required) — e.g., "Mirpur 10 Metro Station"
  - `category`: enum ["metro_station", "police_station", "shopping_mall", "bank"] (required)
  - `location`: GeoJSON Point with coordinates
  - `thana`: string (required)
  - `district`: string (required)
  - `division`: string (required)
  - `isActive`: boolean (default: true)
  - Index on `{ location: "2dsphere" }`.
- `safespot.repository.ts`:
  - `findNearby(lng, lat, maxDistanceMeters = 5000, limit = 5)` — Geospatial $near query.
```

---

## Phase 4: Business Logic — Service Layer

### Prompt 4.1 — Auth Service (OTP + JWT + Refresh Token Rotation)

```
Create the Authentication service in `src/modules/auth/`.

**Files to create:**

1. `src/modules/auth/auth.service.ts`:
   Implement the following methods:

   - `requestOTP(phone: string)`:
     - Validate phone against BD_PHONE_REGEX.
     - Check Redis rate-limit: max 3 OTP requests per phone per hour. Key: `otp_limit:{phone}`.
     - Generate a 6-digit OTP using the crypto utility.
     - Store OTP in Redis with 5-minute TTL: Key `otp:{phone}`, Value: hashed OTP.
     - Dispatch SMS sending job to BullMQ `sms-queue` (do NOT send synchronously).
     - Return `{ message: "OTP sent", expiresIn: 300 }`.

   - `verifyOTP(phone: string, otp: string)`:
     - Retrieve stored OTP hash from Redis key `otp:{phone}`.
     - Compare provided OTP against stored hash.
     - If invalid, throw UnauthorizedError("Invalid or expired OTP").
     - If valid, delete the OTP key from Redis.
     - Find or create User by phone (default role: "registered", status: "active").
     - Generate access token (JWT, 15min, payload: { userId, role, isNidVerified: !!user.nidHash, deviceId }).
     - Generate refresh token (crypto random 64 bytes, hex encoded).
     - Store refresh token hash in Redis: Key `refresh:{userId}:{tokenId}`, TTL 30 days.
     - Return `{ accessToken, user }` and set refreshToken as HttpOnly Secure SameSite=Strict cookie.

   - `refreshAccessToken(refreshToken: string)`:
     - Decode the refresh token to extract userId and tokenId.
     - Look up `refresh:{userId}:{tokenId}` in Redis.
     - If not found, **Refresh Token Rotation breach detected** → purge ALL refresh tokens for this user from Redis (force logout everywhere).
     - If found, delete the old token, generate a new refresh token, store the new one in Redis.
     - Issue a new access token.
     - Return new access token and set new refresh token cookie.

   - `logout(userId: string, tokenId: string)`:
     - Delete the specific refresh token from Redis.
     - Clear the refreshToken cookie.

2. `src/modules/auth/auth.validation.ts`:
   - Define Zod schemas for:
     - `requestOTPSchema`: `{ body: { phone: string (BD_PHONE_REGEX) } }`
     - `verifyOTPSchema`: `{ body: { phone: string, otp: string (6 digits) } }`

3. `src/modules/auth/auth.controller.ts`:
   - `POST /register` → calls `requestOTP`.
   - `POST /verify-otp` → calls `verifyOTP`.
   - `POST /refresh-token` → calls `refreshAccessToken` (reads cookie).
   - `POST /logout` → calls `logout`.

4. `src/modules/auth/auth.routes.ts`:
   - Wire up Express Router with validation middleware and controllers.
   - Apply OTP rate limiter (3 requests per phone per hour) on the `/register` endpoint.
```

---

### Prompt 4.2 — KYC Service (e-KYC Verification with BullMQ Worker)

```
Create the KYC (Know Your Customer) verification service in `src/modules/kyc/`.

**Files to create:**

1. `src/modules/kyc/kyc.service.ts`:
   - `initiateKYC(userId: string, nidNumber: string, dob: Date, selfieImage: Buffer)`:
     - Validate NID against NID_REGEX (must be 10, 13, or 17 digits).
     - Validate user is at least 18 years old (DOB <= Today - 18 Years). Throw BadRequestError if under 18.
     - Normalize NID using `normalizeNID(nidNumber, dob)` — auto-prepend birth year if 13-digit.
     - Generate `nidHash = hashNID(normalizedNID)`.
     - Check if nidHash exists in Blacklist collection. If found, throw ForbiddenError("This identity has been permanently banned").
     - Check if nidHash is already bound to another user. If so, throw ConflictError("This NID is already registered to another account").
     - Acquire Redis distributed mutex lock: `SET lock:kyc:{userId} 1 EX 30 NX`. If lock fails, throw RateLimitError("KYC submission already in progress").
     - Check daily attempt limit: max 3 attempts per 24 hours. Key: `kyc_attempts:{userId}:{YYYY-MM-DD}`.
     - Upload selfie image to private S3 bucket (AES-256 encrypted). Generate a pre-signed URL with 60-second TTL for the background worker.
     - Create a KYC record in the database with status "processing".
     - Dispatch job to BullMQ `kyc-processing-queue` with payload: { userId, nidHash, normalizedNID, dob, selfieS3Key }.
     - Return HTTP 202: `{ message: "Verification in progress. You will be notified.", status: "processing" }`.

2. `src/modules/kyc/kyc.worker.ts` (BullMQ Worker):
   - Listen on `kyc-processing-queue`.
   - For each job:
     a. Call external Porichoy e-KYC API with the normalized NID and DOB.
     b. On Porichoy 5xx error: Re-queue with exponential backoff (retry after 2m, 5m, 15m). Max 3 retries.
     c. On Porichoy success: Compare the returned NID photo against the user's selfie using the face match engine. Confidence threshold >= 85%.
     d. If face match passes:
        - Update user: set `nidHash`, `legalNameBangla` (from Porichoy response), `role` → "verified".
        - Update KYC record: status → "verified", livenessConfidence.
        - Emit Socket.io event `KYC_VERIFIED` to the user's room.
     e. If face match fails:
        - Update KYC record: status → "rejected", rejectionReason.
        - Emit Socket.io event `KYC_REJECTED` with reason.
     f. Release the Redis mutex lock.

3. `src/modules/kyc/kyc.validation.ts`:
   - Zod schema for KYC submission: nidNumber (NID_REGEX), dob (date string, ISO format), selfieImage (file required).

4. `src/modules/kyc/kyc.controller.ts`:
   - `POST /verify-kyc` → authenticate middleware → requireRegistered → multer (single file) → validate → calls `initiateKYC`.

5. `src/modules/kyc/kyc.routes.ts`:
   - Mount at `/api/v1/auth/verify-kyc`.
   - Apply authenticate and rate limiter (3 per user per 24h).
```

---

### Prompt 4.3 — Listings Service (CRUD, Search, Quota, Re-moderation)

```
Create the Listings service in `src/modules/listings/`.

**Files to create:**

1. `src/modules/listings/listing.service.ts`:
   - `createListing(userId: string, data: CreateListingInput)`:
     - Check monthly quota: Get current month "YYYY-MM". Call `quota.canPostFreeAd(userId, monthYear)`.
     - If quota exceeded (>= 2 free ads used), throw a QuotaExceededError with message: "Monthly free ad limit reached. Purchase an additional ad slot."
     - Validate price against category-specific price floors:
       - smartphones: min 1000 BDT
       - laptops: min 3000 BDT
       - motorbikes: min 20000 BDT
       - others: min 1 BDT
     - Set `expiresAt` = now + 30 days.
     - Dispatch image watermarking job to BullMQ `image-processing-queue` with the listing's imageUrls and the generated listingId.
     - Save listing with status "active".
     - Increment the user's monthly free ad quota counter.
     - Return the created listing.

   - `searchListings(filters: SearchFilters)`:
     - Build MongoDB query dynamically:
       - Always filter `status: "active"`.
       - If `category`: add `{ category }`.
       - If `minPrice` / `maxPrice`: add `{ price: { $gte, $lte } }`.
       - If `search` (text): add `{ $text: { $search } }` with text score sorting.
       - If `lat`, `lng`, `radius`: add geospatial `$near` with `$maxDistance` in meters.
       - If `thana`: add `{ "location.thana" }`.
       - If `condition`: add `{ condition }`.
     - Apply pagination (page, limit, default limit 20, max 50).
     - Populate seller's displayName and trustScore.
     - Return paginated results.

   - `getListingById(id: string)`:
     - Find listing by _id. Populate seller info. Increment viewCount atomically.
     - If not found, throw NotFoundError.

   - `updateListing(userId: string, listingId: string, updateData)`:
     - Verify the listing belongs to the userId (sellerId === userId). If not, throw ForbiddenError.
     - Check re-moderation trigger: if title, category, or imageUrls changed, OR if price changed by more than 30% from original → set status to "pending_remod" and set remodReason.
     - Save and return updated listing.

   - `updateListingStatus(userId: string, listingId: string, newStatus: string, buyerId?: string)`:
     - Verify ownership.
     - If newStatus is "sold":
       - Use MongoDB atomic session/transaction:
         1. Update listing status to "sold" and set buyerId.
         2. Close all open conversations for this listing.
         3. Dispatch BullMQ job to send mutual review notification to buyer and seller.
     - If newStatus is "reserved" or "active": simple status update.

   - `getMyListings(userId: string, page, limit)`:
     - Return paginated listings where sellerId = userId.

2. `src/modules/listings/listing.validation.ts`:
   - Zod schemas for:
     - `createListingSchema`: title (10-80 chars), category (enum), description (30-2000 chars), price (positive int), condition (enum), location object (coordinates, division, district, thana), imageUrls (array 1-5 strings).
     - `searchListingsSchema`: query params — category, minPrice, maxPrice, search, lat, lng, radius, thana, condition, page, limit.
     - `updateStatusSchema`: status (enum), buyerId (optional ObjectId string).

3. `src/modules/listings/listing.controller.ts`:
   - `POST /` → authenticate, requireVerified, validate → createListing
   - `GET /` → validate query → searchListings (public, no auth required)
   - `GET /:id` → getListingById (public)
   - `PUT /:id` → authenticate, requireVerified, validate → updateListing
   - `PATCH /:id/status` → authenticate, requireVerified, validate → updateListingStatus
   - `GET /my-listings` → authenticate → getMyListings

4. `src/modules/listings/listing.routes.ts`:
   - Mount all routes. Apply rate limiters on write endpoints (create: 10/hour, update: 20/hour).
```

---

### Prompt 4.4 — Chat Service (Socket.io + Anti-Scam Interceptor)

```
Create the Chat service in `src/modules/chat/`.

**Files to create:**

1. `src/modules/chat/chat.service.ts`:
   - `initializeConversation(userId: string, listingId: string, text: string)`:
     - Verify listing exists and status is "active". Throw BadRequestError if listing is sold/suppressed.
     - Verify the user is NOT the listing seller (can't chat with yourself).
     - Find or create a Conversation document with participantIds = [userId, listing.sellerId].
     - Run the message text through the anti-scam interceptor (see below).
     - Create the first Message document.
     - Update conversation's lastMessage and lastMessageAt.
     - Return { conversationId, messageId, isScamFlagged }.

   - `sendMessage(userId: string, conversationId: string, text: string)`:
     - Verify user is a participant of the conversation.
     - Verify conversation is not closed (isClosed !== true).
     - Run text through anti-scam interceptor.
     - Create Message document.
     - Update conversation's lastMessage and lastMessageAt.
     - Return the created message.

   - `getConversations(userId: string, page, limit)`:
     - Call repository to get paginated conversations where participantIds includes userId.
     - Populate listing title and other participant's displayName.

   - `getMessages(userId: string, conversationId: string, page, limit)`:
     - Verify user is a participant.
     - Return paginated messages. Exclude messages soft-deleted by this user (isDeletedBySender/isDeletedByRecipient).

   - `deleteMessage(userId: string, messageId: string)`:
     - Soft-delete only: set isDeletedBySender or isDeletedByRecipient based on who the user is. Message stays in the 90-day audit vault.

2. `src/modules/chat/scamInterceptor.ts`:
   - `interceptMessage(text: string): { isScamFlagged: boolean, flaggedKeywords: string[] }`:
     - Run the message text against all SCAM_PATTERNS regex.
     - If any pattern matches, extract the matched keywords.
     - Return `{ isScamFlagged: true, flaggedKeywords: ["bKash", "advance"] }` or `{ isScamFlagged: false, flaggedKeywords: [] }`.

3. `src/modules/chat/chat.socket.ts`:
   - Socket.io event handlers for real-time chat:
     - `connection`: Authenticate via JWT token in handshake auth. Attach userId to socket.
     - `join_conversation`: User joins a Socket.io room named `conv:{conversationId}`. Verify user is a participant.
     - `send_message`: Receive message text. Call `chatService.sendMessage()`. If scam flagged, emit `SCAM_WARNING` event to the room. Broadcast the message to the room.
     - `typing`: Broadcast typing indicator to the room.
     - `stop_typing`: Broadcast stop typing to the room.
     - `disconnect`: Clean up.
     - Admin event `FORCE_CHAT_TERMINATION`: Broadcast to a specific room to freeze the chat UI (used when a scammer is banned mid-conversation).

4. `src/modules/chat/chat.controller.ts` (REST fallback for conversation init & history):
   - `POST /conversations` → authenticate, requireVerified → initializeConversation
   - `GET /conversations` → authenticate → getConversations
   - `GET /conversations/:id/messages` → authenticate → getMessages

5. `src/modules/chat/chat.routes.ts`:
   - Mount REST routes.

6. `src/modules/chat/chat.validation.ts`:
   - Zod schemas for creating conversations (listingId, text), sending messages (text), pagination query params.
```

---

### Prompt 4.5 — Reviews Service (Mutual Reviews + Bayesian Trust Score)

```
Create the Reviews service in `src/modules/reviews/`.

**Files to create:**

1. `src/modules/reviews/review.service.ts`:
   - `submitReview(reviewerId: string, data: { listingId, revieweeId, rating, tags, comment })`:
     - Verify the listing exists and its status is "sold".
     - Verify the reviewer was either the buyer or seller of the listing (reviewerId must be listing.sellerId or listing.buyerId).
     - Verify the revieweeId is the OTHER party (buyer reviews seller, seller reviews buyer).
     - Check that the review window is still open: listing.updatedAt (when sold) + 14 days > now. If expired, throw BadRequestError("Review window has expired").
     - Check for duplicate: a review from this reviewer for this listing must not already exist.
     - Create the Review document.
     - Recalculate the reviewee's Bayesian trust score:
       ```
       W = (R * v + C * m) / (v + m)
       ```
       where R = reviewee's average rating, v = total review count, C = 4.5 (platform baseline), m = 5 (minimum weight).
     - Update the reviewee's `trustScore` and `totalReviews` in the User document.
     - Return the created review.

   - `getReviewsForUser(userId: string, page, limit)`:
     - Paginated reviews where revieweeId = userId.
     - Populate reviewer's displayName.

2. `src/modules/reviews/review.validation.ts`:
   - Zod schema: listingId (ObjectId string), revieweeId (ObjectId string), rating (integer 1-5), tags (array of enum strings), comment (optional, max 500 chars).

3. `src/modules/reviews/review.controller.ts`:
   - `POST /reviews` → authenticate, requireVerified, validate → submitReview
   - `GET /reviews/user/:userId` → getReviewsForUser (public)

4. `src/modules/reviews/review.routes.ts`:
   - Mount routes with rate limiter on POST (5 reviews per day).
```

---

### Prompt 4.6 — Moderation Service (Reports, Circuit Breaker, Blacklist, Ban Appeals)

```
Create the Moderation service in `src/modules/moderation/`.

**Files to create:**

1. `src/modules/moderation/moderation.service.ts`:
   - `submitReport(reporterId: string, data: { targetType, targetId, reason, evidenceUrls? })`:
     - Verify the target (Listing/User/Message) actually exists.
     - Create the Report document.
     - If targetType is "Listing":
       - Increment the listing's reportCount.
       - **Circuit Breaker Logic**: Use Redis sliding window counter:
         - Key: `report:listing:{targetId}`, INCR, then EXPIRE 600 (10 minutes).
         - If counter reaches >= 3 unique verified reports within 10 minutes:
           - Automatically flip listing status to "temporarily_suppressed".
           - Emit Socket.io event to the Moderator Dashboard: `URGENT_REPORT`.
     - Return confirmation.

   - `reviewReport(moderatorId: string, reportId: string, action: "resolve" | "dismiss", resolution?: string)`:
     - Verify moderator role.
     - Update report status and set reviewedBy, resolution.
     - If resolved and targetType is "Listing", keep listing suppressed. If dismissed, re-activate listing.

   - `banUser(adminId: string, userId: string, reason: string)`:
     - Verify admin/superadmin role.
     - Update user status to "banned", set banReason.
     - Retrieve user's nidHash, phone, and deviceIds.
     - Insert into Blacklist collection: nidHash, phoneHash, deviceId, banReason, bannedBy.
     - Emit Socket.io event `FORCE_CHAT_TERMINATION` to all active chat rooms involving this user.
     - Suppress all active listings by this user.

   - `submitBanAppeal(userId: string, data: { statement, proofUrls })`:
     - Verify user is currently banned.
     - Create BanAppeal document.

   - `reviewBanAppeal(moderatorId: string, appealId: string, decision: "approved" | "rejected")`:
     - If approved: Remove user from Blacklist, set user status to "active", role to "verified".
     - If rejected: Update appeal status.
     - Set resolvedAt.

   - `getModerationQueue(page, limit)`:
     - Return pending reports sorted by createdAt, with target details populated.

2. `src/modules/moderation/moderation.validation.ts`:
   - Zod schemas for report submission, report review, ban action, ban appeal.

3. `src/modules/moderation/moderation.controller.ts`:
   - `POST /reports` → authenticate (registered or verified) → submitReport
   - `PATCH /reports/:id/review` → authenticate, authorize("moderator", "superadmin") → reviewReport
   - `POST /users/:id/ban` → authenticate, authorize("superadmin") → banUser
   - `POST /ban-appeals` → authenticate → submitBanAppeal
   - `PATCH /ban-appeals/:id/review` → authenticate, authorize("moderator", "superadmin") → reviewBanAppeal
   - `GET /moderation/queue` → authenticate, authorize("moderator", "superadmin") → getModerationQueue

4. `src/modules/moderation/moderation.routes.ts`:
   - Mount all routes.
```

---

### Prompt 4.7 — Safe Meetup Spots Service

```
Create the Safe Meetup Spots service in `src/modules/safespots/`.

**Files to create:**

1. `src/modules/safespots/safespot.service.ts`:
   - `findNearbySpots(lng: number, lat: number, maxDistance?: number)`:
     - Default maxDistance: 5000 meters (5 km).
     - Query MongoDB with `$near` geospatial operator on the 2dsphere-indexed location field.
     - Limit to 5 results.
     - Return array of SafeSpot documents with name, category, location, thana.

   - `createSpot(data)` — Admin-only: Add a new safe meetup location.

2. `src/modules/safespots/safespot.validation.ts`:
   - Zod schema: lat (number), lng (number), maxDistance (optional number).

3. `src/modules/safespots/safespot.controller.ts`:
   - `GET /safespots/nearby?lat=&lng=&maxDistance=` → authenticate, requireVerified → findNearbySpots
   - `POST /safespots` → authenticate, authorize("superadmin") → createSpot

4. `src/modules/safespots/safespot.routes.ts`:
   - Mount routes.
```

---

## Phase 5: Background Workers & Job Queues

### Prompt 5.1 — BullMQ Queue Definitions & Workers

```
Create the BullMQ job queue system in `src/shared/queues/`.

**Files to create:**

1. `src/shared/queues/queueConfig.ts`:
   - Define queue names as constants:
     - `SMS_QUEUE = "sms-queue"`
     - `KYC_PROCESSING_QUEUE = "kyc-processing-queue"`
     - `IMAGE_PROCESSING_QUEUE = "image-processing-queue"`
     - `NOTIFICATION_QUEUE = "notification-queue"`
   - Create and export a BullMQ `Queue` instance for each, connected to the Redis config.

2. `src/shared/queues/smsWorker.ts`:
   - BullMQ Worker listening on `sms-queue`.
   - Job data: `{ phone, message }`.
   - Makes HTTP POST request to the Bangladeshi SMS gateway API (env: SMS_API_URL, SMS_API_KEY).
   - On failure: Retry up to 3 times with exponential backoff.
   - Log success/failure.

3. `src/shared/queues/imageWorker.ts`:
   - BullMQ Worker listening on `image-processing-queue`.
   - Job data: `{ listingId, imageUrls }`.
   - For each image URL:
     a. Download the image from S3.
     b. Use Sharp.js to resize (max 1920px width), convert to WebP (quality 80).
     c. Burn a semi-transparent watermark text onto the image: `"SafeKroy — ID #${listingId}"`.
     d. Upload processed image back to the public S3/CDN bucket.
     e. Update the listing document's imageUrls array with the new watermarked URLs.
     f. Delete the original raw upload.

4. `src/shared/queues/notificationWorker.ts`:
   - BullMQ Worker listening on `notification-queue`.
   - Job types:
     - `REVIEW_PROMPT`: Send in-app push notification to buyer and seller after deal closure.
     - `KYC_RESULT`: Send verification result notification.
     - `AD_EXPIRING`: Send ad expiry reminder (3 days before).
   - Emit Socket.io events for in-app notifications.
   - Dispatch SMS for critical notifications (KYC, ban).

5. `src/shared/queues/index.ts`:
   - Export a `startAllWorkers()` function that initializes all workers.
   - Call this from `server.ts` after database connection is established.
```

---

## Phase 6: API Router Assembly & Final Wiring

### Prompt 6.1 — Master API Router & Module Registration

```
Create the master API router that wires all module routes together.

**Files to create:**

1. `src/routes/index.ts`:
   - Create the main Express Router.
   - Mount all module routes under `/api/v1`:
     - `/api/v1/auth` → auth.routes
     - `/api/v1/auth/verify-kyc` → kyc.routes
     - `/api/v1/users` → user.routes (profile endpoints)
     - `/api/v1/listings` → listing.routes
     - `/api/v1/conversations` → chat.routes
     - `/api/v1/reviews` → review.routes
     - `/api/v1/reports` → moderation report routes
     - `/api/v1/moderation` → moderation admin routes
     - `/api/v1/safespots` → safespot.routes
   - Add a health check endpoint: `GET /api/v1/health` → returns `{ status: "ok", uptime, timestamp }`.

2. `src/modules/users/user.controller.ts`:
   - `GET /me` → authenticate → return current user profile (exclude sensitive fields like nidHash).
   - `GET /:id/phone` → authenticate, requireVerified, phonRevealRateLimiter (5/day) → return phone number.
   - `GET /:id/profile` → public profile: displayName, trustScore, totalDeals, totalReviews, createdAt.

3. `src/modules/users/user.routes.ts`:
   - Mount user routes.

Now update `src/app.ts` to import and mount the master router.
Update `src/server.ts` to:
  - Import and call `startAllWorkers()`.
  - Import and initialize the Socket.io chat handlers from `chat.socket.ts`.
```

---

## Phase 7: Testing & Verification

### Prompt 7.1 — Seed Data & Smoke Test

```
Create seed data and a basic smoke test setup.

**Files to create:**

1. `src/scripts/seed.ts`:
   - Connect to the database.
   - Insert sample data:
     - 3 sample users (1 registered, 1 verified, 1 moderator) with mock phone numbers and NID hashes.
     - 5 sample listings across different categories with GeoJSON locations in Dhaka.
     - 2 sample conversations with messages.
     - 5 sample Safe Meetup Spots in Dhaka (Mirpur 10 Metro Station, Bashundhara City Mall, Gulshan Police Station, Uttara Sector 3 Metro Station, Jamuna Future Park).
   - Log inserted document IDs.
   - Disconnect from database.
   - Run via: `npx tsx src/scripts/seed.ts`

2. `src/scripts/healthCheck.ts`:
   - A quick script that:
     - Tests MongoDB connection.
     - Tests Redis connection (PING).
     - Tests that all BullMQ queues are accessible.
     - Prints a status report.
   - Run via: `npx tsx src/scripts/healthCheck.ts`

3. Add a `README.md` at the project root with:
   - Project description.
   - Tech stack summary.
   - Setup instructions (clone, install, env setup, seed, run dev).
   - API endpoint overview table.
   - Folder structure overview matching the architecture.md specification.
```

---

> **Execution Order:** Follow prompts 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3 → 3.4 → 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 5.1 → 6.1 → 7.1. Each prompt assumes the output of all previous prompts is complete.
