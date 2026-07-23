# PRD-11: OTP SMS Verification with VintEx

**Product Requirements Document**  
**Version:** 1.0  
**Last Updated:** July 2026  
**Status:** Implemented  

---

## 1. Overview

This PRD covers the OTP delivery work completed for registration, OTP login, and phone-number change verification.

Before this work, the backend generated and stored OTPs, but phone OTP delivery was still a TODO. Users reached the OTP screen during registration but did not receive an SMS. The register verification form also sent the wrong request field to the backend verifier.

The implemented solution integrates VintEx SMS, adds resend support with a 60-second cooldown, and keeps OTP delivery as a backend responsibility.

---

## 2. Goals

- Send registration OTPs to users via SMS.
- Send phone OTP login codes via SMS.
- Send phone-change verification OTPs via SMS.
- Allow users to resend a registration OTP if the first message is delayed or missed.
- Prevent immediate repeated resend taps by enforcing a visible 60-second frontend cooldown.
- Surface SMS provider failures instead of silently claiming delivery succeeded.
- Keep OTP generation, storage, and verification on the backend.

---

## 3. Non-Goals

- No SMS scheduling support.
- No marketing or campaign messaging UI.
- No new OTP database schema.
- No provider dashboard inside Tafuta.
- No frontend direct call to VintEx.

---

## 4. Current User Flow

### 4.1 Registration

1. User submits the register form with name, phone, optional email, and password.
2. Backend creates the user account in an unverified state.
3. Backend generates a 6-digit OTP and stores its SHA-256 hash in `otp_sessions`.
4. Backend sends the OTP via VintEx SMS.
5. Frontend moves the user to the phone verification step.
6. User enters the OTP.
7. Frontend calls `/api/auth/verify-otp` with:

```json
{
  "identifier": "+254712345678",
  "otp": "123456"
}
```

8. Backend verifies the OTP and marks `phone_verified = true`.
9. User is logged in and sent to the dashboard.

### 4.2 Resend OTP

On the register verification screen:

- The resend button is disabled for 60 seconds after the first OTP send.
- Button text shows `Resend OTP in 60s`, counting down to zero.
- After countdown, the user can tap `Resend OTP`.
- Resend calls the existing `/api/auth/request-otp` endpoint with the registered phone as `identifier`.
- On success, the 60-second countdown restarts.
- Existing backend OTP rate limits still apply.

### 4.3 OTP Login

1. User chooses OTP login.
2. User enters phone or email.
3. Backend sends email OTP for email identifiers and VintEx SMS OTP for phone identifiers.
4. User verifies via `/api/auth/verify-otp`.

### 4.4 Phone Number Change

1. Logged-in user requests a phone number change from profile.
2. Backend validates the new phone number and uniqueness.
3. Backend generates and sends an OTP via VintEx SMS.
4. User confirms the phone change with the OTP.

---

## 5. Provider Integration

### 5.1 Provider

VintEx SMS API.

Send endpoint:

```text
POST https://sms.vintextechnologies.com/api/sendMessage?email={account_email}
```

Headers:

```text
Authorization: Bearer {api_key}
Content-Type: application/json
```

Body:

```json
{
  "recipients": "0712345678",
  "senderID": "20642",
  "message": "Your Tafuta verification code is 123456. It expires in 10 minutes. Do not share it with anyone.",
  "campaign_name": "Tafuta OTP"
}
```

### 5.2 Phone Formatting

Tafuta stores phone numbers in international format, for example:

```text
+254712345678
```

VintEx examples use local Kenyan format, for example:

```text
0712345678
```

The SMS service converts `+254...` to `07...` only for the VintEx request body. Stored user identifiers remain unchanged.

### 5.3 Success Criteria

The VintEx response is treated as successful only when:

```json
{
  "status": {
    "code": 2000
  }
}
```

The implementation accepts `2000` as either a number or string.

---

## 6. Configuration

Backend environment variables:

```env
VINTEX_API_KEY=your-real-vintex-api-key
VINTEX_EMAIL=your-vintex-account-email
VINTEX_SENDER_ID=20642
VINTEX_BASE_URL=https://sms.vintextechnologies.com/api
```

