# Consumer App Authentication API

Quick reference for integrating passwordless authentication endpoints.

## Base URL

```
/api/consumer-app/auth
```

## Authentication

All endpoints require API key authentication via header:

```
x-api-key: YOUR_API_KEY
```

Set `API_KEY` environment variable in your `.env.local`.

---

## Endpoints

### 1. Check User Exists

**GET** `/user-by-email`

Check if user exists and get onboarding status.

**Query Parameters:**
```typescript
email: string  // User email address
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": "2025-01-01T00:00:00Z",
    "name": "John Doe",
    "image": null
  },
  "profile": {
    "id": "uuid",
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01T00:00:00Z",
    "onboardingComplete": true  // true only if both isCompleted and hasCompletedBooking are true
  }
}
```

**Error Responses:**
- `400` - Invalid email format
- `404` - User not found

**Example:**
```bash
curl -X GET "https://yourdomain.com/api/consumer-app/auth/user-by-email?email=user@example.com" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 2. Get User by ID

**GET** `/user/[id]`

Retrieve user details by user ID.

**Path Parameters:**
```typescript
id: string  // User UUID
```

**Success Response (200):**
```json
{
  "user": { /* same as user-by-email */ },
  "profile": { /* same as user-by-email */ }
}
```

**Error Responses:**
- `404` - User not found

**Example:**
```bash
curl -X GET "https://yourdomain.com/api/consumer-app/auth/user/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 3. Create Magic Link Token

**POST** `/create-verification-token`

Generate a magic link token for passwordless login (sent via email).

**Request Body:**
```json
{
  "identifier": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "token": "abc123def456...",  // Plain token to include in email link
  "expires": "2025-01-10T12:15:00Z"  // 15 minutes from creation
}
```

**Error Responses:**
- `400` - Invalid email format or validation failed

**Flow:**
1. Call this endpoint with user's email
2. Send `token` to user via email in a link: `https://yourapp.com/verify?token={token}&email={email}`
3. User clicks link → verify with endpoint #4

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/consumer-app/auth/create-verification-token" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com"}'
```

---

### 4. Verify Magic Link Token

**POST** `/use-verification-token`

Validate and consume a magic link token (one-time use).

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "token": "abc123def456..."
}
```

**Success Response (200):**
```json
{
  "identifier": "user@example.com"
}
```

**Error Responses:**
- `400` - Missing or invalid fields
- `404` - Token invalid, expired, or already used

**Important:** Token is deleted after successful verification (one-time use).

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/consumer-app/auth/use-verification-token" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com", "token": "abc123def456..."}'
```

---

### 5. Create Verification Code

**POST** `/create-verification-code`

Generate a 6-digit numeric code for passwordless login and send via email using Resend.

**Request Body:**
```json
{
  "identifier": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Verification code sent to your email",
  "expires": "2025-01-10T12:15:00Z"  // 15 minutes from creation
}
```

**Error Responses:**
- `400` - Invalid email format

**Flow:**
1. Call this endpoint with user's email
2. **Code is automatically sent via email** (Resend)
3. User enters code from email → verify with endpoint #6

**Important:**
- The actual 6-digit code is **NOT returned** in the response (security)
- The code is sent directly to the user's email
- Email sent using SkinBestie branded template

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/consumer-app/auth/create-verification-code" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com"}'
```

---

### 6. Verify Code

**POST** `/verify-code`

Validate and consume a 6-digit verification code (one-time use).

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "code": "123456"
}
```

**Success Response (200):**
```json
{
  "identifier": "user@example.com"
}
```

**Error Responses:**
- `400` - Invalid email or code format (code must be exactly 6 digits)
- `404` - Code invalid, expired, or already used

**Important:** Code is deleted after successful verification (one-time use).

**Example:**
```bash
curl -X POST "https://yourdomain.com/api/consumer-app/auth/verify-code" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com", "code": "123456"}'
```

---

## Authentication Flows

### Magic Link Flow (Email)

```
1. User enters email
2. Call POST /create-verification-token
3. Send magic link email with token
4. User clicks link
5. Call POST /use-verification-token
6. If valid → user authenticated
```

### Verification Code Flow (Email - Automated)

```
1. User enters email
2. Call POST /create-verification-code
3. ✅ Code automatically sent via email (Resend)
4. User receives email and enters code
5. Call POST /verify-code
6. If valid → user authenticated
```

**Note:** The verification code is automatically sent via email using Resend with a SkinBestie branded template. The code is NOT returned in the API response for security reasons.

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []  // Optional validation details
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - Invalid or missing API key
- `INVALID_REQUEST` - Validation failed or malformed request
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

---

## Notes

- **Token/Code Expiration:** All tokens and codes expire after 15 minutes
- **One-Time Use:** Tokens and codes are deleted after successful verification
- **Case Sensitivity:** Email lookups are case-insensitive
- **Onboarding Status:** User profile returns `onboardingComplete: true` only when both `isCompleted` and `hasCompletedBooking` are true

---

## Testing

All endpoints have comprehensive test coverage (92 tests):
- Repository layer (PGlite integration tests)
- Service layer (unit tests with mocked repository)
- Route layer (unit tests with mocked service)

Run tests:
```bash
npm run test:run -- src/app/api/consumer-app/auth/__tests__
```
