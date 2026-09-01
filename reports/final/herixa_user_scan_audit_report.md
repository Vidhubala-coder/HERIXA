# HERIXA — SCAN COUNTER, AUDIT LOG, USER MANAGEMENT & ADMIN REGISTRATION EMAIL AUDIT REPORT

**Execution Timestamp:** 2026-09-01  
**Project:** HERIXA  
**Final Status:** **PASS (PRODUCTION READY)**

---

## 1. USER DATABASE RESET — FRESH PROJECT STATE

* **Target:** Remove all non-preserved user accounts and reset the database to a clean, fresh state.
* **Preserved Account:** `thangarajvidhubala@gmail.com`
* **Initial User Count:** 8 users (`guest@heritagear.com`, `admin@heritagear.com`, `vidhub657@gmail.com`, `normal_test_user@gmail.com`, `admin_test_user@gmail.com`, `admin_heritage_test@gmail.com`, `user_heritage_test@gmail.com`, `thangarajvidhubala@gmail.com`)
* **Deleted Users:** 7 non-preserved accounts.
* **Final Database User Count:** **EXACTLY 1 USER** (`thangarajvidhubala@gmail.com`, `role: 'user'`, `isEmailVerified: true`, `scanCount: 0`).
* **Preserved User Scan History:** Cleared & reset to 0.

---

## 2. SCAN COUNTER — USER SIDE

* **Implementation:** `UserSchema` updated with `scanCount: { type: Number, default: 0, index: true }` in `backend/src/models/user.ts`.
* **Authoritative Increment:** Implemented in `backend/src/controllers/monumentController.ts` inside `recognizeMonument`.
* **Logic:** Increments `scanCount` by `1` **ONLY** on successful identified recognition scans (`isAccepted === true` and valid monument matched).
* **Failure Safety:** Failed scans (`uncertain`, `unclear`, `low_confidence`, `hard_negatives`) do **NOT** increment the counter.
* **Single Source of Truth:** Counter is driven authoritatively by the MongoDB database.

---

## 3. SCAN HISTORY — TRACEABILITY

* **Traceability:** Every successful scan writes a `History` document linking `userId`, `monumentId`, `actionType: 'recognition'`, `query: monumentName`, and timestamp.
* **Audit Trail:** Logs a `SCAN_PERFORMED` event in the system `AuditLog` collection.

---

## 4. ADMIN REGISTRATION EMAIL NOTIFICATION

* **Implementation:** Added `sendAdminRegistrationNotification` in `backend/src/services/emailService.ts`.
* **Trigger:** Invoked automatically during user registration in `registerUser` (`userController.ts`) when `isNewUser` is `true`.
* **Notification Recipient:** `vidhub657@gmail.com`
* **Content:** Informational email containing registered user Name, Email, and IST Registration Date/Time.
* **Non-Blocking Rule:** Executes asynchronously without blocking user registration or requiring 2FA/login.

---

## 5. USER MANAGEMENT & USER DETAIL VIEW

* **Admin User List:** Displays dynamic user records from MongoDB with `Name`, `Email`, `Role`, `Verification Status`, `Registration Date`, and **`Total Scans`**.
* **User Detail View (`UserDetailsScreen.tsx`):**
  - **USER INFORMATION:** Full Name, Email Address, Role, Email Verification Status, Registration Date, Last Active Timestamp, Total Scans.
  - **SCAN INFORMATION:** Authoritative Total Scans badge and detailed Recent Scans list with recognized monument names, timestamps, and status.
  - **USER AUDIT HISTORY:** Complete user activity and security audit trail.

---

## 6. CSV EXPORT REMOVAL

* **Action:** Completely removed non-working CSV export buttons, handlers, imports, and unused helpers from `UserDetailAdminScreen.tsx`, `AuditLogsScreen.tsx`, `AdminSettingsScreen.tsx`, and `exportCsv.ts`.
* **Preservation:** Audit logging itself remains fully functional and intact.

---

## 7. ZERO REGRESSION & PRESERVATION AUDIT

* **AI Models Preserved:** `herixa_phase3g.onnx`, `phase3l_candidate.onnx`, `best_model_multiclass.pth`, `best_model_phase3l.pth` untouched and intact.
* **AI Recognition Logic Preserved:** Preprocessing, image dimensions, hybrid strategy (`3G Preferred 0.10`), confidence thresholds untouched.
* **Auth & Heritage Map Preserved:** 2FA OTP, forgot password, JWT auth, and interactive Heritage Map functionality remain 100% untouched and functional.

---

## 8. AUTOMATED VERIFICATION RESULTS

1. **E2E Integration Test Suite (`backend/src/utils/test_full_user_scan_flow.ts`):** **`PASSED`**
2. **Backend TypeScript Check (`backend/npx tsc --noEmit`):** **`PASSED (0 Errors)`**
3. **Frontend TypeScript Check (`npx tsc --noEmit`):** **`PASSED (0 Errors)`**

---

### **FINAL VERDICT:** **PASS (PRODUCTION READY)**
