# PRD-12: SMS Provider Switching and Galatext Integration

**Product Requirements Document**  
**Version:** 1.0  
**Last Updated:** July 2026  
**Status:** Implemented  

---

## 1. Overview

This PRD documents the SMS provider update for Tafuta OTP delivery.

Tafuta previously used VintEx as the direct SMS provider for OTP delivery. In July 2026, VintEx appeared to accept SMS requests, but recipients were not reliably receiving OTP messages. To restore OTP delivery without deleting the existing VintEx integration, the backend was updated to support selectable SMS providers and to integrate Galatext through the official JavaScript SDK.

The current production-ready mode is Galatext-only delivery, controlled by environment configuration.

---

## 2. Problem Statement

OTP SMS delivery is part of critical account access and verification flows:

- Registration phone verification
- Phone-number OTP login
- Phone-number change verification

The immediate problem was that VintEx request submission did not guarantee recipient delivery. Users could complete registration or request an OTP but fail to receive the message, blocking login and phone verification.

The business needed a fast, reversible provider switch that:

- Restores OTP delivery through Galatext.
- Keeps the VintEx code available for later reuse.
- Avoids frontend changes.
- Keeps provider credentials out of client-side code.

---

## 3. Goals

- Add Galatext as a backend SMS provider using the official `galatext-api` SDK.
- Use Galatext API-key authentication rather than username/password REST credentials.
- Allow SMS provider selection through environment configuration.
- Default SMS delivery to Galatext.
- Preserve VintEx implementation for future use.
- Keep all existing OTP routes and frontend flows unchanged.
- Keep phone-number formatting provider-specific inside the backend SMS service.

---

## 4. Non-Goals

- No marketing SMS campaign UI.
- No provider dashboard in Tafuta.
- No SMS delivery report webhook handling in this phase.
- No database schema changes.
- No frontend direct calls to Galatext or VintEx.
- No removal of VintEx integration.
- No automated provider health checks.

---

## 5. Current Provider Modes

The backend reads `SMS_PROVIDER` from environment configuration.

Supported values:

| Value | Behavior |
|---|---|
| `galatext` | Send all SMS through Galatext only |
| `vintex` | Send all SMS through VintEx only |
| `vintex_with_galatext_fallback` | Try VintEx first, then Galatext if VintEx throws an error |

Current intended production value:

```env
SMS_PROVIDER=galatext
```

If an unknown provider value is configured, the backend logs a warning and uses Galatext.

---

## 6. Galatext Integration

### 6.1 SDK

Package:

```txt
galatext-api
```

Minimum version:

```txt
1.2.2
```

This version is required because earlier SDK versions sent an API payload shape that the live Galatext API rejected.

### 6.2 Authentication

Galatext uses API-key authentication through the SDK.

Required environment variable:

```env
GALATEXT_API_KEY=your-galatext-api-key
```

The SDK sends the API key to the Galatext API. Tafuta does not store or use Galatext account username/password credentials.

### 6.3 SDK Usage

The backend creates a Galatext client:

```js
const client = new Galatext(apiKey, { baseURL: baseUrl, timeout });
```

Single-recipient send:

```js
await client.sms.send(phoneNumber, message, senderId);
```

Bulk send:

```js
await client.sms.bulk(phoneNumbers, message, senderId);
```

For OTP flows, the backend normally sends one recipient at a time.

---

## 7. Galatext Payload Shape

The live Galatext API expects:

```json
{
  "recipients": ["+254797049127"],
  "message": "Your Tafuta verification code is 123456. It expires in 10 minutes. Do not share it with anyone.",
  "senderId": "GALATEX"
}
```

Important requirements:

- `recipients` must be an array of strings.
- `reference` must not be sent because the live API rejects it.
- Phone numbers are sent in E.164 format, for example `+254797049127`.

### 7.1 SDK v1.2.2 Compatibility Fix

Earlier SDK behavior sent:

```json
{
  "recipients": [{ "phoneNumber": "+254797049127" }],
  "message": "...",
  "senderId": "GALATEX",
  "reference": "Tafuta OTP"
}
```

The live API rejected this with:

```txt
property reference should not exist, each value in recipients must be a string
```

SDK `1.2.2` fixed this mismatch by sending `recipients` as string arrays and removing the `reference` parameter from SMS sends.

---

## 8. Phone Formatting

Tafuta accepts and stores Kenyan phone numbers in international format:

```txt
+254712345678
```

Provider-specific formatting:

