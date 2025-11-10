# Journals API - Delete Journal Entry

## Endpoint

```
DELETE /api/consumer-app/journals/[id]
```

Deletes an existing journal entry for a user.

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
| `id` | `string` (UUID) | **Yes** | ID of the journal to delete |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userProfileId` | `string` (UUID) | **Yes** | ID of the user (for authorization) |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Journal deleted successfully"
}
```

**Note:** Unlike create/update, delete does NOT return the journal data.

---

## cURL Examples

### 1. Delete a Journal

```bash
curl -X DELETE https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Journal deleted successfully"
}
```

---

### 2. Testing Locally

```bash
curl -X DELETE http://localhost:3000/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Error Responses

### 401 Unauthorized

Missing or invalid API key.

```bash
curl -X DELETE https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
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
curl -X DELETE https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{}'
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

### 400 Bad Request - Invalid JSON

```bash
curl -X DELETE https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d 'invalid json{'
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid JSON in request body"
  }
}
```

---

### 403 Forbidden

User doesn't own the journal.

```bash
curl -X DELETE https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "different-user-id"
  }'
```

**Response:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to delete this journal"
  }
}
```

---

### 404 Not Found

Journal doesn't exist.

```bash
curl -X DELETE https://your-domain.com/api/consumer-app/journals/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000"
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

1. **Authorization Required**: Must provide `userProfileId` matching the journal owner
2. **Idempotency**: Deleting the same journal twice will return 404 the second time
3. **No Data Returned**: Success response only contains message, not journal data
4. **Permanent Action**: Delete is permanent - no soft delete implemented
5. **Cascade Behavior**: Deleting happens at database level with proper constraints

### TypeScript Types

```typescript
// Request
interface DeleteJournalRequest {
  userProfileId: string; // Required for authorization
}

// Success Response
interface DeleteJournalResponse {
  success: true;
  message: string;
}

// Error Response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

### Verification After Delete

To verify a journal was deleted, try to fetch it (if you implement GET):

```bash
# This should return 404
curl -X GET https://your-domain.com/api/consumer-app/journals/660e8400-e29b-41d4-a716-446655440001 \
  -H "x-api-key: your-api-key-here"
```

---

## Behavior Details

### What Happens When You Delete

1. **Authorization Check**: System verifies the user owns the journal
2. **Database Deletion**: Journal record is permanently removed from database
3. **Response**: Success message returned (no journal data)
4. **Related Data**: Any cascade relationships defined in schema are honored

### Idempotency

Delete is **idempotent** in behavior but not in response:

| Attempt | Result | Status Code |
|---------|--------|-------------|
| First delete | Success | 200 |
| Second delete | Not found | 404 |

### Database Cascade

Based on the schema, deleting a journal will trigger cascade behaviors defined in foreign key relationships.

---

## Key Differences from Create/Update

| Feature | Create | Update | Delete |
|---------|--------|--------|--------|
| HTTP Method | POST | PATCH | DELETE |
| Endpoint | `/journals` | `/journals/[id]` | `/journals/[id]` |
| Required Fields | Multiple | `userProfileId` | `userProfileId` |
| Authorization | None | Must own | Must own |
| Response Data | Journal object | Journal object | Success message only |
| Idempotent | No | Yes | Partial (different status) |

---

## Common Use Cases

### 1. User Deletes Their Own Journal

```bash
curl -X DELETE http://localhost:3000/api/consumer-app/journals/abc-123 \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"userProfileId": "user-123"}'
```

### 2. Clean Up Test Data

```bash
# Delete all test journals (scripted)
for id in journal-1 journal-2 journal-3; do
  curl -X DELETE http://localhost:3000/api/consumer-app/journals/$id \
    -H "Content-Type: application/json" \
    -H "x-api-key: test-key" \
    -d '{"userProfileId": "test-user"}'
done
```

### 3. Admin/Support Deletion

```bash
# Note: Current implementation requires userProfileId
# For admin deletion, you'd need a separate admin endpoint
curl -X DELETE http://localhost:3000/api/consumer-app/journals/abc-123 \
  -H "x-api-key: admin-key" \
  -d '{"userProfileId": "user-who-owns-it"}'
```

---

## Security Considerations

1. **Authorization**: Only journal owner can delete
2. **No Soft Delete**: Deletion is permanent (consider adding soft delete if needed)
3. **Audit Trail**: Consider logging deletions for compliance
4. **Rate Limiting**: Consider rate limiting delete operations
5. **Batch Operations**: No batch delete - must delete one at a time

---

## Related Endpoints

- [Create Journal](./journals-create-endpoint.md) - POST `/api/consumer-app/journals`
- [Update Journal](./journals-update-endpoint.md) - PATCH `/api/consumer-app/journals/[id]`

---

## Future Considerations

### Soft Delete

If you need to implement soft delete (marking as deleted instead of removing):

```typescript
// Add to schema
deletedAt: timestamp("deleted_at");

// Update delete logic
await db.update(journals)
  .set({ deletedAt: new Date() })
  .where(eq(journals.id, id));
```

### Batch Delete

If you need to delete multiple journals:

```typescript
POST /api/consumer-app/journals/batch-delete
{
  "userProfileId": "user-123",
  "journalIds": ["id-1", "id-2", "id-3"]
}
```

### Restore Deleted

If implementing soft delete, add restore endpoint:

```typescript
POST /api/consumer-app/journals/[id]/restore
{
  "userProfileId": "user-123"
}
```
