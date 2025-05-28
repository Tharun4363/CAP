import { S3Client } from '@aws-sdk/client-s3';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BUCKET_NAME } from '@env';
import { HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { fetch } from 'react-native-fetch-polyfill';

// Log environment config for debugging
console.log('Environment Variables (raw Config):', {
  AWS_ACCESS_KEY_ID: AWS_ACCESS_KEY_ID ? '[SET]' : undefined,
  AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY ? '[REDACTED]' : undefined,
  AWS_REGION,
  BUCKET_NAME,
});

// Extract or fallback
const accessKeyId: string = AWS_ACCESS_KEY_ID ?? '';
const secretAccessKey: string = AWS_SECRET_ACCESS_KEY ?? '';
const region: string = AWS_REGION || 'ap-south-1';
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

console.log('Resolved AWS Config:', {
  accessKeyId: '[SET]',
  secretAccessKey: '[REDACTED]',
  region,
  bucketName,
});

// Hermes-safe fetch handler
const fetchHttpHandler = {
  handle: async (request: HttpRequest): Promise<{ response: HttpResponse }> => {
    try {
      const url = `https://${request.hostname}${request.path}${
        request.query ? `?${new URLSearchParams(request.query).toString()}` : ''
      }`;

      const response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const responseBody = await response.arrayBuffer();

      return {
        response: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
        },
      };
    } catch (error: any) {
      console.error('FetchHttpHandler Error:', error);
      throw new Error(`HTTP Handler Error: ${error.message || 'Unknown error'}`);
    }
  },
};

// Export configured S3 client
export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  httpHandler: fetchHttpHandler,
  logger: {
    trace: (msg) => console.log('S3 SDK:', msg),
  },
});
