# AWS S3 Setup for Photo Uploads - Complete Guide (2024/2025)

Step-by-step guide to configure AWS S3 for presigned URL photo uploads.

---

## Overview

This setup allows:
- ✅ Direct client-to-S3 uploads using presigned URLs
- ✅ Private bucket (photos not publicly accessible)
- ✅ Time-limited upload URLs (60 seconds expiration)
- ✅ Secure access via IAM credentials
- ✅ CORS support for browser uploads

---

## Step 1: Create S3 Bucket (DETAILED - Follow Exactly)

### 1.1 Sign in to AWS Console
1. Open browser and go to: **https://console.aws.amazon.com/s3/**
2. Sign in with your AWS account (use IAM user, not root if possible)
3. You'll see the S3 dashboard with "Buckets" list

### 1.2 Click "Create bucket" Button
- Orange button in top right
- This opens the "Create bucket" wizard

---

### 1.3 General Configuration Section

**Bucket name:**
- Enter: `skinbestie-photos`
- If taken, try: `skinbestie-photos-prod` or `skinbestie-photos-yourcompany`
- ⚠️ Must be globally unique across ALL AWS accounts
- ⚠️ Must be lowercase, no spaces, only hyphens allowed
- **Write this down** - you'll need it later

**AWS Region:**
- Click dropdown and select: **US East (N. Virginia) us-east-1**
- OR choose region closest to your users:
  - `us-east-1` - US East (N. Virginia) - Cheapest, most services
  - `us-west-2` - US West (Oregon)
  - `eu-west-1` - Europe (Ireland)
  - `ap-southeast-1` - Asia Pacific (Singapore)
- ⚠️ **CRITICAL**: Write down the exact region code (e.g., `us-east-1`)
- You'll need this EXACT value for `AWS_REGION` in your `.env.local`

**Copy settings from existing bucket:**
- Leave this BLANK
- Don't copy from another bucket

---

### 1.4 Object Ownership Section

**Object Ownership:**
- Select: **"ACLs disabled (recommended)"** ← This should be selected by DEFAULT
- Description shows: "All objects in this bucket are owned by this account"
- ✅ This is what you want - leave it as is

---

### 1.5 Block Public Access Settings (CRITICAL!)

**Block Public Access settings for this bucket:**

Look for this section - it has a yellow warning box at the top.

**IMPORTANT: Keep ALL 4 checkboxes CHECKED ✅**

Your settings should look like this:

```
☑️ Block all public access
  ☑️ Block public access to buckets and objects granted through new access control lists (ACLs)
  ☑️ Block public access to buckets and objects granted through any access control lists (ACLs)
  ☑️ Block public access to buckets and objects granted through new public bucket or access point policies
  ☑️ Block public access to buckets and objects granted through any public bucket or access point policies
```

**DO NOT UNCHECK ANYTHING!**

Why? Presigned URLs work perfectly with private buckets. The presigned URL contains temporary credentials that bypass the public block. This is the MOST SECURE configuration.

---

### 1.6 Bucket Versioning Section

**Bucket Versioning:**
- Select: **"Disable"** ← For simplicity
- OR select **"Enable"** if you want to keep previous versions of photos (uses more storage, costs more)

**Recommended for production**: Disable (you can enable later if needed)

---

### 1.7 Tags Section (Optional)

**Tags:**
- SKIP THIS - Click "Add tag" is optional
- OR add for organization:
  - Key: `Environment`, Value: `Production`
  - Key: `Application`, Value: `SkinBestie`

---

### 1.8 Default Encryption Section

**Default encryption:**
- **Encryption type**: Select **"Server-side encryption with Amazon S3 managed keys (SSE-S3)"**
- This is the FREE option (recommended)
- ✅ Should say "Enabled" and "SSE-S3"

**DO NOT select:**
- ❌ SSE-KMS (costs extra money, adds complexity)
- ❌ DSSE-KMS (costs even more)

**Bucket Key:**
- Leave as: **Enabled** (this reduces costs for SSE-S3)

