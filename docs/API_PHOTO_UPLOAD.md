# Photo Upload API - Integration Guide

Complete API documentation for client integration of photo upload functionality.

## Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication
All requests require an API key in the header:
```
x-api-key: your-api-key-here
```

---

## 1. Upload Photo (2-Step Process)

Photo upload uses a presigned URL approach for direct client-to-S3 uploads.

### Step 1: Request Presigned Upload URL

**Endpoint:** `POST /api/consumer-app/photos/presign`

**Request:**
```bash
curl -X POST http://localhost:3000/api/consumer-app/photos/presign \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "mime": "image/jpeg",
    "extension": "jpg",
    "bytes": 2500000
  }'
```

**Request Body:**
```json
{
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "mime": "image/jpeg",           // "image/jpeg" | "image/png" | "image/heic"
  "extension": "jpg",              // "jpg" | "jpeg" | "png" | "heic"
  "bytes": 2500000                 // File size in bytes (max 10MB = 10485760)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://skinbestie-photos.s3.amazonaws.com/photos/users/550e8400.../photo-id.jpg?signature=...",
    "s3Key": "photos/users/550e8400-e29b-41d4-a716-446655440000/2025-11-04/650e8400-e29b-41d4-a716-446655440001.jpg",
    "photoId": "650e8400-e29b-41d4-a716-446655440001",
    "expiresIn": 60
  }
}
```

**Error Responses:**

*401 Unauthorized:*
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

*400 Bad Request (Invalid MIME type):*
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request body",
    "details": [
      {
        "code": "invalid_enum_value",
        "message": "Unsupported file type. Allowed: JPEG, PNG, HEIC",
        "path": ["mime"]
      }
    ]
  }
}
```

*400 Bad Request (File too large):*
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request body",
    "details": [
      {
        "code": "too_big",
        "message": "File size must not exceed 10MB",
        "path": ["bytes"]
      }
    ]
  }
}
```

---

### Step 2: Upload File to S3

Use the `uploadUrl` from Step 1 to upload the file directly to S3.

**Request:**
```bash
curl -X PUT "https://skinbestie-photos.s3.amazonaws.com/photos/users/...?signature=..." \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

**Important:**
- Use PUT method (not POST)
- Set `Content-Type` header to match the MIME type from Step 1
- Upload the raw file binary data
- No additional headers needed (signature is in the URL)

**Response (200 OK):**
Empty response body from S3 means success.

---

### Step 3: Confirm Upload

After successful S3 upload, confirm the upload to create the database record.

**Endpoint:** `POST /api/consumer-app/photos/confirm`

**Request:**
```bash
curl -X POST http://localhost:3000/api/consumer-app/photos/confirm \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "s3Key": "photos/users/550e8400-e29b-41d4-a716-446655440000/2025-11-04/650e8400-e29b-41d4-a716-446655440001.jpg",
    "s3Bucket": "skinbestie-photos",
    "bytes": 2500000,
    "mime": "image/jpeg",
    "imageUrl": "https://skinbestie-photos.s3.amazonaws.com/photos/users/550e8400.../650e8400...jpg",
    "weekNumber": 1,
    "originalName": "selfie.jpg",
    "width": 1920,
    "height": 1080
  }'
```

**Request Body:**
```json
{
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",  // Required
  "s3Key": "photos/users/.../photo.jpg",                    // Required (from Step 1)
  "s3Bucket": "skinbestie-photos",                          // Required (from Step 1)
  "bytes": 2500000,                                         // Required
  "mime": "image/jpeg",                                     // Required
  "imageUrl": "https://s3.amazonaws.com/.../photo.jpg",     // Required (public URL)
  "weekNumber": 1,                                          // Optional: week of skincare journey
  "originalName": "selfie.jpg",                             // Optional: original filename
  "width": 1920,                                            // Optional: image width in pixels
  "height": 1080                                            // Optional: image height in pixels
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "s3Key": "photos/users/550e8400.../photo.jpg",
    "s3Bucket": "skinbestie-photos",
    "bytes": 2500000,
    "mime": "image/jpeg",
    "imageUrl": "https://skinbestie-photos.s3.amazonaws.com/photos/users/.../photo.jpg",
    "status": "uploaded",
    "weekNumber": 1,
    "originalName": "selfie.jpg",
    "width": 1920,
    "height": 1080,
    "feedback": null,
    "uploadedAt": "2025-11-04T10:30:00.000Z",
    "createdAt": "2025-11-04T10:30:00.000Z",
    "updatedAt": "2025-11-04T10:30:00.000Z"
  }
}
```

---

## 2. List Photos

**Endpoint:** `GET /api/consumer-app/photos`

**Request:**
```bash
# Basic - get all photos for user
curl -X GET "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000" \
  -H "x-api-key: your-api-key-here"

# With pagination
curl -X GET "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&limit=10&offset=0" \
  -H "x-api-key: your-api-key-here"

# Filter by week number
curl -X GET "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&weekNumber=2" \
  -H "x-api-key: your-api-key-here"

# All parameters
curl -X GET "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&limit=20&offset=0&weekNumber=3" \
  -H "x-api-key: your-api-key-here"
