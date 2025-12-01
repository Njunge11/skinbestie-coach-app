# User Profiles API Documentation

## Getting Started

This API allows you to manage user profiles for the SkinBestie Coach application. All endpoints require API key authentication.

**Base URL:**
```
Production: https://your-domain.com/api/user-profiles
Development: http://localhost:3000/api/user-profiles
```

**Authentication:**
- All requests require an API key
- Include the API key in the `x-api-key` header
- Contact the admin to receive your API key

**Quick Start Example:**
```bash
# Check if a user exists
curl -H "x-api-key: YOUR_API_KEY" \
  "https://your-domain.com/api/user-profiles/check?email=user@example.com"
```

---

## API Endpoints

### 1. Create User Profile

**POST** `/api/user-profiles`

Creates a new user profile in the system. Use this when a new user signs up in your application.

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

**Field Descriptions:**
- `firstName` (string, required) - User's first name
- `lastName` (string, required) - User's last name
- `email` (string, required) - Valid email address (must be unique)
- `phoneNumber` (string, required) - Phone number with country code (must be unique)
- `dateOfBirth` (string, required) - Date in YYYY-MM-DD format

**Success Response:** `201 Created`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "skinType": null,
  "concerns": null,
  "hasAllergies": null,
  "allergyDetails": null,
  "isSubscribed": null,
  "hasCompletedBooking": null,
  "completedSteps": [],
  "isCompleted": false,
  "completedAt": null,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

**Error Responses:**

`400 Bad Request` - Validation error
```json
{
  "error": "Invalid email format"
}
```

`409 Conflict` - Email or phone number already registered
```json
{
  "error": "This email is already registered. Please log in or use a different email."
}
```

`401 Unauthorized` - Invalid or missing API key
```json
{
  "error": "Unauthorized - Invalid or missing API key"
}
```

**cURL Example:**
```bash
curl -X POST "https://your-domain.com/api/user-profiles" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'
```

---

### 2. Get User Profile by ID

**GET** `/api/user-profiles/{id}`

Retrieves a specific user profile by their unique ID.

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**URL Parameters:**
- `id` (string, required) - UUID of the user profile

**Success Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "skinType": ["oily", "sensitive"],
  "concerns": ["acne", "pores"],
  "hasAllergies": false,
  "allergyDetails": null,
  "isSubscribed": true,
  "hasCompletedBooking": true,
  "completedSteps": ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS"],
  "isCompleted": true,
  "completedAt": "2025-01-20T10:45:00.000Z",
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:45:00.000Z"
}
```

**Error Responses:**

`404 Not Found`
```json
{
  "error": "Profile not found"
}
```

`401 Unauthorized`
```json
{
  "error": "Unauthorized - Invalid or missing API key"
}
```

**cURL Example:**
```bash
curl "https://your-domain.com/api/user-profiles/123e4567-e89b-12d3-a456-426614174000" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 3. Update User Profile

**PATCH** `/api/user-profiles/{id}`

Updates an existing user profile. Only include fields you want to update.

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

**URL Parameters:**
- `id` (string, required) - UUID of the user profile

**Request Body (all fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "skinType": ["oily", "sensitive"],
  "concerns": ["acne", "dark-spots"],
  "hasAllergies": true,
  "allergyDetails": "Fragrance sensitivity",
  "isSubscribed": true,
  "completedSteps": ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES"]
}
```

**Available Update Fields:**
- `firstName` (string)
- `lastName` (string)
- `skinType` (array of strings) - e.g., ["oily", "dry", "combination", "sensitive", "normal"]
- `concerns` (array of strings) - e.g., ["acne", "wrinkles", "dark-spots", "redness", "pores"]
- `hasAllergies` (boolean)
- `allergyDetails` (string or null)
- `isSubscribed` (boolean)
- `hasCompletedBooking` (boolean)
- `completedSteps` (array of strings) - e.g., ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES", "SUBSCRIBE", "BOOKING"]

**Success Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "skinType": ["oily", "sensitive"],
  "concerns": ["acne", "dark-spots"],
  "hasAllergies": true,
  "allergyDetails": "Fragrance sensitivity",
  "isSubscribed": true,
  "hasCompletedBooking": false,
  "completedSteps": ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES"],
  "isCompleted": false,
  "completedAt": null,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T11:00:00.000Z"
}
```

**Error Responses:**

`400 Bad Request`
```json
{
  "error": "Invalid data"
}
```

