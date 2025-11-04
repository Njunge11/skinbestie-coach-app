# Environment Variables Reference

Complete list of environment variables needed for this application.

---

## AWS S3 Configuration (Photo Uploads)

Required for photo upload functionality using presigned URLs.

### Required Variables

```bash
# AWS Region where your S3 bucket is located
# Must match the region you selected when creating the bucket
# Example: us-east-1, us-west-2, eu-west-1
AWS_REGION=us-east-1

# IAM User Access Key ID (20 characters, starts with AKIA)
# Generated in IAM → Users → skinbestie-app-backend → Security credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

# IAM User Secret Access Key (40 characters)
# Shown ONLY ONCE when creating access key - save immediately!
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# S3 Bucket name where photos will be stored
# Must match the bucket you created in AWS S3
AWS_S3_BUCKET_NAME=skinbestie-photos
```

### Optional Variables

```bash
# Presigned URL expiration time in seconds
# Default: 60 seconds
# Maximum: 604800 (7 days) with IAM user credentials
AWS_PRESIGNED_URL_EXPIRATION=60

# CloudFront distribution domain for serving images
# If set, images will be served via CloudFront CDN instead of S3 directly
# Example: https://d1234abcd.cloudfront.net
# NOTE: Do NOT include trailing slash
CLOUDFRONT_DOMAIN=https://d1234abcd.cloudfront.net
```

---

## How to Set Up

### Local Development

1. Create `.env.local` file in project root (if it doesn't exist)
2. Add the variables above
3. Restart your development server: `npm run dev`

**Example `.env.local`:**
```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=skinbestie-photos

# Optional
AWS_PRESIGNED_URL_EXPIRATION=60
CLOUDFRONT_DOMAIN=https://d1234abcd.cloudfront.net
```

### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Key: `AWS_REGION`, Value: `us-east-1`
   - Key: `AWS_ACCESS_KEY_ID`, Value: `AKIAIOSFODNN7EXAMPLE`
   - Key: `AWS_SECRET_ACCESS_KEY`, Value: `wJalrXUtnFEMI/K7MDENG...`
   - Key: `AWS_S3_BUCKET_NAME`, Value: `skinbestie-photos`
4. Select environment: Production, Preview, Development (or all)
5. Click **Save**
6. Redeploy your application

---

## Validation

The app will throw errors on startup if required AWS variables are missing:

```
Error: AWS_REGION environment variable is required
Error: AWS_ACCESS_KEY_ID environment variable is required
Error: AWS_SECRET_ACCESS_KEY environment variable is required
```

To verify your setup:

```bash
# Start dev server
npm run dev

# Test presign endpoint (in another terminal)
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

Expected response includes `uploadUrl` with your bucket name and region.

---

## Security Best Practices

✅ **DO:**
- Keep `.env.local` in `.gitignore` (already configured)
- Use different AWS credentials for development vs production
- Rotate access keys every 90 days
- Store production credentials in Vercel (or hosting platform)
- Use password manager for backup of credentials

❌ **DON'T:**
- Commit `.env.local` to git
- Share AWS credentials via Slack/Email/Discord
- Use root AWS account credentials
- Hardcode credentials in source code
- Use the same credentials across all environments

---

## Troubleshooting

### "AWS_REGION environment variable is required"

**Cause:** Missing or misspelled variable name in `.env.local`

**Fix:**
1. Open `.env.local`
2. Ensure variable is named exactly: `AWS_REGION=us-east-1`
3. No spaces around `=`
4. Restart dev server

### "SignatureDoesNotMatch"

**Cause:**
- Incorrect AWS credentials
- Region mismatch between code and bucket

**Fix:**
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
2. Check `AWS_REGION` matches your S3 bucket region exactly
3. Regenerate access keys if unsure

### "The AWS Access Key Id you provided does not exist"

**Cause:** Access key is invalid, deleted, or deactivated

**Fix:**
1. Go to IAM → Users → skinbestie-app-backend → Security credentials
2. Check access key status is "Active"
3. If deleted, create new access key
4. Update `.env.local` with new credentials

### Presigned URL points to wrong region

**Cause:** `AWS_REGION` doesn't match bucket's actual region

**Fix:**
1. Check bucket region in S3 console → Bucket → Properties → AWS Region
2. Update `AWS_REGION` in `.env.local` to match exactly
3. Restart dev server

---

## Legacy Variable Names (Deprecated)

The app supports these for backward compatibility but use new names above:

```bash
# Old name (still works)     # New name (preferred)
AWS_S3_BUCKET              →  AWS_S3_BUCKET_NAME
```

Both work, but `AWS_S3_BUCKET_NAME` is preferred for clarity.

---

## Environment Variable Summary

| Variable | Required | Default | Example | Where to Get |
|----------|----------|---------|---------|--------------|
| `AWS_REGION` | ✅ Yes | - | `us-east-1` | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | ✅ Yes | - | `AKIAIOSFODNN7...` | IAM User access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | - | `wJalrXUtnFEMI...` | IAM User secret key |
| `AWS_S3_BUCKET_NAME` | ✅ Yes | - | `skinbestie-photos` | S3 bucket name |
| `AWS_PRESIGNED_URL_EXPIRATION` | ⬜ No | `60` | `300` | Your choice (seconds) |
| `CLOUDFRONT_DOMAIN` | ⬜ No | - | `https://d123.cloudfront.net` | CloudFront distribution domain |

---

## Related Documentation

- [AWS S3 Setup Guide](./AWS_S3_SETUP.md) - Complete AWS configuration
- [API Documentation](./API_PHOTO_UPLOAD.md) - API endpoints and usage
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