```

**Query Parameters:**
- `userProfileId` (required): UUID of the user
- `limit` (optional): Number of photos to return (default: 20)
- `offset` (optional): Number of photos to skip (default: 0)
- `weekNumber` (optional): Filter by specific week number

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
      "s3Key": "photos/users/550e8400.../photo1.jpg",
      "s3Bucket": "skinbestie-photos",
      "bytes": 1000000,
      "mime": "image/jpeg",
      "imageUrl": "https://s3.amazonaws.com/photo1.jpg",
      "status": "uploaded",
      "weekNumber": 1,
      "originalName": "selfie-week1.jpg",
      "width": 1920,
      "height": 1080,
      "feedback": null,
      "uploadedAt": "2025-11-01T10:00:00.000Z",
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-01T10:00:00.000Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440002",
      "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
      "s3Key": "photos/users/550e8400.../photo2.jpg",
      "s3Bucket": "skinbestie-photos",
      "bytes": 2000000,
      "mime": "image/png",
      "imageUrl": "https://s3.amazonaws.com/photo2.jpg",
      "status": "uploaded",
      "weekNumber": 2,
      "originalName": "selfie-week2.png",
      "width": 1080,
      "height": 1920,
      "feedback": "Great progress!",
      "uploadedAt": "2025-11-02T10:00:00.000Z",
      "createdAt": "2025-11-02T10:00:00.000Z",
      "updatedAt": "2025-11-03T14:30:00.000Z"
    }
  ]
}
```

**Empty Result:**
```json
{
  "success": true,
  "data": []
}
```

**Error Responses:**

*400 Bad Request (Missing userProfileId):*
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": [
      {
        "code": "custom",
        "message": "userProfileId is required",
        "path": ["userProfileId"]
      }
    ]
  }
}
```

---

## 3. Delete Photo

**Endpoint:** `DELETE /api/consumer-app/photos/{photoId}`

**Request:**
```bash
curl -X DELETE "http://localhost:3000/api/consumer-app/photos/650e8400-e29b-41d4-a716-446655440001?userProfileId=550e8400-e29b-41d4-a716-446655440000" \
  -H "x-api-key: your-api-key-here"
```

**URL Parameters:**
- `photoId` (path): UUID of the photo to delete

**Query Parameters:**
- `userProfileId` (required): UUID of the user (for authorization)

**Response (204 No Content):**
```json
{
  "success": true
}
```

**Error Responses:**

*404 Not Found:*
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Photo not found"
  }
}
```

*400 Bad Request (Invalid photoId):*
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": [
      {
        "code": "custom",
        "message": "Invalid photo ID",
        "path": ["photoId"]
      }
    ]
  }
}
```

---

## Complete Upload Flow Example

```bash
#!/bin/bash

API_KEY="your-api-key-here"
BASE_URL="http://localhost:3000"
USER_ID="550e8400-e29b-41d4-a716-446655440000"
PHOTO_FILE="selfie.jpg"

# Get file size
FILE_SIZE=$(wc -c < "$PHOTO_FILE")

echo "Step 1: Request presigned URL..."
PRESIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/consumer-app/photos/presign" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"userProfileId\": \"$USER_ID\",
    \"mime\": \"image/jpeg\",
    \"extension\": \"jpg\",
    \"bytes\": $FILE_SIZE
  }")

echo "$PRESIGN_RESPONSE"

# Extract values using jq (or parse manually)
UPLOAD_URL=$(echo "$PRESIGN_RESPONSE" | jq -r '.data.uploadUrl')
S3_KEY=$(echo "$PRESIGN_RESPONSE" | jq -r '.data.s3Key')
PHOTO_ID=$(echo "$PRESIGN_RESPONSE" | jq -r '.data.photoId')

echo "Step 2: Upload to S3..."
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$PHOTO_FILE"

echo "Step 3: Confirm upload..."
curl -X POST "$BASE_URL/api/consumer-app/photos/confirm" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"userProfileId\": \"$USER_ID\",
    \"s3Key\": \"$S3_KEY\",
    \"s3Bucket\": \"skinbestie-photos\",
    \"bytes\": $FILE_SIZE,
    \"mime\": \"image/jpeg\",
    \"imageUrl\": \"https://skinbestie-photos.s3.amazonaws.com/$S3_KEY\",
    \"weekNumber\": 1,
    \"originalName\": \"$PHOTO_FILE\"
  }"

echo "✅ Photo uploaded successfully! ID: $PHOTO_ID"
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `INVALID_REQUEST` | 400 | Invalid request body or parameters |
| `NOT_FOUND` | 404 | Photo not found |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

- Presigned URL expiration: 60 seconds
- Max file size: 10MB (10485760 bytes)
- Supported formats: JPEG, PNG, HEIC

---

## Notes for Frontend Developers

1. **Always validate file size client-side** before requesting presigned URL
2. **Check MIME type** before upload (only jpeg, png, heic supported)
3. **Handle presigned URL expiration** - URLs expire in 60 seconds, request new one if expired
4. **Upload progress tracking** - The S3 PUT request supports progress events
5. **Error handling** - Always check the `success` field in responses
6. **Image optimization** - Consider resizing images client-side before upload to reduce file size
7. **Metadata collection** - Capture width/height/originalName on the client for better UX

## Testing

Use these test UUIDs for development:
- User ID: `550e8400-e29b-41d4-a716-446655440000`
- Photo ID format: `650e8400-e29b-41d4-a716-44665544XXXX`