| Provider | Request format |
|---|---|
| Galatext | E.164, for example `+254712345678` |
| VintEx | Local Kenyan format, for example `0712345678` |

The backend SMS service owns this formatting so routes and frontend code do not need provider-specific logic.

---

## 9. Configuration

Backend environment variables:

```env
# SMS provider selection
SMS_PROVIDER=galatext

# Galatext SMS
GALATEXT_API_KEY=your-galatext-api-key
GALATEXT_SENDER_ID=GALATEX
GALATEXT_BASE_URL=https://api.galatext.com/api
GALATEXT_TIMEOUT_MS=30000

# VintEx SMS, preserved for future use
VINTEX_API_KEY=your-vintex-api-key
VINTEX_EMAIL=your-vintex-account-email
VINTEX_SENDER_ID=20642
VINTEX_BASE_URL=https://sms.vintextechnologies.com/api
```

Placeholder values beginning with `your-` are treated as unconfigured by the SMS service.

---

## 10. Error Handling

### 10.1 Galatext Not Configured

If `SMS_PROVIDER=galatext` but `GALATEXT_API_KEY` is missing or still a placeholder value, the backend throws:

```txt
SMS_GALATEXT_NOT_CONFIGURED
```

### 10.2 Provider Failure

Galatext SDK errors are logged with:

- Recipient list
- Provider status when available
- Provider error code when available
- Error message

The caller receives an SMS delivery failure error so the API does not falsely claim that SMS delivery succeeded.

### 10.3 Registration Behavior

Registration creates the account before attempting SMS delivery. If SMS sending fails, the backend response can include `otp_sent: false`, allowing the frontend to keep the user on the verification path and offer resend rather than forcing duplicate registration.

---

## 11. Affected User Flows

The following flows use `sendOtpSms()` and therefore follow `SMS_PROVIDER`:

| Flow | Endpoint |
|---|---|
| Registration phone verification | `POST /api/auth/register` |
| OTP login by phone | `POST /api/auth/request-otp` |
| Phone number change request | `POST /api/users/me/request-phone-change` |

Email OTP flows are not affected.

---

## 12. Files Changed

Backend:

- `backend/src/services/smsService.js`
  - Added provider selection
  - Added Galatext SDK integration
  - Preserved VintEx send logic
  - Added provider-specific phone formatting
- `backend/src/config/index.js`
  - Added `sms.provider`
  - Added Galatext configuration
- `backend/package.json`
  - Added `galatext-api` at `^1.2.2`
- `backend/package-lock.json`
  - Locked Galatext SDK dependency
- `backend/.env.example`
  - Documented `SMS_PROVIDER`
  - Documented Galatext environment variables

---

## 13. QA Checklist

### 13.1 Configuration

- Set `SMS_PROVIDER=galatext`.
- Set a real `GALATEXT_API_KEY`.
- Set approved `GALATEXT_SENDER_ID`.
- Restart backend after environment changes.

### 13.2 Registration OTP

1. Register with a valid Kenyan phone number.
2. Confirm backend logs show `SMS sent via Galatext`.
3. Confirm the recipient receives the OTP.
4. Verify OTP successfully.

### 13.3 OTP Login

1. Request OTP login with a phone number.
2. Confirm backend logs show `SMS sent via Galatext`.
3. Confirm the recipient receives the OTP.
4. Verify login.

### 13.4 Phone Change OTP

1. Log in.
2. Request phone number change.
3. Confirm backend logs show `SMS sent via Galatext`.
4. Confirm the new phone number receives the OTP.
5. Confirm phone change.

### 13.5 VintEx Preservation

Temporarily set:

```env
SMS_PROVIDER=vintex
```

Confirm the backend attempts VintEx without code changes.

---

## 14. Rollback / Future Switching

To switch back to VintEx only:

```env
SMS_PROVIDER=vintex
```

To use VintEx primary with Galatext fallback:

```env
SMS_PROVIDER=vintex_with_galatext_fallback
```

To remove Galatext later:

1. Set `SMS_PROVIDER=vintex`.
2. Remove Galatext config from `backend/src/config/index.js`.
3. Remove Galatext send logic from `backend/src/services/smsService.js`.
4. Remove `galatext-api` from backend dependencies.
5. Remove Galatext env vars from `.env.example` and deployment secrets.

---

## 15. Open Follow-Ups

- Add automated tests for provider selection logic.
- Add a delivery-status webhook if Galatext exposes delivery callbacks required by operations.
- Add operational runbook notes for checking Galatext balance and sender ID approval.
- Consider alerting when SMS delivery fails repeatedly.
