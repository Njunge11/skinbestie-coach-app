import { S3Client } from "@aws-sdk/client-s3";

/**
 * AWS S3 Client Configuration
 *
 * Required environment variables:
 * - AWS_REGION: AWS region where bucket is located (e.g., us-east-1)
 * - AWS_ACCESS_KEY_ID: IAM user access key ID
 * - AWS_SECRET_ACCESS_KEY: IAM user secret access key
 */

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION environment variable is required");
}

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID environment variable is required");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY environment variable is required");
}

/**
 * Singleton S3 Client instance
 * Configured with credentials from environment variables
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