`VINTEX_API_KEY` and `VINTEX_EMAIL` are required for real SMS delivery.

Placeholder values beginning with `your-` are treated as not configured and produce an SMS delivery error.

---

## 7. Error Handling

- Missing or placeholder VintEx credentials produce `SMS_NOT_CONFIGURED`.
- VintEx rejection or network failure produces `SMS_DELIVERY_FAILED`.
- Registration still creates the user before SMS is attempted. If initial SMS delivery fails, the response includes `otp_sent: false` so the frontend can keep the user on the verification path rather than forcing a duplicate registration attempt.
- Resend failures are shown in the register OTP screen.
- Production should not pretend SMS was sent when provider delivery failed.

---

## 8. Security and Abuse Controls

- OTPs are generated server-side.
- Plaintext OTPs are never stored; only SHA-256 hashes are stored in `otp_sessions`.
- OTPs expire after 10 minutes.
- Verification limits failed attempts.
- Resend uses the existing `/auth/request-otp` rate limiter.
- Frontend adds a 60-second resend cooldown for user experience and accidental repeat-tap protection.
- Backend remains the enforcement point for rate limiting.
- In development, existing dev/backdoor OTP behavior may still allow easier local testing depending on `NODE_ENV` and `BD_OTP`.

---

## 9. API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Creates user and sends registration OTP |
| `POST` | `/api/auth/request-otp` | Public | Sends login or resend OTP to phone/email |
| `POST` | `/api/auth/verify-otp` | Public | Verifies OTP and logs user in |
| `POST` | `/api/users/me/request-phone-change` | User | Sends OTP to new phone number |
| `POST` | `/api/users/me/confirm-phone-change` | User | Confirms phone change with OTP |

---

## 10. Files Changed

### Backend

- `backend/src/services/smsService.js` — new VintEx SMS service
- `backend/src/config/index.js` — added VintEx email, sender ID, and base URL config
- `backend/src/routes/auth.js` — sends registration and phone-login OTPs via SMS
- `backend/src/routes/users.js` — sends phone-change OTPs via SMS
- `backend/.env.example` — documents VintEx environment variables

### Frontend

- `frontend/src/pages/auth/RegisterPage.jsx`
  - Corrected verify payload from `phone` to `identifier`
  - Added registration OTP resend action
  - Added 60-second resend countdown
  - Added success/error feedback for resend

---

## 11. Migration and Deployment Notes

No new database migration was added for this OTP work.

The implementation depends on the existing `otp_sessions` table from:

```text
backend/src/db/migrations/014_auth_enhancements.sql
```

Production only needs a DB migration for OTP if migration `014_auth_enhancements.sql` has not already been applied. Otherwise, deployment requires code plus environment variable updates only.

Required production configuration:

```env
VINTEX_API_KEY=...
VINTEX_EMAIL=...
VINTEX_SENDER_ID=20642
VINTEX_BASE_URL=https://sms.vintextechnologies.com/api
```

Restart the backend after updating the environment.

---

## 12. QA Checklist

- [ ] Register with a valid Kenyan phone number and confirm SMS OTP is received.
- [ ] Confirm register OTP screen shows `Resend OTP in 60s` immediately after send.
- [ ] Confirm resend button becomes enabled after 60 seconds.
- [ ] Click resend and confirm a new SMS is received.
- [ ] Confirm the resend countdown restarts after resend.
- [ ] Enter the received OTP and confirm login succeeds.
- [ ] Test OTP login by phone and confirm SMS is received.
- [ ] Test OTP login by email and confirm email OTP still works.
- [ ] Test phone-number change and confirm SMS OTP is received.
- [ ] Temporarily remove VintEx credentials in a non-production environment and confirm delivery failure is visible.
- [ ] Confirm backend logs do not expose OTPs in production.

---

## 13. Acceptance Criteria

This work is complete when:

- New registrants receive an SMS OTP.
- Users can resend registration OTPs after 60 seconds.
- Phone OTP login sends SMS successfully.
- Phone-number change sends SMS successfully.
- Registration OTP verification uses `identifier`.
- Missing or invalid SMS configuration does not masquerade as successful delivery.
- No new DB migration is required beyond the existing OTP sessions migration.

---

**End of PRD-11**
