# Amar Bazar Backend

Amar Bazar is a modern, high-performance classified marketplace designed for Bangladesh, focusing on trust, safety, and a premium user experience.

## Tech Stack
- **Node.js** with **Express.js** (TypeScript)
- **MongoDB** (Mongoose) for primary data storage
- **Redis** for caching, rate limiting, and BullMQ queues
- **BullMQ** for background job processing
- **Socket.io** for real-time chat
- **Zod** for schema validation

## Folder Structure

The project follows a modular, feature-based architecture pattern:
```
backend/
├── src/
│   ├── config/          # Configurations (Redis, Mongoose, Envs)
│   ├── modules/         # Feature domains
│   │   ├── auth/        # Authentication service
│   │   ├── kyc/         # KYC & Verification service
│   │   ├── listings/    # Ad listings, Search, Quota
│   │   ├── user/        # User domain logic
│   ├── shared/          # Shared utilities (errors, middlewares)
│   ├── routes/          # API Master Router
│   ├── scripts/         # Seed & Health check scripts
│   ├── app.ts           # Express App setup
│   └── server.ts        # Server entry point
```

## Setup Instructions

### 1. Clone & Install
```bash
git clone https://github.com/AmarBazar/backend.git
cd backend
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in the required details:
```bash
cp .env.example .env
```
Ensure you have access to a MongoDB instance (or Atlas) and a running Redis server.

### 3. Seed Database
Run the seed script to populate sample users, listings, conversations, and safe meetup spots:
```bash
npx tsx src/scripts/seed.ts
```

### 4. Health Check
Run the smoke test to verify DB and Redis connections:
```bash
npx tsx src/scripts/healthCheck.ts
```

### 5. Run the Server
Start the development server:
```bash
npm run dev
```

## API Endpoints Overview

| Module      | Method | Endpoint                        | Description                           |
|-------------|--------|---------------------------------|---------------------------------------|
| **Auth**    | POST   | `/api/v1/auth/otp/send`         | Send OTP to user phone                |
| **Auth**    | POST   | `/api/v1/auth/otp/verify`       | Verify OTP and issue JWT              |
| **KYC**     | POST   | `/api/v1/auth/kyc/initiate`     | Submit NID and Selfie for e-KYC       |
| **KYC**     | POST   | `/api/v1/auth/kyc/webhook`      | Receives callback from Porichoy API   |
| **Listings**| GET    | `/api/v1/listings/search`       | Advanced search (Geo, Text, Price)    |
| **Listings**| GET    | `/api/v1/listings/:id`          | Get listing by ID                     |
| **Listings**| POST   | `/api/v1/listings/`             | Create new listing (Requires KYC)     |
| **Listings**| GET    | `/api/v1/listings/me/my-listings`| Get user's own listings              |
| **Listings**| PATCH  | `/api/v1/listings/:id/status`   | Mark listing as sold/reserved         |
