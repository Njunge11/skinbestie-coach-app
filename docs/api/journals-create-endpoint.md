# Journals API - Create Journal Entry

## Endpoint

```
POST /api/consumer-app/journals
```

Creates a new journal entry for a user.

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

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `userProfileId` | `string` (UUID) | **Yes** | - | ID of the user profile creating the journal |
| `title` | `string` | No | `"Untitled Journal Entry"` | Title of the journal entry (cannot be empty string) |
| `content` | `object` (Lexical JSON) | No | Empty Lexical structure | Journal content in Lexical editor format |
| `public` | `boolean` | No | `false` | Whether the journal is publicly visible |

### Content Format (Lexical JSON)

The `content` field accepts Lexical editor JSON format:

```json
{
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Your journal entry text here",
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
```

**Default empty content:**
```json
{
  "root": {
    "children": [],
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Journal Entry",
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
              "text": "Today was a great day!",
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
  "public": false,
  "createdAt": "2025-11-08T10:30:00.000Z",
  "lastModified": "2025-11-08T10:30:00.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier for the journal entry |
| `userProfileId` | `string` (UUID) | ID of the user who created the journal |
| `title` | `string` | Title of the journal entry |
| `content` | `object` | Journal content in Lexical JSON format |
| `public` | `boolean` | Whether the journal is publicly visible |
| `createdAt` | `string` (ISO 8601) | Timestamp when journal was created |
| `lastModified` | `string` (ISO 8601) | Timestamp when journal was last modified |

---

## cURL Examples

### 1. Minimal Request (All Optional Fields Use Defaults)

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Untitled Journal Entry",
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
  "lastModified": "2025-11-08T10:30:00.000Z"
}
```

---

### 2. Request with Custom Title

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My Skincare Journey - Day 1"
  }'
```

**Response:**
```json
{
  "id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Skincare Journey - Day 1",
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
  "createdAt": "2025-11-08T10:35:00.000Z",
  "lastModified": "2025-11-08T10:35:00.000Z"
}
```

---

### 3. Full Request with All Fields

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Amazing Progress Today!",
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
                "text": "Today I noticed my skin is so much clearer after following my new routine for 2 weeks!",
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
    "public": true
  }'
```

**Response:**
```json
{
  "id": "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f",
  "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Amazing Progress Today!",
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
              "text": "Today I noticed my skin is so much clearer after following my new routine for 2 weeks!",
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
  "createdAt": "2025-11-08T10:40:00.000Z",
  "lastModified": "2025-11-08T10:40:00.000Z"
}
```

---

## Error Responses

### 401 Unauthorized

Missing or invalid API key.

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

### 400 Bad Request - Missing Required Field

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "title": "My Journal"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["userProfileId"],
      "message": "Required"
    }
  ]
}
```

---

### 400 Bad Request - Empty Title

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
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
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "custom",
      "message": "Title cannot be an empty string",
      "path": ["title"]
    }
  ]
}
```

---

### 400 Bad Request - Invalid UUID Format

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "invalid-uuid"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "validation": "uuid",
      "code": "invalid_string",
      "message": "Invalid uuid",
      "path": ["userProfileId"]
    }
  ]
}
```

---

### 400 Bad Request - Invalid Lexical Content

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
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
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "custom",
      "message": "Content must be a valid Lexical JSON structure",
      "path": ["content"]
    }
  ]
}
```

---

### 400 Bad Request - Invalid JSON

```bash
curl -X POST https://your-domain.com/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d 'invalid json'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid JSON in request body"
}
```

---

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

---

## Integration Notes

### For Frontend Developers

1. **Authentication**: Always include the `x-api-key` header with your API key
2. **User Profile ID**: This must be a valid UUID of an existing user profile in the system
3. **Lexical Content**: If using a Lexical editor on the frontend, you can directly pass the editor state JSON as the `content` field
4. **Default Handling**: All fields except `userProfileId` are optional - the system will apply sensible defaults
5. **Timestamps**: Both `createdAt` and `lastModified` are automatically set by the server

### TypeScript Types

```typescript
// Request
interface CreateJournalRequest {
  userProfileId: string; // UUID
  title?: string; // Optional, defaults to "Untitled Journal Entry"
  content?: object; // Optional, Lexical JSON, defaults to empty structure
  public?: boolean; // Optional, defaults to false
}

// Response
interface JournalResponse {
  id: string; // UUID
  userProfileId: string; // UUID
  title: string;
  content: object; // Lexical JSON
  public: boolean;
  createdAt: string; // ISO 8601 timestamp
  lastModified: string; // ISO 8601 timestamp
}
```

### Testing the Endpoint

1. Replace `your-domain.com` with your actual domain (or `localhost:3000` for local testing)
2. Replace `your-api-key-here` with a valid API key
3. Replace the `userProfileId` with a valid user profile UUID from your database

### Example: Testing Locally

```bash
curl -X POST http://localhost:3000/api/consumer-app/journals \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Test Journal",
    "public": false
  }'
```

---

## Database Schema

For reference, the journals table structure:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | Auto-generated | Primary key |
| `user_profile_id` | UUID | No | - | Foreign key to user_profiles (cascade delete) |
| `title` | TEXT | No | "Untitled Journal Entry" | Journal title |
| `content` | JSONB | No | Empty Lexical JSON | Journal content |
| `public` | BOOLEAN | No | false | Public visibility flag |
| `created_at` | TIMESTAMP WITH TIMEZONE | No | NOW() | Creation timestamp |
| `last_modified` | TIMESTAMP WITH TIMEZONE | No | NOW() | Last modification timestamp |

**Indexes:**
- `journals_user_profile_idx` on `user_profile_id`
- `journals_created_at_idx` on `user_profile_id, created_at`
- `journals_last_modified_idx` on `last_modified`
