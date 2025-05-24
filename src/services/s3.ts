import { S3Client } from '@aws-sdk/client-s3';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BUCKET_NAME } from '@env';
import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { fetch } from 'react-native-fetch-polyfill';

console.log('Environment Variables (raw Config):', {
  AWS_ACCESS_KEY_ID: AWS_ACCESS_KEY_ID ? '[SET]' : undefined,
  AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY ? '[REDACTED]' : undefined,
  AWS_REGION,
  BUCKET_NAME,
});

const accessKeyId: string = AWS_ACCESS_KEY_ID ?? '';
const secretAccessKey: string = AWS_SECRET_ACCESS_KEY ?? '';
const region: string = AWS_REGION || 'ap-south-2';
export const bucketName: string = BUCKET_NAME || 'visys-aiweb.ai4bazaar.com';

const missingVars: string[] = [];
if (!accessKeyId) missingVars.push('AWS_ACCESS_KEY_ID');
if (!secretAccessKey) missingVars.push('AWS_SECRET_ACCESS_KEY');
if (!AWS_REGION) missingVars.push('AWS_REGION');
if (!BUCKET_NAME) missingVars.push('BUCKET_NAME');

if (missingVars.length > 0) {
  throw new Error(`Missing required AWS configuration values in .env file: ${missingVars.join(', ')}`);
}

console.log('Resolved AWS Config:', {
  accessKeyId: accessKeyId ? '[SET]' : undefined,
  secretAccessKey: secretAccessKey ? '[REDACTED]' : undefined,
  region,
  bucketName,
});

// Custom HTTP handler for React Native
class FetchHttpHandler extends HttpHandler {
  async handle(request: HttpRequest): Promise<{ response: HttpResponse }> {
    try {
      console.log('Custom HTTP Handler Request:', {
        method: request.method,
        hostname: request.hostname,
        path: request.path,
        headers: request.headers,
      });

      const url = `https://${request.hostname}${request.path}${request.query ? `?${new URLSearchParams(request.query).toString()}` : ''}`;
      const response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const responseBody = await response.text();
      const httpResponse: HttpResponse = {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };

      console.log('Custom HTTP Handler Response:', {
        statusCode: httpResponse.statusCode,
        headers: httpResponse.headers,
      });

      return { response: httpResponse };
    } catch (error) {
      console.error('Custom HTTP Handler Error:', error.message || error);
      throw new Error(`HTTP Handler Error: ${error.message || 'Unknown error'}`);
    }
  }
}

// Initialize S3 client with custom HTTP handler
export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  httpHandler: new FetchHttpHandler(),
  logger: { trace: (log) => console.log('S3 SDK:', log) },
});