---

### 1.9 Advanced Settings Section

**Object Lock:**
- Leave as: **Disable** ← Default
- You don't need this for photo uploads

---

### 1.10 Review and Create

1. Scroll to bottom of page
2. Review your settings:
   - ✅ Bucket name: `skinbestie-photos`
   - ✅ Region: `us-east-1` (or your choice)
   - ✅ ACLs disabled
   - ✅ Block all public access: ON
   - ✅ Versioning: Disabled
   - ✅ Encryption: SSE-S3
3. Click orange **"Create bucket"** button at the bottom

**Success!** You should see:
- Green banner: "Successfully created bucket 'skinbestie-photos'"
- Your bucket appears in the buckets list

---

### 1.11 WRITE DOWN THESE VALUES:

Open a text file and save:

```
BUCKET_NAME=skinbestie-photos
REGION=us-east-1
```

You'll need these exact values later!

---

## Step 2: Configure CORS (Required for Browser Uploads)

### 2.1 Navigate to CORS Settings
1. From S3 buckets list, **click on your bucket name**: `skinbestie-photos`
2. You'll see bucket overview with tabs at top
3. Click the **"Permissions"** tab (second tab from left)
4. Scroll down the page until you see **"Cross-origin resource sharing (CORS)"** section
   - It's below "Block public access" and "Bucket policy"
   - You'll see either "No CORS configuration" or existing JSON
5. Click the **"Edit"** button on the right side of the CORS section

### 2.2 Add CORS Configuration

You'll see a text editor box. **DELETE any existing content** and paste ONE of these configurations:

**For Production:**
```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**For Development (includes localhost):**
```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**For Testing (allow all - NOT for production):**
```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### 2.3 Save CORS Configuration

1. After pasting the JSON, click orange **"Save changes"** button at bottom right
2. You should see green banner: "Successfully edited CORS configuration"
3. The CORS section now shows your JSON configuration

**⚠️ IMPORTANT**: If you get an error, check:
- JSON is valid (no missing commas, brackets)
- All quotes are straight quotes `"` not curly quotes `""`
- No trailing commas after last item in arrays

---

### 2.4 CORS Configuration Explanation

- **AllowedHeaders**: `["*"]` - Allows all headers (necessary for presigned URLs)
- **AllowedMethods**:
  - `PUT` - Required for uploading files via presigned URLs
  - `GET` - Required for downloading/viewing files
  - `HEAD` - Used by browsers for preflight checks
  - `POST` - Optional, for form-based uploads
- **AllowedOrigins**: Your frontend domains (replace with actual domains)
- **ExposeHeaders**:
  - `ETag` - Required for upload verification
  - `x-amz-version-id` - For versioned buckets
- **MaxAgeSeconds**: How long browsers cache the CORS preflight response

---

## Step 3: Create IAM User for Backend Application (DETAILED)

### 3.1 Navigate to IAM Console
1. Open new tab and go to: **https://console.aws.amazon.com/iam/**
2. You'll see IAM Dashboard

### 3.2 Go to Users Section
1. Look at left sidebar
2. Click **"Users"** (under "Access management")
3. You'll see list of existing IAM users (might be empty)

### 3.3 Create New User
1. Click orange **"Create user"** button (top right)
2. This opens "Specify user details" page

---

### 3.4 Step 1: Specify User Details

**User name:**
- Enter: `skinbestie-app-backend`
- ✅ This is just a name, not a login username
- Write this down for later reference

**Provide user access to the AWS Management Console:**
- ⬜ **LEAVE THIS UNCHECKED**
- This user is for API access only, not console login
- The checkbox should say "I want to create an IAM user"
- **DO NOT CHECK IT**

Click orange **"Next"** button at bottom right

---

### 3.5 Step 2: Set Permissions

You're now on "Set permissions" page.

**Permissions options:**
- Select: **"Attach policies directly"** (third option)