`404 Not Found`
```json
{
  "error": "Profile not found"
}
```

**cURL Example:**
```bash
curl -X PATCH "https://your-domain.com/api/user-profiles/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "skinType": ["oily", "sensitive"],
    "concerns": ["acne"]
  }'
```

---

### 4. Get User Profile by Email

**GET** `/api/user-profiles/by-email?email={email}`

Lookup a user profile using their email address. Useful for login flows or duplicate checking.

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Query Parameters:**
- `email` (string, required) - User's email address (URL encoded)

**Success Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  ...
}
```

**Error Responses:**

`400 Bad Request`
```json
{
  "error": "Email parameter is required"
}
```

`404 Not Found`
```json
{
  "error": "Profile not found"
}
```

**cURL Example:**
```bash
curl "https://your-domain.com/api/user-profiles/by-email?email=john%40example.com" \
  -H "x-api-key: YOUR_API_KEY"
```

---

### 5. Check User Profile Exists

**GET** `/api/user-profiles/check?email={email}&phoneNumber={phoneNumber}`

Check if a user profile already exists by email or phone number. Use this before creating new profiles to prevent duplicates.

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Query Parameters:**
- `email` (string, optional) - User's email address
- `phoneNumber` (string, optional) - User's phone number
- **Note:** At least one parameter is required

**Success Response:** `200 OK`

When user exists:
```json
{
  "exists": true,
  "field": "email"
}
```

When user doesn't exist:
```json
{
  "exists": false
}
```

**Field Values:**
- `field` - Indicates which field matched ("email" or "phoneNumber")
- Only present when `exists` is `true`

**Error Responses:**

`400 Bad Request`
```json
{
  "error": "Either email or phoneNumber parameter is required"
}
```

**cURL Examples:**
```bash
# Check by email
curl "https://your-domain.com/api/user-profiles/check?email=john%40example.com" \
  -H "x-api-key: YOUR_API_KEY"

# Check by phone number
curl "https://your-domain.com/api/user-profiles/check?phoneNumber=%2B1234567890" \
  -H "x-api-key: YOUR_API_KEY"

# Check both
curl "https://your-domain.com/api/user-profiles/check?email=john%40example.com&phoneNumber=%2B1234567890" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://your-domain.com/api/user-profiles';

