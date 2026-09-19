# SafeKroy (Amar-Bazar) — Database Design Specification

This document defines the database architecture for SafeKroy, a high-scale, identity-first, C2C classifieds marketplace.

---

## 1. Collection List
The system utilizes MongoDB as the primary document store, organized into these core collections:

1.  **Users:** Stores identity, profile, and verification status.
2.  **Listings:** Stores active/sold classified advertisements.
3.  **Conversations:** Stores real-time chat threads between users.
4.  **Messages:** Stores individual messages within conversations.
5.  **Reviews:** Stores reputation and feedback records.
6.  **Reports:** Stores safety flags and moderation activities.
7.  **Payments:** Stores micro-transaction logs (promotions/quotas).
8.  **Blacklist:** Immutable repository of banned NIDs and device fingerprints.

---

## 3. Relationship
SafeKroy utilizes an **"Extended Reference"** pattern for most relationships to optimize read performance in a C2C environment:

*   **Users -> Listings:** One-to-Many (Referenced by `sellerId`).
*   **Listings -> Conversations:** One-to-Many (Referenced by `listingId`).
*   **Users -> Reviews:** One-to-Many (Referenced by `revieweeId`).
*   **Conversations -> Messages:** One-to-Many (Referenced by `conversationId`).

---

## 4. Indexing Strategy
Indexing is optimized for search speed and spatial queries:

*   **Listings:**
    *   `{ location: "2dsphere" }`: For geospatial search.
    *   `{ title: "text", description: "text" }`: For full-text faceted search.
    *   `{ status: 1, category: 1, "location.thana": 1, createdAt: -1 }`: For filtering active/sold ads.
*   **Users:**
    *   `{ phone: 1 }`: Unique index for login/auth.
    *   `{ nidHash: 1 }`: Unique index for identity uniqueness.
*   **Conversations:**
    *   `{ participantIds: 1 }`: For fast retrieval of user conversation lists.

---

## 5. Validation
Mongoose/MongoDB Schema validation enforces data quality at the database layer:

*   **KYC Compliance:** `nidHash` and `phone` must be present and follow defined regex/hashing standards.
*   **Price Floors:** `price` must be a positive integer to prevent invalid listing creation.
*   **Enum Constraints:** `status` field must be within `['active', 'pending_remod', 'reserved', 'sold', 'temporarily_suppressed']`.
*   **Required Fields:** Critical fields for search and trust (title, category, sellerId) are marked as required.

---

## 6. Aggregation
Aggregation pipelines are used for:

*   **Search/Filtering:** Dynamic faceted counts for category search.
*   **Reputation System:** Computing average ratings by grouping review documents by `revieweeId`.
*   **Moderation:** Identifying high-frequency reporting patterns on specific listings or users.

---

## 7. Transaction
SafeKroy utilizes MongoDB Multi-Document ACID Transactions for critical operations:

*   **Marking Ad as "Sold":** Atomically updates `Listing` status and creates a `Deal/Review` record.
*   **Payment/Quota Deductions:** Ensures that ad promotion counts are deducted concurrently with the successful payment processing confirmation.

---

## 8. Sample Data
*(Example snippet for a Listing)*
```json
{
  "_id": "66e8...",
  "sellerId": "user_123",
  "title": "Sony Bravia 43 inch TV",
  "category": "electronics",
  "price": 25000,
  "location": { "type": "Point", "coordinates": [90.41, 23.81] },
  "status": "active",
  "createdAt": "2026-09-16T10:00:00Z"
}
```

---

## 9. Mongoose Schema
*Implementation example (partial):*
```typescript
const ListingSchema = new Schema({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] }
});
ListingSchema.index({ location: '2dsphere' });
```

---

## 10. ERD (Entity Relationship Diagram)
*Conceptual mapping:*
- `User` --(1:N)-- `Listing`
- `Listing` --(1:N)-- `Conversation`
- `Conversation` --(1:N)-- `Message`
- `User` --(1:N)-- `Review`
- `User` --(1:N)-- `Payment`