**Permissions policies:**
- **DO NOT CHECK ANY POLICIES YET**
- You'll see a search box and list of policies
- **IMPORTANT**: Do NOT select `AmazonS3FullAccess` (too much access)
- We'll create a custom policy in Step 4

**Permissions boundary:**
- Leave as: "Permissions boundary not set"

Click orange **"Next"** button at bottom right

---

### 3.6 Step 3: Review and Create

Review page shows:
- User name: `skinbestie-app-backend`
- AWS Management Console access: Disabled ✅
- Permissions: None (we'll add later)

Click orange **"Create user"** button

**Success!** You should see:
- Green banner: "User skinbestie-app-backend created successfully"
- You're now on the user's summary page

**⚠️ IMPORTANT**: Don't close this tab yet - we need it for Step 6

---

## Step 4: Create Custom IAM Policy (Least Privilege - DETAILED)

### 4.1 Navigate to Policies Section
1. In the IAM console (same tab or open: https://console.aws.amazon.com/iam/)
2. Look at left sidebar
3. Click **"Policies"** (under "Access management")
4. You'll see list of AWS managed and customer managed policies

### 4.2 Create New Policy
1. Click orange **"Create policy"** button (top right)
2. You'll see "Specify permissions" page with two tabs: Visual and JSON

### 4.3 Switch to JSON Editor
1. Click the **"JSON"** tab (top of page, next to "Visual")
2. You'll see a text editor with default JSON

### 4.4 Paste Policy Document

1. **SELECT ALL** the existing JSON in the editor (Ctrl+A / Cmd+A)
2. **DELETE** it all
3. **PASTE** this exact JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedURLGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::skinbestie-photos/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::skinbestie-photos"
    }
  ]
}
```

**⚠️ CRITICAL**: Replace `skinbestie-photos` with YOUR actual bucket name if different!
- Line 11: `"Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"` (note the `/*` at end)
- Line 18: `"Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"` (note NO `/*` at end)

### 4.5 Verify JSON

Click **"Next"** button at bottom right

If you get an error:
- ❌ "Invalid JSON": Check for missing commas, quotes, or brackets
- ❌ "Invalid ARN": Check bucket name is correct (no typos)

---

### 4.6 Review and Name Policy

You're now on "Review and create" page.

**Policy name:**
- Enter: `SkinbestieS3PhotoUploadPolicy`
- ✅ Must be unique in your AWS account
- No spaces allowed (use hyphens or camelCase)

**Description (optional but recommended):**
- Enter: `Minimal permissions for presigned URL photo uploads to skinbestie-photos bucket`

**Tags (optional):**
- Skip this

Scroll down and review the **Permissions summary**:
- Should show:
  - ✅ `s3:PutObject` on `arn:aws:s3:::skinbestie-photos/*`
  - ✅ `s3:GetObject` on `arn:aws:s3:::skinbestie-photos/*`
  - ✅ `s3:DeleteObject` on `arn:aws:s3:::skinbestie-photos/*`
  - ✅ `s3:ListBucket` on `arn:aws:s3:::skinbestie-photos`

Click orange **"Create policy"** button at bottom right

**Success!** You should see:
- Green banner: "SkinbestieS3PhotoUploadPolicy has been created"
- You're redirected to the policies list

---

## Step 5: Attach Policy to User (DETAILED)

### 5.1 Navigate Back to Your User
1. In IAM console left sidebar, click **"Users"**
2. Find and click on: `skinbestie-app-backend`
3. You'll see the user summary page

### 5.2 Add Permissions
1. Click the **"Permissions"** tab (if not already selected)
2. You'll see "Permissions policies" section (currently empty)
3. Click **"Add permissions"** button (blue button with dropdown arrow)
4. Select **"Add permissions"** from dropdown (first option)

### 5.3 Attach Policy
1. You're now on "Add permissions" page
2. Select: **"Attach policies directly"** (third option)
3. In the search box, type: `SkinbestieS3PhotoUploadPolicy`
4. ✅ **Check the box** next to `SkinbestieS3PhotoUploadPolicy`
   - You should see it in the "Customer managed" section
5. Scroll to bottom
6. Click orange **"Add permissions"** button

**Success!** You should see:
- Green banner: "Permissions added successfully"
- Under "Permissions policies" you now see: `SkinbestieS3PhotoUploadPolicy`

---

## Step 6: Generate Access Keys (DETAILED - MOST IMPORTANT!)

### 6.1 Navigate to Security Credentials
1. You should still be on the user page for `skinbestie-app-backend`
2. Click the **"Security credentials"** tab (third tab from left)
3. Scroll down to **"Access keys"** section

### 6.2 Create Access Key
1. Click **"Create access key"** button
2. You'll see "Access key best practices & alternatives" page

### 6.3 Select Use Case
**Select use case:**
- Choose: **"Application running outside AWS"** (third option)
- This is for your Next.js backend server

Click **"Next"** at bottom right

### 6.4 Add Description Tag (Optional)
**Description tag value (optional):**
- Enter: `Backend API for photo uploads - Production`
- This helps you identify the key later

Click **"Create access key"** at bottom right

---

### 6.5 SAVE YOUR CREDENTIALS (CRITICAL!)

**⚠️ THIS IS THE ONLY TIME YOU'LL SEE THE SECRET ACCESS KEY!**

You'll see a page with:
- ✅ Green checkmark: "Access key created"
- **Access key**: `AKIAIOSFODNN7EXAMPLE` (20 characters, starts with `AKIA`)
- **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (40 characters, hidden by default)

**DO THIS NOW:**

1. Click **"Show"** next to "Secret access key" to reveal it
2. Copy both values to a SAFE place:

**Option A: Create/update `.env.local` file immediately:**

```bash
# In your project root, create or edit .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=skinbestie-photos
```

**Option B: Save to password manager:**
- Save both keys in 1Password, LastPass, or similar
- Label: "AWS skinbestie-app-backend credentials"

3. Click **"Download .csv file"** button (backup, store securely)
4. After saving, click **"Done"**

**⚠️ SECURITY WARNINGS:**
- ❌ Never commit `.env.local` to git
- ❌ Never share these keys publicly
- ❌ Never paste in Slack/Discord/Email
- ✅ Add `.env.local` to `.gitignore` (should already be there)
- ✅ Treat like passwords

---

### 6.6 Verify Keys Are Saved

**Before leaving this page**, verify:
1. ✅ `.env.local` file created with all 4 variables
2. ✅ AWS_ACCESS_KEY_ID starts with `AKIA` (20 chars)
3. ✅ AWS_SECRET_ACCESS_KEY is 40 characters long
4. ✅ AWS_REGION matches your bucket region exactly
5. ✅ AWS_S3_BUCKET_NAME matches your bucket name exactly
6. ✅ No spaces or quotes around values in `.env.local`
7. ✅ CSV file downloaded and stored securely

**You're now on the "Security credentials" tab showing:**
- Access keys (1) - with your new key ID listed
- Status: Active ✅

---

## Step 7: Test Your Setup (VERIFICATION)

### 7.1 Restart Your Development Server

```bash
# Stop your Next.js dev server (Ctrl+C)
# Start it again to load new environment variables
npm run dev
```

### 7.2 Test Presign Endpoint

Open a new terminal and run:

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

**Expected Success Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://skinbestie-photos.s3.us-east-1.amazonaws.com/photos/users/550e8400.../photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "s3Key": "photos/users/550e8400-e29b-41d4-a716-446655440000/2025-11-04/650e8400-e29b-41d4-a716-446655440001.jpg",
    "photoId": "650e8400-e29b-41d4-a716-446655440001",
    "expiresIn": 60
  }
}
```

**If you get an error**, check:
- ❌ `UNAUTHORIZED`: Check `x-api-key` header
- ❌ `SignatureDoesNotMatch`: Check AWS credentials in `.env.local`
- ❌ `InvalidAccessKeyId`: Check AWS_ACCESS_KEY_ID is correct
- ❌ `The AWS Access Key Id you provided does not exist`: Verify keys are active in IAM
- ❌ Connection errors: Check `.env.local` has correct values, restart dev server

### 7.3 Test Upload to S3 (Optional)

If presign works, test actual upload:

```bash
# Save the uploadUrl from previous response
UPLOAD_URL="<paste uploadUrl here>"

# Create a small test image (or use existing photo.jpg)
echo "test" > test.jpg

# Upload to S3
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg

# Should return empty response (200 OK = success)
```

### 7.4 Verify in S3 Console (Optional)

1. Go back to S3 console: https://console.aws.amazon.com/s3/
2. Click on `skinbestie-photos` bucket
3. Navigate through folders: `photos/` → `users/` → (user-id) → (date)
4. You should see your uploaded test file

---

## ✅ Setup Complete Checklist

Before moving to production, verify ALL of these:

- [ ] **S3 Bucket Created**
  - [ ] Bucket name: `skinbestie-photos` (or your chosen name)
  - [ ] Region: `us-east-1` (or your chosen region)
  - [ ] Block all public access: **ON** ✅
  - [ ] Encryption: SSE-S3 enabled

- [ ] **CORS Configured**
  - [ ] CORS JSON added to bucket
  - [ ] `AllowedMethods` includes `PUT`, `GET`
  - [ ] `AllowedOrigins` includes your frontend domain(s)
  - [ ] `ExposeHeaders` includes `ETag`

- [ ] **IAM User Created**
  - [ ] User name: `skinbestie-app-backend`
  - [ ] Console access: Disabled
  - [ ] Policy attached: `SkinbestieS3PhotoUploadPolicy`

- [ ] **IAM Policy Created**
  - [ ] Policy name: `SkinbestieS3PhotoUploadPolicy`
  - [ ] Includes: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`
  - [ ] Resource ARN matches your bucket name

- [ ] **Access Keys Generated**
  - [ ] Access key ID saved (starts with `AKIA`)
  - [ ] Secret access key saved (40 characters)
  - [ ] CSV file downloaded and stored securely

- [ ] **Environment Variables Set**
  - [ ] `.env.local` file exists
  - [ ] `AWS_REGION` set correctly
  - [ ] `AWS_ACCESS_KEY_ID` set correctly
  - [ ] `AWS_SECRET_ACCESS_KEY` set correctly
  - [ ] `AWS_S3_BUCKET_NAME` set correctly
  - [ ] `.env.local` in `.gitignore`

- [ ] **Testing Completed**
  - [ ] Dev server restarted after adding env vars
  - [ ] Presign endpoint returns success
  - [ ] Upload URL contains correct bucket name and region
  - [ ] Upload URL expires after 60 seconds ✅

---

**🎉 CONGRATULATIONS!** Your AWS S3 is fully configured for presigned URL photo uploads!

**Next Steps:**
1. Test with real photos from your frontend
2. Monitor S3 costs in AWS Billing dashboard
3. Set up CloudWatch alerts (optional)
4. Document access key location for team
5. Schedule access key rotation (every 90 days recommended)

---

## Quick Reference Card

Save this for quick access:

```
PROJECT: SkinBestie Photo Uploads
BUCKET: skinbestie-photos
REGION: us-east-1
IAM USER: skinbestie-app-backend
POLICY: SkinbestieS3PhotoUploadPolicy

ENV VARS NEEDED:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA... (from Step 6)
AWS_SECRET_ACCESS_KEY=... (from Step 6)
AWS_S3_BUCKET_NAME=skinbestie-photos

ACCESS KEYS LOCATION:
- .env.local (local dev)
- Vercel Environment Variables (production)
- Password Manager: [Your choice]
- Downloaded CSV: [Safe location]
```

**Minimal Policy for Presigned URLs (Copy-Paste Ready):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedURLGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::skinbestie-photos/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::skinbestie-photos"
    }
  ]
}
```

**⚠️ Replace `skinbestie-photos` with your actual bucket name**

### 4.3 Review and Create
1. Click **"Next"**
2. **Policy name**: `SkinbestieS3PhotoUploadPolicy`
3. **Description**: "Minimal permissions for presigned URL photo uploads"
4. Click **"Create policy"**

---

## Step 5: Attach Policy to User

1. Go back to **"Users"** → `skinbestie-app-backend`
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Search for `SkinbestieS3PhotoUploadPolicy`
4. Check the box next to it
5. Click **"Add permissions"**

---

## Step 6: Generate Access Keys

### 6.1 Create Access Key
1. Still in the user page, click **"Security credentials"** tab
2. Scroll to **"Access keys"**
3. Click **"Create access key"**
4. Select use case: **"Application running outside AWS"**
5. Click **"Next"**
6. Add description tag: "Backend API for photo uploads"
7. Click **"Create access key"**

### 6.2 Save Credentials
**⚠️ CRITICAL: Save these immediately - you won't see them again!**

You'll receive:
- **Access key ID**: `AKIAIOSFODNN7EXAMPLE` (example)
- **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (example)

Copy both to your `.env.local` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=skinbestie-photos
```

8. Click **"Done"**

---

## Step 7: Verify Setup

### 7.1 Test with AWS CLI (Optional)

If you have AWS CLI installed:

```bash
# Configure credentials
aws configure

# Test access
aws s3 ls s3://skinbestie-photos/ --region us-east-1

# Should return empty list or existing files (not access denied)
```

### 7.2 Test from Your Application

Run your Next.js app and try the presign endpoint:

```bash
curl -X POST http://localhost:3000/api/consumer-app/photos/presign \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "userProfileId": "550e8400-e29b-41d4-a716-446655440000",
    "mime": "image/jpeg",
    "extension": "jpg",
    "bytes": 2500000
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://skinbestie-photos.s3.us-east-1.amazonaws.com/...",
    "s3Key": "photos/users/.../photo.jpg",
    "photoId": "...",
    "expiresIn": 60
  }
}
```

---

## Step 8: Code Configuration

### 8.1 Update Storage Service

Ensure `src/lib/services/storage.service.ts` has correct configuration:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!, // Must match bucket region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
```

### 8.2 Environment Variables Required

Add to `.env.local`:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=skinbestie-photos

# Optional: Presigned URL expiration (seconds)
AWS_PRESIGNED_URL_EXPIRATION=60
```

---

## Common Issues and Fixes

### Issue 1: CORS Error in Browser

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix:**
1. Verify CORS configuration in S3 bucket (Step 2)
2. Ensure your frontend origin is in `AllowedOrigins`
3. Check that `PUT` method is in `AllowedMethods`
4. Wait a few minutes for CORS changes to propagate

### Issue 2: SignatureDoesNotMatch

**Error:** `The request signature we calculated does not match`

**Fix:**
1. Verify AWS credentials are correct
2. Check that `AWS_REGION` matches bucket region
3. Ensure no extra whitespace in `.env.local` values
4. Regenerate access keys if necessary

### Issue 3: Access Denied

**Error:** `Access Denied` when generating presigned URL

**Fix:**
1. Verify IAM policy is attached to user
2. Check policy has `s3:PutObject` permission
3. Verify bucket name in policy matches actual bucket
4. Ensure bucket ARN uses `/*` for objects: `arn:aws:s3:::bucket-name/*`

### Issue 4: InvalidAccessKeyId

**Error:** `The AWS Access Key Id you provided does not exist`

**Fix:**
1. Verify access key ID is correct (20 characters, starts with `AKIA`)
2. Check for typos in `.env.local`
3. Ensure credentials are active (not deleted/disabled)
4. Regenerate access keys if necessary

### Issue 5: Region Mismatch

**Error:** Presigned URL uses wrong region endpoint

**Fix:**
1. Check `AWS_REGION` in `.env.local` matches bucket region
2. Verify S3Client configuration uses correct region
3. Bucket region shown in S3 console → Properties → AWS Region

### Issue 6: Presigned URL Expired

**Error:** `Request has expired`

**Fix:**
- Presigned URLs expire after 60 seconds (configurable)
- Generate new presigned URL if expired
- Consider increasing expiration time in production (max 7 days with IAM user credentials)

---

## Security Best Practices

### ✅ DO:
- Keep bucket private (Block all public access)
- Use IAM user credentials (not root account)
- Use least privilege IAM policies
- Rotate access keys every 90 days
- Set short expiration times for presigned URLs (60-300 seconds)
- Validate file types and sizes on backend before generating presigned URL
- Use HTTPS only (presigned URLs are HTTPS by default)
- Store AWS credentials in environment variables (never in code)

### ❌ DON'T:
- Don't make bucket public
- Don't use `AmazonS3FullAccess` managed policy
- Don't commit `.env.local` to git
- Don't share access keys
- Don't use root account credentials
- Don't allow unlimited file sizes
- Don't skip CORS configuration

---

## Cost Optimization

### S3 Pricing (as of 2024)
- **Storage**: ~$0.023 per GB/month (Standard tier)
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer OUT**: First 100GB free/month, then $0.09/GB

### Example Costs:
- **10,000 photos** (2MB each = 20GB storage): ~$0.46/month
- **100,000 uploads/month**: ~$0.50/month
- **1,000,000 views/month**: ~$0.40/month

**Total estimate for medium usage**: < $2/month

### Optimization Tips:
1. Enable **S3 Intelligent-Tiering** for automatic cost optimization
2. Set **Lifecycle policies** to move old photos to cheaper storage (Glacier)
3. Enable **CloudFront CDN** for high-traffic apps (reduces GET request costs)

---

## Monitoring and Logging

### Enable S3 Access Logging (Optional)
1. Go to bucket → **Properties** → **Server access logging**
2. Enable logging
3. Choose target bucket for logs
4. Useful for debugging and security audits

### CloudWatch Metrics
AWS automatically tracks:
- Number of requests
- Bytes uploaded/downloaded
- 4xx/5xx errors
- Request latency

Access in CloudWatch → Metrics → S3

---

## Testing Checklist

Before going to production, verify:

- [ ] Bucket created in correct region
- [ ] CORS configured with production domains
- [ ] IAM user created with least privilege policy
- [ ] Access keys generated and stored securely
- [ ] Environment variables configured
- [ ] Test presigned URL generation works
- [ ] Test file upload to S3 succeeds
- [ ] Test file download from S3 succeeds
- [ ] Test file deletion from S3 succeeds
- [ ] CORS works from production domain
- [ ] Error handling works (expired URLs, invalid files)
- [ ] Cost alerts configured in AWS Billing

---

## Production Deployment Notes

### Before Launch:
1. Update CORS to allow only production domains (remove `*` and localhost)
2. Set up CloudWatch alarms for:
   - High request counts (DDoS detection)
   - High error rates
   - Unexpected costs
3. Enable S3 versioning (optional, for file recovery)
4. Configure backup/replication to another region (disaster recovery)
5. Document AWS account access for team
6. Set up billing alerts

### Scaling Considerations:
- S3 automatically scales - no configuration needed
- Consider CloudFront CDN for global users
- Consider Lambda@Edge for image optimization
- Monitor costs as usage grows

---

## Support Resources

- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **Presigned URLs Guide**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- **IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **CORS Configuration**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html
- **AWS SDK for JavaScript v3**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/

---

## Quick Reference

**Bucket Name**: `skinbestie-photos`
**Region**: `us-east-1` (or your chosen region)
**IAM User**: `skinbestie-app-backend`
**IAM Policy**: `SkinbestieS3PhotoUploadPolicy`

**Required Permissions**:
- `s3:PutObject` - Upload files
- `s3:GetObject` - Download files
- `s3:DeleteObject` - Delete files
- `s3:ListBucket` - List files

**Environment Variables**:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=skinbestie-photos
```

---

**Setup complete!** 🎉 Your S3 bucket is ready for presigned URL photo uploads.