// Helper function for API calls
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// Create a new user profile
async function createUserProfile(userData: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
}) {
  return apiRequest('', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// Check if user exists
async function checkUserExists(email: string) {
  return apiRequest(`/check?email=${encodeURIComponent(email)}`);
}

// Get user by email
async function getUserByEmail(email: string) {
  return apiRequest(`/by-email?email=${encodeURIComponent(email)}`);
}

// Get user by ID
async function getUserById(id: string) {
  return apiRequest(`/${id}`);
}

// Update user profile
async function updateUserProfile(id: string, updates: any) {
  return apiRequest(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// Usage example
async function main() {
  try {
    // Check if user exists before creating
    const exists = await checkUserExists('john@example.com');

    if (exists.exists) {
      console.log('User already exists');
      return;
    }

    // Create new user
    const newUser = await createUserProfile({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
    });

    console.log('User created:', newUser);

    // Update user profile
    const updated = await updateUserProfile(newUser.id, {
      skinType: ['oily', 'sensitive'],
      concerns: ['acne'],
    });

    console.log('User updated:', updated);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Python

```python
import requests
import os

API_KEY = os.environ.get('API_KEY')
BASE_URL = 'https://your-domain.com/api/user-profiles'

def api_request(endpoint, method='GET', data=None):
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }

    url = f"{BASE_URL}{endpoint}"

    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=data)
    elif method == 'PATCH':
        response = requests.patch(url, headers=headers, json=data)

    if not response.ok:
        raise Exception(f"HTTP {response.status_code}: {response.text}")

    return response.json()

def create_user_profile(user_data):
    return api_request('', method='POST', data=user_data)

def check_user_exists(email):
    return api_request(f'/check?email={email}')

def get_user_by_email(email):
    return api_request(f'/by-email?email={email}')

def update_user_profile(user_id, updates):
    return api_request(f'/{user_id}', method='PATCH', data=updates)

# Usage example
try:
    # Check if user exists
    exists = check_user_exists('john@example.com')

    if not exists['exists']:
        # Create new user
        new_user = create_user_profile({
            'firstName': 'John',
            'lastName': 'Doe',
            'email': 'john@example.com',
            'phoneNumber': '+1234567890',
            'dateOfBirth': '1990-01-01'
        })
        print('User created:', new_user)
    else:
        print('User already exists')

except Exception as e:
    print(f'Error: {e}')
```

### PHP

```php
<?php

class UserProfilesAPI {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl) {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }

    private function apiRequest($endpoint, $method = 'GET', $data = null) {
        $ch = curl_init($this->baseUrl . $endpoint);

        $headers = [
            'x-api-key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PATCH') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new Exception($result['error'] ?? "HTTP $httpCode");
        }

        return $result;
    }

    public function createUserProfile($userData) {
        return $this->apiRequest('', 'POST', $userData);
    }

    public function checkUserExists($email) {
        return $this->apiRequest('/check?email=' . urlencode($email));
    }

    public function getUserByEmail($email) {
        return $this->apiRequest('/by-email?email=' . urlencode($email));
    }

    public function updateUserProfile($id, $updates) {
        return $this->apiRequest('/' . $id, 'PATCH', $updates);
    }
}

// Usage
$api = new UserProfilesAPI('YOUR_API_KEY', 'https://your-domain.com/api/user-profiles');

try {
    $exists = $api->checkUserExists('john@example.com');

    if (!$exists['exists']) {
        $newUser = $api->createUserProfile([
            'firstName' => 'John',
            'lastName' => 'Doe',
            'email' => 'john@example.com',
            'phoneNumber' => '+1234567890',
            'dateOfBirth' => '1990-01-01'
        ]);
        echo 'User created: ' . json_encode($newUser);
    }
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
```

---

## Common Workflows

### Workflow 1: User Registration

```
1. Check if user exists
   GET /api/user-profiles/check?email=user@example.com

2. If user doesn't exist, create profile
   POST /api/user-profiles
   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "user@example.com",
     "phoneNumber": "+1234567890",
     "dateOfBirth": "1990-01-01"
   }

3. Store the returned user ID for future updates
```

### Workflow 2: User Login

```
1. Lookup user by email
   GET /api/user-profiles/by-email?email=user@example.com

2. Use the returned profile data to authenticate and personalise the experience
```

### Workflow 3: Multi-Step Profile Completion

```
1. Create initial profile with basic info
   POST /api/user-profiles

2. Update with skin type
   PATCH /api/user-profiles/{id}
   {
     "skinType": ["oily", "sensitive"],
     "completedSteps": ["PERSONAL", "SKIN_TYPE"]
   }

3. Update with concerns
   PATCH /api/user-profiles/{id}
   {
     "concerns": ["acne", "pores"],
     "completedSteps": ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS"]
   }

4. Complete profile
   PATCH /api/user-profiles/{id}
   {
     "hasAllergies": false,
     "isSubscribed": true,
     "hasCompletedBooking": true,
     "completedSteps": ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES", "SUBSCRIBE", "BOOKING"]
   }
```

---

## Error Handling Best Practices

```typescript
async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('Authentication failed - check API key');
    } else if (error.message.includes('404')) {
      console.error('Resource not found');
    } else if (error.message.includes('409')) {
      console.error('Resource already exists');
    } else if (error.message.includes('400')) {
      console.error('Validation error - check request data');
    } else {
      console.error('Unexpected error:', error.message);
    }
    return null;
  }
}

// Usage
const user = await safeApiCall(() => getUserByEmail('john@example.com'));
if (user) {
  console.log('User found:', user);
} else {
  console.log('Failed to fetch user');
}
```

---

## Rate Limiting & Performance

- No rate limits currently enforced
- Recommended: Don't exceed 100 requests per minute per API key
- Use bulk operations when possible (update multiple fields in one PATCH)
- Cache user data on your side to minimize lookups

---

## Security Best Practices

1. **Never expose the API key** in client-side code
2. **Store API key securely** in environment variables or secret management systems
3. **Use HTTPS** for all API calls in production
4. **Rotate API keys** periodically
5. **Monitor API usage** for unusual patterns
6. **Validate data** on your side before sending to API
7. **Handle errors gracefully** without exposing sensitive information to end users

---

## Support & Questions

If you encounter issues or have questions:

1. Check error messages - they provide specific details about what went wrong
2. Verify your API key is correctly set in request headers
3. Ensure request payloads match the documented format
4. Contact the API administrator for assistance

---

## Changelog

**Version 1.0** (January 2025)
- Initial API release
- 5 endpoints for user profile management
- API key authentication
