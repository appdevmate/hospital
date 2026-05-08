import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME!;
const PK_NAME    = process.env.PK_NAME!;
const SK_NAME    = process.env.SK_NAME  ?? '';
const GSI_NAME   = process.env.GSI_NAME ?? '';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS,
  body: JSON.stringify(body),
});

const fail = (statusCode: number, message: string) => json(statusCode, { message });

// ── Entry point ───────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, queryStringParameters, body } = event;
  const id      = pathParameters?.id ?? '';
  const qs      = (queryStringParameters ?? {}) as Record<string, string | null>;
  const skValue = (SK_NAME && qs[SK_NAME]) ? qs[SK_NAME]! : '';

  try {
    switch (httpMethod) {
      case 'GET':
        return id ? await getById(id, skValue) : await list(qs);

      case 'POST': {
        const data = parseBody(body);
        if (!data) return fail(400, 'Invalid JSON body');
        return await create(data);
      }

      case 'PUT': {
        if (!id) return fail(400, 'Missing id in path');
        const data = parseBody(body);
        if (!data) return fail(400, 'Invalid JSON body');
        return await update(id, skValue, data);
      }

      case 'DELETE':
        if (!id) return fail(400, 'Missing id in path');
        return await remove(id, skValue);

      default:
        return fail(405, 'Method not allowed');
    }
  } catch (err) {
    console.error('Unhandled error:', err);
    return fail(500, 'Internal server error');
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function key(pkValue: string, skValue: string): Record<string, string> {
  const k: Record<string, string> = { [PK_NAME]: pkValue };
  if (SK_NAME && skValue) k[SK_NAME] = skValue;
  return k;
}

function parseBody(raw: string | null): Record<string, unknown> | null {
  try { return raw ? (JSON.parse(raw) as Record<string, unknown>) : null; }
  catch { return null; }
}

function stripProtected(data: Record<string, unknown>): Record<string, unknown> {
  const drop = new Set([PK_NAME, SK_NAME, 'createdAt'].filter(Boolean));
  return Object.fromEntries(Object.entries(data).filter(([k]) => !drop.has(k)));
}

// ── Operations ────────────────────────────────────────────────────────────────

async function list(qs: Record<string, string | null>): Promise<APIGatewayProxyResult> {
  const skFilter = SK_NAME && qs[SK_NAME] ? (qs[SK_NAME] as string) : '';

  if (skFilter && GSI_NAME) {
    const { Items = [] } = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: '#sk = :v',
      ExpressionAttributeNames: { '#sk': SK_NAME },
      ExpressionAttributeValues: { ':v': skFilter },
    }));
    return json(200, Items);
  }

  const { Items = [] } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return json(200, Items);
}

async function getById(pkValue: string, skValue: string): Promise<APIGatewayProxyResult> {
  if (SK_NAME && !skValue) {
    return fail(400, `Query parameter '${SK_NAME}' is required for this resource`);
  }

  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: key(pkValue, skValue),
  }));

  return Item ? json(200, Item) : fail(404, 'Not found');
}

async function create(data: Record<string, unknown>): Promise<APIGatewayProxyResult> {
  const pkValue = (typeof data[PK_NAME] === 'string' && data[PK_NAME]) ? data[PK_NAME] as string : randomUUID();
  const skValue = SK_NAME ? (data[SK_NAME] as string | undefined) ?? '' : '';

  if (SK_NAME && !skValue) {
    return fail(400, `Field '${SK_NAME}' is required`);
  }

  const now = new Date().toISOString();
  const item: Record<string, unknown> = {
    ...data,
    [PK_NAME]: pkValue,
    createdAt: now,
    updatedAt: now,
  };
  if (SK_NAME && skValue) item[SK_NAME] = skValue;

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return json(201, item);
}

async function update(pkValue: string, skValue: string, data: Record<string, unknown>): Promise<APIGatewayProxyResult> {
  if (SK_NAME && !skValue) {
    return fail(400, `Query parameter '${SK_NAME}' is required for this resource`);
  }

  const fields = stripProtected(data);
  const entries = Object.entries({ ...fields, updatedAt: new Date().toISOString() });
  if (entries.length === 0) return fail(400, 'No updatable fields provided');

  const UpdateExpression        = 'SET ' + entries.map((_, i) => `#f${i} = :v${i}`).join(', ');
  const ExpressionAttributeNames  = { '#pk': PK_NAME, ...Object.fromEntries(entries.map(([k], i) => [`#f${i}`, k])) };
  const ExpressionAttributeValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: key(pkValue, skValue),
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ConditionExpression: 'attribute_exists(#pk)',
    ReturnValues: 'ALL_NEW',
  }));

  return json(200, Attributes);
}

async function remove(pkValue: string, skValue: string): Promise<APIGatewayProxyResult> {
  if (SK_NAME && !skValue) {
    return fail(400, `Query parameter '${SK_NAME}' is required for this resource`);
  }

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: key(pkValue, skValue),
  }));

  return json(200, { message: 'Deleted', [PK_NAME]: pkValue });
}
