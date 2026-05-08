import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const userId = pathParameters?.userId;

  try {
    switch (httpMethod) {
      case 'GET':
        return userId ? await getUser(userId) : await listUsers();

      case 'POST': {
        const data = parseBody(body);
        if (!data) return json(400, { message: 'Invalid JSON body' });
        return await createUser(data);
      }

      case 'PUT': {
        if (!userId) return json(400, { message: 'Missing userId' });
        const data = parseBody(body);
        if (!data) return json(400, { message: 'Invalid JSON body' });
        return await updateUser(userId, data);
      }

      case 'DELETE':
        if (!userId) return json(400, { message: 'Missing userId' });
        return await deleteUser(userId);

      default:
        return json(405, { message: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Unhandled error:', err);
    return json(500, { message: 'Internal server error' });
  }
};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function listUsers(): Promise<APIGatewayProxyResult> {
  const { Items = [] } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return json(200, Items);
}

async function getUser(userId: string): Promise<APIGatewayProxyResult> {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { userId } }),
  );
  if (!Item) return json(404, { message: 'User not found' });
  return json(200, Item);
}

async function createUser(data: Record<string, unknown>): Promise<APIGatewayProxyResult> {
  const userId = typeof data.userId === 'string' && data.userId ? data.userId : randomUUID();
  const item = { ...data, userId, createdAt: new Date().toISOString() };
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return json(201, item);
}

async function updateUser(
  userId: string,
  data: Record<string, unknown>,
): Promise<APIGatewayProxyResult> {
  // Strip read-only keys from the update payload
  const { userId: _id, createdAt: _ts, ...fields } = data;
  const entries = Object.entries(fields);
  if (entries.length === 0) return json(400, { message: 'No fields to update' });

  const UpdateExpression = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const ExpressionAttributeNames = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const ExpressionAttributeValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ConditionExpression: 'attribute_exists(userId)',
      ReturnValues: 'ALL_NEW',
    }),
  );
  return json(200, Attributes);
}

async function deleteUser(userId: string): Promise<APIGatewayProxyResult> {
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { userId } }));
  return json(200, { message: 'User deleted', userId });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBody(body: string | null): Record<string, unknown> | null {
  try {
    return body ? (JSON.parse(body) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
