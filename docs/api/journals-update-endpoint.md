# Journals API - Update Journal Entry

## Endpoint

```
PATCH /api/consumer-app/journals/[id]
```

Updates an existing journal entry for a user.

---

## Authentication

Requires API key authentication via `x-api-key` header.

---

## Request

### Headers

```
Content-Type: application/json
x-api-key: <your-api-key>
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` (UUID) | **Yes** | ID of the journal to update |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userProfileId` | `string` (UUID) | **Yes** | ID of the user (for authorization) |
| `title` | `string` | No | New title for the journal (cannot be empty string) |
| `content` | `object` (Lexical JSON) | No | New content in Lexical editor format |
| `public` | `boolean` | No | Whether the journal is publicly visible |

**Note:** All fields except `userProfileId` are optional. Only include fields you want to update.

---

## Response

### Success Response (200 OK)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Title",
  "content": {
    "root": {
      "children": [
        {
          "children": [
            {
              "detail": 0,
              "format": 0,
              "mode": "normal",
              "style": "",
              "text": "Updated content here",
              "type": "text",
              "version": 1
            }
          ],
          "direction": "ltr",
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1
        }
      ],
      "direction": "ltr",
      "format": "",
      "indent": 0,
      "type": "root",
      "version": 1
    }
  },
  "public": true,
  "createdAt": "2025-11-08T10:30:00.000Z",
  "lastModified": "2025-11-08T11:45:00.000Z"
}
```

**Note:** `lastModified` is automatically updated by the server. `createdAt` remains unchanged.

---

## cURL Examples

### 1. Update Only Title

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My Updated Journal Title"
  }'
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Updated Journal Title",
  "content": {
    "root": {
      "children": [],
      "direction": "ltr",
      "format": "",
      "indent": 0,
      "type": "root",
      "version": 1
    }
  },
  "public": false,
  "createdAt": "2025-11-08T10:30:00.000Z",
  "lastModified": "2025-11-08T11:45:00.000Z"
}
```

---

### 2. Update Only Content

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "content": {
      "root": {
        "children": [
          {
            "children": [
              {
                "detail": 0,
                "format": 0,
                "mode": "normal",
                "style": "",
                "text": "Today I tried a new moisturizer and my skin feels amazing!",
                "type": "text",
                "version": 1
              }
            ],
            "direction": "ltr",
            "format": "",
            "indent": 0,
            "type": "paragraph",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1
      }
    }
  }'
```

---

### 3. Update Multiple Fields

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Week 3 Progress",
    "content": {
      "root": {
        "children": [
          {
            "children": [
              {
                "text": "Amazing results after 3 weeks!",
                "type": "text"
              }
            ],
            "type": "paragraph"
          }
        ],
        "type": "root",
        "version": 1
      }
    },
    "public": true
  }'
```

---

### 4. Update Only Public Flag

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "public": true
  }'
```

---

## Error Responses

### 401 Unauthorized

Missing or invalid API key.

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated"
  }'
```

**Response:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

---

### 400 Bad Request - Missing userProfileId

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "title": "Updated Title"
  }'
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "userProfileId is required"
  }
}
```

---

### 400 Bad Request - Empty Title

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "   "
  }'
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "code": "custom",
        "message": "Title cannot be an empty string",
        "path": ["title"]
      }
    ]
  }
}
```

---

### 400 Bad Request - Invalid Lexical Content

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "content": {
      "invalid": "structure"
    }
  }'
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "code": "custom",
        "message": "Content must be a valid Lexical JSON structure",
        "path": ["content"]
      }
    ]
  }
}
```

---

### 403 Forbidden

User doesn't own the journal.

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "different-user-id",
    "title": "Trying to update someone elses journal"
  }'
```

**Response:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this journal"
  }
}
```

---

### 404 Not Found

Journal doesn't exist.

```bash
curl -X PATCH https://your-domain.com/api/consumer-app/journals/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated"
  }'
```

**Response:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Journal not found"
  }
}
```

---

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Integration Notes

### For Frontend Developers

1. **Partial Updates**: Only send fields you want to update
2. **Authorization**: Must provide `userProfileId` matching the journal owner
3. **Timestamps**: `lastModified` is automatically updated, `createdAt` stays the same
4. **Validation**: Same rules as create - empty titles and invalid Lexical content rejected
5. **Idempotency**: Can update to same values multiple times

### TypeScript Types

```typescript
// Request
interface UpdateJournalRequest {
  userProfileId: string; // Required for authorization
  title?: string; // Optional
  content?: object; // Optional, Lexical JSON
  public?: boolean; // Optional
}

// Response (same as create)
interface JournalResponse {
  id: string;
  userProfileId: string;
  title: string;
  content: object;
  public: boolean;
  createdAt: string; // ISO 8601 - unchanged
  lastModified: string; // ISO 8601 - updated
}
```

### Example: Testing Locally

```bash
curl -X PATCH http://localhost:3000/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Locally",
    "public": true
  }'
```

---

## Key Differences from Create

| Feature | Create | Update |
|---------|--------|--------|
| HTTP Method | POST | PATCH |
| Endpoint | `/journals` | `/journals/[id]` |
| Required Fields | `userProfileId` | `userProfileId` (for auth) |
| Optional Fields | All others | All others |
| Authorization | None | Must own journal |
| Response | New journal | Updated journal |
| `createdAt` | Set to now | Unchanged |
| `lastModified` | Set to now | Updated to now |

---

## Related Endpoints

- [Create Journal](./journals-create-endpoint.md) - POST `/api/consumer-app/journals`
- [Delete Journal](./journals-delete-endpoint.md) - DELETE `/api/consumer-app/journals/[id]`
