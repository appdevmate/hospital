import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand,
    DeleteCommand, QueryCommand, ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EXAMINATIONS_TABLE = process.env.EXAMINATIONS_TABLE!;

const ok  = (body: unknown, status = 200): APIGatewayProxyResult => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
});
const err = (msg: string, status = 500): APIGatewayProxyResult => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ message: msg }),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const method = event.httpMethod;
    const path   = event.path;
    const params = event.pathParameters ?? {};
    const query  = event.queryStringParameters ?? {};
    const body   = event.body ? JSON.parse(event.body) : {};
    const examId = params['examId'];

    try {
        // POST /examinations/:examId/signoff
        if (method === 'POST' && path.endsWith('/signoff') && examId) {
            const patientId = query['patientId'] ?? body.patientId;
            if (!patientId) return err('patientId required', 400);
            const now = new Date().toISOString();
            const res = await ddb.send(new UpdateCommand({
                TableName: EXAMINATIONS_TABLE,
                Key: { examId, patientId },
                UpdateExpression: 'SET #s = :s, signedOffAt = :ts, updatedAt = :ts',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':s': 'completed', ':ts': now },
                ConditionExpression: 'attribute_exists(examId)',
                ReturnValues: 'ALL_NEW',
            }));
            return ok(res.Attributes);
        }

        // GET /examinations
        if (method === 'GET' && !examId) {
            const patientId = query['patientId'];
            if (patientId) {
                const res = await ddb.send(new QueryCommand({
                    TableName: EXAMINATIONS_TABLE,
                    IndexName: 'by-patient-index',
                    KeyConditionExpression: 'patientId = :p',
                    ExpressionAttributeValues: { ':p': patientId },
                }));
                return ok(res.Items ?? []);
            }
            const res = await ddb.send(new ScanCommand({ TableName: EXAMINATIONS_TABLE }));
            return ok(res.Items ?? []);
        }

        // POST /examinations
        if (method === 'POST' && !examId) {
            const now  = new Date().toISOString();
            const eid  = randomUUID();
            const item = {
                examId: eid,
                ...body,
                status: 'draft',
                signedOffAt: null,
                createdAt: now,
                updatedAt: null,
            };
            if (!item.patientId) return err('patientId required', 400);
            await ddb.send(new PutCommand({ TableName: EXAMINATIONS_TABLE, Item: item }));
            return ok(item, 201);
        }

        // GET /examinations/:examId
        if (method === 'GET' && examId) {
            const patientId = query['patientId'];
            if (!patientId) return err('patientId query param required', 400);
            const res = await ddb.send(new GetCommand({
                TableName: EXAMINATIONS_TABLE,
                Key: { examId, patientId },
            }));
            if (!res.Item) return err('Examination not found', 404);
            return ok(res.Item);
        }

        // PATCH /examinations/:examId  (section-level update)
        if (method === 'PATCH' && examId) {
            const patientId = query['patientId'] ?? body.patientId;
            if (!patientId) return err('patientId required', 400);
            const now = new Date().toISOString();
            const { examId: _e, patientId: _p, createdAt: _c, ...updates } = body;
            const sets: string[] = ['updatedAt = :ua'];
            const names: Record<string, string> = {};
            const vals:  Record<string, unknown> = { ':ua': now };
            Object.entries(updates).forEach(([k, v], i) => {
                sets.push(`#k${i} = :v${i}`);
                names[`#k${i}`] = k;
                vals[`:v${i}`]  = v;
            });
            const res = await ddb.send(new UpdateCommand({
                TableName: EXAMINATIONS_TABLE,
                Key: { examId, patientId },
                UpdateExpression: `SET ${sets.join(', ')}`,
                ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
                ExpressionAttributeValues: vals,
                ConditionExpression: 'attribute_exists(examId)',
                ReturnValues: 'ALL_NEW',
            }));
            return ok(res.Attributes);
        }

        // DELETE /examinations/:examId
        if (method === 'DELETE' && examId) {
            const patientId = query['patientId'];
            if (!patientId) return err('patientId query param required', 400);
            await ddb.send(new DeleteCommand({
                TableName: EXAMINATIONS_TABLE,
                Key: { examId, patientId },
                ConditionExpression: 'attribute_exists(examId)',
            }));
            return ok({ message: 'Examination deleted' });
        }

        return err('Not found', 404);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ConditionalCheckFailed')) return err('Item not found', 404);
        console.error(e);
        return err(msg);
    }
};
