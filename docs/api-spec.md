# SafeKroy API Specification

This document defines the core REST API endpoints for the SafeKroy marketplace, based on the PRD and database schema.

---

## 1. Authentication & Identity (e-KYC)

### 1.1 Mobile Registration
Initiates the registration process and sends an OTP.
*   **Endpoint:** `/api/v1/auth/register`
*   **Method:** `POST`
*   **Auth Required:** No
*   **Request Body:**
    ```json
    {
      "phone": "+8801712345678"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "OTP sent successfully",
      "expiresIn": 300
    }
    ```

### 1.2 OTP Verification
Verifies the OTP and returns an authentication token.
*   **Endpoint:** `/api/v1/auth/verify-otp`
*   **Method:** `POST`
*   **Auth Required:** No
*   **Request Body:**
    ```json
    {
      "phone": "+8801712345678",
      "otp": "482910"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "66e8...",
        "phone": "+8801712345678",
        "role": "user",
        "status": "active"
      }
    }
    ```

### 1.3 NID & Biometric Verification (e-KYC)
Submits NID details and liveness selfie for verification.
*   **Endpoint:** `/api/v1/auth/verify-kyc`
*   **Method:** `POST` (Multipart/Form-Data)
*   **Auth Required:** Yes (Registered User)
*   **Request Body:**
    *   `nidNumber` (String) - 10, 13, or 17 digits
    *   `dob` (Date) - YYYY-MM-DD
    *   `selfieImage` (File) - Image file for liveness check
*   **Response (200 OK):**
    ```json
    {
      "message": "Identity verified successfully",
      "verifiedAt": "2026-09-17T10:00:00Z",
      "legalNameBangla": "মোঃ তানভীর আহমেদ"
    }
    ```

---

## 2. Users

### 2.1 Get Current User Profile
*   **Endpoint:** `/api/v1/users/me`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "id": "66e8...",
      "phone": "+8801712345678",
      "legalNameBangla": "মোঃ তানভীর আহমেদ",
      "role": "user",
      "status": "active",
      "verifiedAt": "2026-09-17T10:00:00Z",
      "trustScore": 4.9,
      "createdAt": "2026-09-16T10:00:00Z"
    }
    ```

### 2.2 Reveal Seller Phone Number
Rate-limited endpoint to reveal phone numbers (Max 5/day).
*   **Endpoint:** `/api/v1/users/:id/phone`
*   **Method:** `GET`
*   **Auth Required:** Yes (Verified Citizen)
*   **Response (200 OK):**
    ```json
    {
      "phone": "+8801712345678"
    }
    ```

---

## 3. Listings (Ads)

### 3.1 Create Listing
*   **Endpoint:** `/api/v1/listings`
*   **Method:** `POST`
*   **Auth Required:** Yes (Verified Citizen)
*   **Request Body:**
    ```json
    {
      "title": "Sony Bravia 43 inch TV",
      "category": "electronics",
      "description": "Mint condition, used for 6 months.",
      "price": 25000,
      "condition": "Like New",
      "location": {
        "type": "Point",
        "coordinates": [90.41, 23.81]
      },
      "imageUrls": ["https://s3.safekroy.com/images/1.jpg"]
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "Listing created successfully",
      "listingId": "66e9..."
    }
    ```

### 3.2 Search & Filter Listings
*   **Endpoint:** `/api/v1/listings`
*   **Method:** `GET`
*   **Auth Required:** No
*   **Query Params:** `category`, `minPrice`, `maxPrice`, `lat`, `lng`, `search`
*   **Response (200 OK):**
    ```json
    {
      "data": [
         {
           "id": "66e9...",
           "title": "Sony Bravia 43 inch TV",
           "price": 25000,
           "status": "active",
           "imageUrls": ["https://s3.safekroy.com/images/1.jpg"]
         }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150
      }
    }
    ```

### 3.3 Mark Listing as Sold
*   **Endpoint:** `/api/v1/listings/:id/status`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (Verified Citizen & Ad Owner)
*   **Request Body:**
    ```json
    {
      "status": "sold",
      "buyerId": "66ea..." 
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Listing marked as sold. Mutual review unlocked."
    }
    ```

---

## 4. Conversations & Messages

### 4.1 Initialize Conversation / Send Message
*   **Endpoint:** `/api/v1/conversations`
*   **Method:** `POST`
*   **Auth Required:** Yes (Verified Citizen)
*   **Request Body:**
    ```json
    {
      "listingId": "66e9...",
      "text": "Is this item still available?"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "conversationId": "66eb...",
      "messageId": "66ec..."
    }
    ```

### 4.2 Get User Conversations
*   **Endpoint:** `/api/v1/conversations`
*   **Method:** `GET`
*   **Auth Required:** Yes (Verified Citizen)
*   **Response (200 OK):**
    ```json
    {
      "data": [
        {
          "id": "66eb...",
          "listingId": "66e9...",
          "lastMessage": "Is this item still available?",
          "lastMessageAt": "2026-09-17T12:00:00Z"
        }
      ]
    }
    ```

---

## 5. Reviews & Ratings

### 5.1 Post a Mutual Review
*   **Endpoint:** `/api/v1/reviews`
*   **Method:** `POST`
*   **Auth Required:** Yes (Verified Citizen)
*   **Request Body:**
    ```json
    {
      "listingId": "66e9...",
      "revieweeId": "66ea...",
      "rating": 5,
      "comment": "Item as Described. Smooth Deal."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "Review submitted successfully"
    }
    ```

---

## 6. Trust & Safety (Reports)

### 6.1 Report User or Listing
*   **Endpoint:** `/api/v1/reports`
*   **Method:** `POST`
*   **Auth Required:** Yes (Registered/Verified)
*   **Request Body:**
    ```json
    {
      "targetType": "Listing",
      "targetId": "66e9...",
      "reason": "Seller demanded advance payment via bKash."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "Report submitted. Our moderation team will review this shortly."
    }
    ```

---

## 7. Standard Error Responses

SafeKroy API uses standard HTTP status codes and a consistent JSON error format.

### 7.1 Error Object Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_ENUM",
    "message": "Human readable error message.",
    "details": {} 
  }
}
```

### 7.2 Common Error Codes

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400** | `VALIDATION_ERROR` | Request body or parameters failed validation. |
| **401** | `UNAUTHORIZED` | Missing or invalid authentication token. |
| **403** | `FORBIDDEN` | Valid token, but lacks required role/permissions (e.g., Unverified User trying to post an ad). |
| **404** | `NOT_FOUND` | The requested resource (User, Listing, Conversation) does not exist. |
| **429** | `RATE_LIMIT_EXCEEDED`| Too many requests within the allowed window. |
| **500** | `INTERNAL_SERVER_ERROR`| Unexpected system failure. |
| **502** | `UPSTREAM_GATEWAY_TIMEOUT`| Failure to reach Porichoy / Government e-KYC servers. |

---

## 8. Version Control Strategy

The API employs **URI Versioning** to ensure backward compatibility as the mobile app ecosystem evolves.

*   **Current Version:** `/api/v1/...`
*   **Deprecation Policy:** When a new major version (e.g., `v2`) is introduced, `v1` will remain active for a minimum of 6 months. Mobile clients must be forced to update before the `v1` sunset date.
*   **Minor Updates:** Non-breaking changes (like adding new fields to responses) will be applied directly to the current `v1` endpoints. Breaking changes (removing fields, changing data types, or tightening validation) require a version bump.
