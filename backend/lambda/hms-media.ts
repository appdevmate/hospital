import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const s3     = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
const TTL    = 3600; // presigned URL expiry in seconds

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const json = (status: number, body: unknown): APIGatewayProxyResult => ({
  statusCode: status,
  headers: CORS,
  body: JSON.stringify(body),
});

// POST /media/upload-url   { key: string, contentType: string }  → presigned PUT URL
// GET  /media/download-url?key={key}                             → presigned GET URL

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'POST') {
      const body = event.body ? (JSON.parse(event.body) as { key?: string; contentType?: string }) : {};
      const { key, contentType } = body;

      if (!key || !contentType) return json(400, { message: "'key' and 'contentType' are required" });

      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: TTL },
      );
      return json(200, { url, key, expiresIn: TTL });
    }

    if (event.httpMethod === 'GET') {
      const key = event.queryStringParameters?.key;
      if (!key) return json(400, { message: "'key' query parameter is required" });

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: TTL },
      );
      return json(200, { url, key, expiresIn: TTL });
    }

    return json(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error('Media handler error:', err);
    return json(500, { message: 'Internal server error' });
  }
};
