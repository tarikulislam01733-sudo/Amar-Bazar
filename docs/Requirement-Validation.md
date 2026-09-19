# SafeKroy (Amar-Bazar) — Requirement Validation & Gap Analysis

**Document Reference:** `Requirement-Validation.md`  
**Base Specification:** [`PRD.md`](file:///c:/Users/Tarikul/Documents/Amar-Bazar/PRD.md) & [`Idea.md`](file:///c:/Users/Tarikul/Documents/Amar-Bazar/Idea.md)  
**Evaluator:** Senior Product Analyst & Business Systems Architect  
**Date:** September 15, 2026  
**Status:** Approved & Ready for Technical Architecture  

---

## Executive Summary
This document serves as an exhaustive audit and quality gate for the SafeKroy Product Requirements Document ([`PRD.md`](file:///c:/Users/Tarikul/Documents/Amar-Bazar/PRD.md)). To ensure the platform is robust, production-ready, and resilient against real-world fraud scenarios in Bangladesh, the requirements have been validated across **8 core analytical dimensions**:

1. **Missing Flow** (অনুপস্থিত ইউজার ও সিস্টেম ফ্লো)
2. **Edge Case** (প্রান্তিক ও বাস্তব পরিস্থিতি)
3. **Error Handling** (সিস্টেম, নেটওয়ার্ক ও ট্রানজ্যাকশন ব্যর্থতা)
4. **Security** (নিরাপত্তা, পিআইআই ও ফ্রড প্রতিরোধ)
5. **Validation** (ইনপুট ভ্যালিডেশন ও ফিল্ড রুলস)
6. **Permission** (রোল ও এক্সেস কন্ট্রোল - RBAC)
7. **Notification** (নোটিফিকেশন ও রিয়েল-টাইম অ্যালার্ট)
8. **Exception** (সিস্টেম ব্যতিক্রম ও রেস কন্ডিশন)

---

## 1. Missing Flows (অনুপস্থিত ইউজার ও সিস্টেম ফ্লো)

| ID | Flow Name | Severity | Gap in Current PRD | Detailed Specification & Solution |
| :--- | :--- | :--- | :--- | :--- |
| **MF-01** | **Deal Closure & "Mark as Sold" Flow** | 🔴 Critical | The PRD mentions an ad can be marked "Sold", but lacks any mechanism to tie the sale to a specific buyer or close ongoing inquiries. | When seller clicks **"Mark as Sold"**: <br>1. Displays active chat inquiries for this item.<br>2. Seller selects the verified buyer (or selects "Sold outside platform").<br>3. Listing is archived from public search and marked `SOLD`.<br>4. Automatic system prompt sent to both Buyer & Seller to trigger **MF-02 (Review Flow)**. |
| **MF-02** | **Post-Transaction Mutual Review Flow** | 🟠 High | PRD has zero reputation feedback loop. Verified identity alone doesn't prove seller honesty, punctuality, or product condition accuracy. | Both parties enter a 14-day review window:<br>• Star Rating (1 to 5 Stars)<br>• Positive Tags (*"Accurate Specs"*, *"Punctual"*, *"Fair Deal"* )<br>• Negative Tags (*"Late"*, *"Demanded Advance"*, *"Condition Mismatched"* )<br>• Public profile calculates and displays: **Community Trust Score (e.g., 4.9 ★ / 18 Deals)**. |
| **MF-03** | **Phone Number Change & SIM Migration Flow** | 🔴 Critical | Accounts are tied to mobile numbers. If an NID-verified user changes their SIM or loses their phone, they cannot re-verify the same NID on a new number. | 1. User goes to **Account Settings > Update Mobile**.<br>2. Requires OTP on old number.<br>3. *If old SIM lost:* User must perform **Facial Liveness Selfie** matched against the original stored NID face template.<br>4. Upon match (>85%), issue OTP to new number and re-bind NID. |
| **MF-04** | **Dispute & False-Positive Ban Appeal Flow** | 🟠 High | PRD specifies permanent blacklisting, but has no recourse if an innocent citizen is falsely reported by a competitor or disgruntled buyer. | Form in-app/web: **"Submit Ban Appeal"**.<br>• Requires user statement + proof upload (chat screenshots, police GD).<br>• Tickets routed to Admin Dispute Queue with a strict 48-hour SLA for human review before permanent de-blacklisting. |
| **MF-05** | **Ad Edit & Re-moderation Gate** | 🔴 Critical | PRD allows ad editing without re-triggering safety checks. Malicious actors could get a harmless book approved and later edit it into an illegal weapon or counterfeit phone. | Any modification to **Title**, **Category**, **Price ($\Delta > 30\%$)**, or **Images** triggers an automated status flip from `ACTIVE` to `PENDING_REMODERATION`. The previous version remains visible or the ad is temporarily paused until re-scanned. |
| **MF-06** | **Account Deletion vs Fraud History Preservation** | 🟡 Medium | No exit flow. Users must be able to delete their account, but banned fraud records must be preserved for police/CID investigations. | When user taps **"Delete My Account"**: Non-fraudulent personal data (name, email) is anonymized. However, **Salted NID Hash, Phone Hash, and Blacklist flags are permanently retained** in an immutable fraud vault. |
| **MF-07** | **In-Chat User Block & Mute Flow** | 🟡 Medium | No way for a user to stop receiving spam or harassing messages from a specific verified user without filing a formal fraud report. | In-chat 3-dot menu > **"Block User"**.<br>• Immediately disables chat input for both parties.<br>• Blocked user cannot view seller's active ads or contact number.<br>• Unblock option available in user Privacy Settings. |

---

## 2. Edge Cases (প্রান্তিক ও বাস্তব পরিস্থিতি)

```
                       Bangladesh Demographic & Market Edge Cases
                                           │
        ┌──────────────────────┬───────────┴───────────┬──────────────────────┐
        ▼                      ▼                       ▼                      ▼
  Old vs Smart NID       Under-18 Users        Weaponized Badges       1:1 NID Binding
  10, 13, 17-digit       College students      "I'm NID verified,      Strict uniqueness
  auto-prefix logic      strictly barred       send advance bKash"     per citizen
```

| ID | Edge Case Scenario | Severity | Real-world Context in Bangladesh | Engineering Rule & Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **EC-01** | **Old Laminated NID (13 & 17 Digits) vs Smart Card (10 Digits)** | 🔴 Critical | Millions of citizens hold 13-digit old paper NIDs. The Bangladesh Election Commission API requires prepending the 4-digit birth year (making it 17 digits) to query legacy records. | Frontend input accepts 10, 13, or 17 digits. If 13 digits are entered, the backend auto-prepends the 4-digit birth year extracted from the user's Date of Birth field before calling the e-KYC gateway. |
| **EC-02** | **Bangla Script vs English Transliteration Mismatch** | 🟠 High | Government Election Commission databases store names in Bangla (e.g., "মোঃ তানভীর আহমেদ"), while user profiles are entered in English ("Md. Tanvir Ahmed"). Strict string matching causes 90%+ failure. | **Rule:** Do not match names strictly by string. Authenticate identity strictly via **NID Number + DOB + Biometric Facial Match**. Auto-populate the user's official legal name in Bengali from the verified national database into an uneditable field. |
| **EC-03** | **Under-18 Users & College Students** | 🟠 High | Young students (<18) frequently buy/sell used phones or books but do not possess an NID. | **Hard Rule (MVP):** Under-18 users are strictly restricted to **Guest / Browse-only mode**. Post-ad and chat features require 18+ NID verification without exception. (Phase 2 can evaluate Student ID / Birth Certificate alternatives). |
| **EC-04** | **The "Weaponized Trust Badge" Courier Scam** | 🔴 Critical | A verified seller uses their green NID badge to establish false credibility: *"Look, I have an official NID verified badge, send me 500 BDT courier charge via bKash."* | 1. Automated real-time regex scanner blocks messages containing bKash/Nagad/Rocket account numbers.<br>2. Dynamic warning modal interrupts user: *"Never pay advance courier fees. NID badge confirms identity, NOT product delivery."* |
| **EC-05** | **1 NID Linked to Multiple Phone Numbers** | 🔴 Critical | A user attempts to register 2 SIM cards with the same NID, or a scammer tries to use a family member's NID on a second account. | **Strict 1:1 Enforced:** Database unique constraint on `SHA-256(NID + Salt)`. If a collision is detected: *"This NID is already registered to another account. Please log in with your primary number."* |
| **EC-06** | **Clickbait / Absurd Pricing** | 🟡 Medium | Sellers list iPhone 15 for BDT 1 or BDT 500 to game the "Price: Low to High" filter. | Category-based minimum price floors (e.g., Smartphone min BDT 1,000; Laptop min BDT 3,000; Motorbike min BDT 20,000). |
| **EC-07** | **Shared Household Device with Multiple Accounts** | 🟡 Medium | Two family members share a tablet or phone and attempt to log into separate verified accounts. | System binds biometric face verification to the active session. Maximum 2 distinct accounts permitted on the same hardware Device Fingerprint within a 30-day window. |

---

## 3. Error Handling (সিস্টেম, নেটওয়ার্ক ও ট্রানজ্যাকশন ব্যর্থতা)

| ID | Failure Point | Severity | User-Facing Experience | System Recovery Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **EH-01** | **e-KYC Gateway Downtime (Porichoy / Election Commission 502/504)** | 🔴 Critical | Friendly message: *"Govt Identity Verification Server is currently experiencing high load. Your request has been queued."* | System places verification payload in an asynchronous message queue (RabbitMQ/BullMQ). Automated retry with exponential backoff. User is notified via SMS/Push once verified. |
| **EH-02** | **SMS OTP Gateway Delays / Telco Congestion** | 🟠 High | User is blocked on signup because Bangladeshi telco promotional SMS gateways drop or delay texts. | 60-second countdown timer. If OTP is not received after 60s, activate: **"Receive OTP via Voice Call"** or **"Send via WhatsApp"** fallback. Limit: max 3 attempts/hour. |
| **EH-03** | **Network Drop During Multi-Image Upload (3G/4G Congestion)** | 🟠 High | Uploading 5 high-res photos fails midway; user loses filled form data. | Local draft auto-saved in client storage (IndexedDB). Chunked, resumable file uploads (tus-protocol or S3 multi-part). If disconnected, show "Resume Upload" button without clearing form text. |
| **EH-04** | **WebSocket Chat Disconnection During Live Price Negotiation** | 🟡 Medium | User sends a message in an area with spotty network; message appears lost. | Client-side optimistic UI: Message displays with a "Pending" clock icon. Queued in local IndexedDB and automatically dispatched upon socket heartbeat reconnection. |
| **EH-05** | **Device Camera / Geo-Location Permission Denied** | 🟡 Medium | User denies browser or app permission to take photos or detect current location. | Graceful degradation: Display a step-by-step graphic on how to re-enable camera in OS/browser settings. For location, fallback to manual cascading dropdowns: **Division > District > Thana**. |

---

## 4. Security Requirements (নিরাপত্তা, পিআইআই ও ফ্রড প্রতিরোধ)

| ID | Security Area | Severity | Threat Model | Security Architecture & Engineering Control |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **PII & NID Protection at Rest (Cyber Security Act 2023)** | 🔴 Critical | Database leak exposing citizens' National IDs and biometric photos, resulting in legal liabilities and identity theft. | **Zero Plaintext Storage:**<br>1. NID numbers stored strictly as one-way salted hashes (`SHA-256 + HMAC Server Pepper`) for uniqueness indexing.<br>2. ID card images encrypted using AES-256 KMS in isolated private buckets.<br>3. Media access strictly via signed temporary URLs (TTL $\le$ 60 seconds). |
| **SEC-02** | **NID Forgery & Fake Paper ID Submissions** | 🔴 Critical | Fraudsters upload Photoshopped NID images or printed paper scans of stranger identities. | **Mandatory Active Liveness & Facial Matching:** User must perform an in-app selfie with random micro-actions (blink, turn head left/right). Biometric facial match score must exceed 85% against the official NID photo. |
| **SEC-03** | **Phone Number Scraping & Telemarketing Bots** | 🟠 High | Competitors and spammers crawl classified listings to harvest Bangladeshi phone numbers for telemarketing. | **Dynamic Masking & Rate Limiting:**<br>• Phone numbers never exposed in raw HTML.<br>• Rendered as server-side dynamic SVG/Canvas or unlocked via authenticated API.<br>• Strict rate limit: **Maximum 5 contact reveals per user per day**. |
| **SEC-04** | **Device Fingerprinting Against Banned Scammers** | 🟠 High | A banned scammer buys a new SIM card and tries to use their relative's NID on the same mobile device. | System captures Device UUID, Android/iOS Hardware ID, and Canvas Browser Fingerprint. If a device fingerprint is associated with a banned NID, any new registration on that device is quarantined for manual inspection. |
| **SEC-05** | **API Abuse & Brute-Force Rate Limiting** | 🟠 High | Bots attempt to brute-force 6-digit OTP codes or flood the e-KYC endpoint to exhaust API budget. | • OTP Verification: Max 5 attempts per phone number per 15 minutes.<br>• e-KYC Verification: Max 3 submissions per account per 24 hours.<br>• Cloudflare Web Application Firewall (WAF) with IP reputation rules on all `/api/v1/auth/*` endpoints. |
| **SEC-06** | **Chat Data Preservation for Legal Disputes** | 🟡 Medium | A scammer attempts to delete their abusive messages before the victim can screenshot them for evidence. | Soft-delete only in user view. Messages remain archived in an immutable, encrypted audit database for 90 days, accessible to authorized Trust & Safety officers for police/CID coordination. |

---

## 5. Input Validation Rules (ইনপুট ভ্যালিডেশন স্পেসিফিকেশন)

| Field Name | Type | Regex / Constraint | Validation Rule & Boundary | User Error Message |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Number** | String | `^(?:\+?88)?01[3-9]\d{8}$` | Exactly 11 digits starting with valid Bangladeshi mobile telco prefix (013–019). | *"Please enter a valid 11-digit Bangladeshi mobile number."* |
| **NID Number** | String | `^(?:\d{10}\|\d{13}\|\d{17})$` | Strictly numeric; exact length of 10 digits (Smart Card) or 13/17 digits (Legacy NID). | *"Invalid NID. Must be 10 digits (Smart Card) or 13/17 digits (National ID)."* |
| **Date of Birth** | Date | `DOB <= Today - 18 Years` | User must be at least 18 years old on the date of verification. | *"You must be at least 18 years of age to register on SafeKroy."* |
| **Ad Title** | String | Length: $[10, 80]$ chars | Trim leading/trailing whitespace. Prohibit repetitive punctuation (`!!!!`, `????`). | *"Title must be between 10 and 80 characters."* |
| **Ad Description** | String | Length: $[30, 2000]$ chars | XSS sanitization (strip `<script>`, `<embed>`, `<iframe>`). Minimum 30 meaningful characters. | *"Please provide a detailed description (minimum 30 characters)."* |
| **Price** | Integer | Range: $[50, 50000000]$ | Integer only. Must be greater than category price floor. No negative or zero values. | *"Please enter a valid price in BDT."* |
| **Product Photos** | Files | $1 \le \text{Count} \le 5$, Size $\le 5\text{MB}$ | Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`. Min dimensions: $600 \times 600\text{px}$. | *"Upload 1 to 5 clear photos under 5MB each."* |
| **Location** | Select | Enum ID | Must match valid administrative hierarchy: `Division_ID > District_ID > Thana_ID`. | *"Please select a valid Division, District, and Thana."* |

---

## 6. Permissions & RBAC Matrix (রোল ও পারমিশন কন্ট্রোল)

```
                            User Hierarchy & Privilege Ladder
┌───────────────────────────┬─────────────────────────────────────────────────────────┐
│ Role                      │ Core Privilege Summary                                  │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 1. Guest (Anonymous)      │ Read-only search, public ad discovery.                  │
│ 2. Registered (Unverified)│ Save favorites, manage profile, initiate KYC.           │
│ 3. Verified Citizen (NID) │ Post ads (quota), full C2C chat, reveal phone, review.  │
│ 4. Community Moderator    │ Audit flagged ads/chats, issue warnings, temp suppress. │
│ 5. Super Admin            │ Permanent NID blacklisting, raw audit logs, system keys.│
└───────────────────────────┴─────────────────────────────────────────────────────────┘
```

| Action / Capability | Guest | Registered (Unverified) | Verified Citizen (NID) | Community Moderator | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Search & Browse Ads | ✅ | ✅ | ✅ | ✅ | ✅ |
| Save Ads to Favorites | ❌ | ✅ | ✅ | ✅ | ✅ |
| Post New Ad | ❌ | ❌ | ✅ (2 free/month) | ❌ | ✅ |
| Initiate C2C Chat | ❌ | ❌ | ✅ | ❌ | ✅ (Audit only) |
| Request Phone Number Reveal | ❌ | ❌ | ✅ (Max 5/day) | ❌ | ✅ |
| Edit / Delete Own Ad | ❌ | ❌ | ✅ | ❌ | ✅ |
| Leave Post-Sale Review | ❌ | ❌ | ✅ | ❌ | ❌ |
| Flag / Report Ad or User | ❌ | ✅ | ✅ | ✅ | ✅ |
| Review Flagged Queue | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suppress / Hide Ad | ❌ | ❌ | ❌ | ✅ | ✅ |
| Permanently Blacklist NID | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Raw KYC Audit Logs | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 7. Notification Matrix (নোটিফিকেশন ও রিয়েল-টাইম অ্যালার্ট)

| Trigger Event | Target User | Delivery Channel | Payload / Template Text | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Account Registration** | New User | SMS | `<#> SafeKroy: Your verification code is 482910. Valid for 5 minutes. Do not share with anyone.` | 🔴 Urgent |
| **NID e-KYC Approved** | Verified User | Push & In-App | `🎉 Congratulations! Your NID is verified. Your Verified Citizen badge is now active.` | 🟢 Medium |
| **NID e-KYC Rejected** | User | Push, SMS & In-App | `⚠️ Verification Unsuccessful: Selfie did not match NID photo. Tap here to review and re-submit.` | 🔴 High |
| **New Chat Message** | Seller / Buyer | Push & In-App | `💬 Tanvir sent you a message regarding "Sony Bravia 43 inch TV". Tap to reply.` | 🔴 High |
| **Ad Approved & Live** | Seller | Push & In-App | `✅ Your ad "MacBook Air M1" is now live and visible to buyers in Dhanmondi, Dhaka!` | 🟢 Medium |
| **Ad Expiring (Day 27/30)** | Seller | Push & In-App | `⏳ Your ad expires in 3 days. Did you sell this item? Tap to renew or mark as Sold.` | 🟡 Low |
| **Payment Keyword Detected** | Both Chatters | Real-time In-Chat Banner | `🚨 SAFETY ALERT: Never pay advance money or courier booking fees. Inspect item in person before payment.` | 🔴 Urgent |
| **Account Under Review** | Flagged User | In-App Banner & SMS | `⚠️ Your account has been temporarily restricted due to suspicious reports. Contact Support.` | 🔴 High |

---

## 8. Exceptions & Edge Failures (সিস্টেম ব্যতিক্রম ও রেস কন্ডিশন)

| ID | Exception Event | Root Cause | System Behavior & Mitigation |
| :--- | :--- | :--- | :--- |
| **EX-01** | **Concurrent Chat Initiation on an Ad Being Marked "Sold"** | Buyer clicks "Chat" at the exact millisecond seller marks the item "Sold" from another device. | Database row lock (`SELECT FOR UPDATE`). Buyer receives polite toast: *"This item was just marked as Sold by the seller. New inquiries are closed."* Chat input disabled. |
| **EX-02** | **Duplicate e-KYC Submission Race Condition** | User taps "Submit NID" button multiple times rapidly on a high-latency connection. | Frontend disables button immediately with loading state. Backend acquires a Redis distributed mutex lock: `SET lock:kyc:{user_id} 1 EX 30 NX`. Duplicate calls return HTTP 429. |
| **EX-03** | **Active Chat Session when Scammer is Banned** | Admin triggers permanent NID ban while scammer is actively chatting with an unsuspecting buyer. | Real-time WebSocket event broadcast `FORCE_CHAT_TERMINATION`. Buyer's screen locks immediately with alert: *"⚠️ WARNING: The user you are chatting with has been banned for fraudulent activity. Do NOT send money."* |
| **EX-04** | **Ambiguous e-KYC Gateway Status ("PENDING_MANUAL")** | Porichoy server returns HTTP 200 with status `"PENDING_HUMAN_INSPECTION"` instead of instant Success/Failure. | Status set to `PENDING_REVIEW`. User shown: *"Your verification is undergoing manual review and will complete within 2 hours."* Dispatched to Admin Manual Review Queue. |
| **EX-05** | **Mass-Reported Ad Circuit Breaker** | A malicious seller bypasses automated word filters and posts an offensive or scam ad that is reported by $\ge 3$ users in 10 minutes. | **Circuit Breaker:** When report threshold ($\ge 3$) is reached within 10 minutes, system automatically flips ad to `TEMPORARILY_SUPPRESSED` and pushes it to top of Urgent Moderator Queue. |

---

## 9. Requirement Validation Scorecard & Technical Next Steps

```
                               Requirement Validation Scorecard
┌──────────────────────────────┬────────────┬───────────────────────────────────────┐
│ Dimension                    │ Health     │ Status / Action Item                  │
├──────────────────────────────┼────────────┼───────────────────────────────────────┤
│ 1. Missing Flows             │ 🟢 Audited │ MF-01 to MF-07 specified for backlog  │
│ 2. Edge Cases                │ 🟢 Audited │ EC-01 to EC-07 handled with BD rules  │
│ 3. Error Handling            │ 🟢 Audited │ Async e-KYC queue & OTP fallbacks     │
│ 4. Security Requirements     │ 🟢 Audited │ AES-256 KMS + Salted NID Hash         │
│ 5. Validation Rules          │ 🟢 Audited │ Regex & input boundary limits defined │
│ 6. Permission Matrix (RBAC)  │ 🟢 Audited │ 5-tier role hierarchy mapped          │
│ 7. Notification Triggers     │ 🟢 Audited │ SMS, Push, and In-Chat warnings       │
│ 8. Exceptions & Edge Failure │ 🟢 Audited │ Distributed locks & circuit breakers  │
└──────────────────────────────┴────────────┴───────────────────────────────────────┘
```

**Recommended Technical Next Steps:**
1. Incorporate these validated flows directly into [`PRD.md`](file:///c:/Users/Tarikul/Documents/Amar-Bazar/PRD.md) v1.1.
2. Design the database schema (PostgreSQL) and Redis cache layers adhering to the RBAC and data hashing specifications detailed above.
