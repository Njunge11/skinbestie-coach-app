/**
 * CloudFront URL utilities
 * Converts S3 keys to CloudFront URLs for content delivery
 */

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

/**
 * Generate CloudFront URL from S3 key
 * Falls back to S3 URL if CloudFront is not configured
 *
 * @param s3Key - The S3 object key (e.g., "photos/users/123/photo.jpg")
 * @param s3Bucket - The S3 bucket name (optional, used for fallback)
 * @returns CloudFront URL or S3 URL
 */
export function getCloudFrontUrl(s3Key: string, s3Bucket?: string): string {
  if (CLOUDFRONT_DOMAIN) {
    // Remove trailing slash if present
    const domain = CLOUDFRONT_DOMAIN.replace(/\/$/, "");
    // Remove leading slash from key if present
    const key = s3Key.replace(/^\//, "");
    return `${domain}/${key}`;
  }

  // Fallback to S3 URL if CloudFront not configured
  if (s3Bucket) {
    return `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`;
  }

  // If no bucket provided, just return the key (shouldn't happen in practice)
  return s3Key;
}
