import { S3Client } from '@aws-sdk/client-s3';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BUCKET_NAME } from '@env';

// Extract or fallback
const accessKeyId: string = AWS_ACCESS_KEY_ID ?? '';
const secretAccessKey: string = AWS_SECRET_ACCESS_KEY ?? '';
export const region: string = AWS_REGION || 'ap-south-1';
export const bucketName: string = BUCKET_NAME || 'visys-aiweb.ai4bazaar.com';

// Validate required vars
const missingVars: string[] = [];
if (!accessKeyId) missingVars.push('AWS_ACCESS_KEY_ID');
if (!secretAccessKey) missingVars.push('AWS_SECRET_ACCESS_KEY');
if (!AWS_REGION) missingVars.push('AWS_REGION');
if (!BUCKET_NAME) missingVars.push('BUCKET_NAME');

if (missingVars.length > 0) {
  throw new Error(`Missing required AWS configuration values in .env file: ${missingVars.join(', ')}`);
}

// ✅ Configure S3 client
export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
    
  },
    forcePathStyle: true,
});
