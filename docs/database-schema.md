## Schema

The database uses a flexible document model. Each collection follows a strict schema validation to ensure data integrity. All collections use Mongoose's built-in `timestamps` which automatically manage `createdAt` and `updatedAt` fields.

*   **Users Document:** `_id`, `phone`, `nidHash`, `role` (user/admin/moderator), `legalNameBangla`, `verifiedAt`, `trustScore`, `status` (active/suspended/banned), `createdAt`, `updatedAt`.
*   **Listings Document:** `_id`, `sellerId` (ref: User), `category`, `title`, `description`, `price`, `location` (GeoJSON Point), `status` (active/pending_remod/reserved/sold/temporarily_suppressed), `imageUrls`, `viewCount`, `reportedCount`, `createdAt`, `updatedAt`.
*   **Conversations Document:** `_id`, `listingId` (ref: Listing), `participantIds` (array of ref: User), `lastMessage` (String), `lastMessageAt` (Date), `createdAt`, `updatedAt`.
*   **Messages Document:** `_id`, `conversationId` (ref: Conversation), `senderId` (ref: User), `text`, `status` (sent/delivered/read), `isScamFlagged` (Boolean), `createdAt`, `updatedAt`.
*   **Reviews Document:** `_id`, `reviewerId` (ref: User), `revieweeId` (ref: User), `listingId` (ref: Listing), `rating` (Number 1-5), `comment` (String), `createdAt`, `updatedAt`.
*   **Reports Document:** `_id`, `reporterId` (ref: User), `targetType` (Listing/User/Message), `targetId` (ObjectId), `reason` (String), `status` (pending/reviewed/resolved), `createdAt`, `updatedAt`.
*   **Payments Document:** `_id`, `userId` (ref: User), `amount` (Number), `currency` (String), `transactionId` (String), `type` (promotion/quota), `status` (pending/success/failed), `createdAt`, `updatedAt`.
*   **Blacklist Document:** `_id`, `nidHash` (String), `deviceFingerprint` (String), `reason` (String), `bannedAt` (Date).
