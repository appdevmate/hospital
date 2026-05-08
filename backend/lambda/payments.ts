import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient, QueryCommand, ScanCommand,
    PutCommand, UpdateCommand, DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE!;

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
    const method     = event.httpMethod;
    const params     = event.pathParameters ?? {};
    const query      = event.queryStringParameters ?? {};
    const body       = event.body ? JSON.parse(event.body) : {};
    const patientId  = params['patientId'];
    const paymentId  = params['paymentId'];
    const path       = event.path;

    try {
        // GET /invoices — all payments, optionally filtered by doctorEmail
        if (path.endsWith('/invoices')) {
            const doctorEmail = query['doctorEmail'];
            let res;
            if (doctorEmail) {
                res = await ddb.send(new ScanCommand({
                    TableName: PAYMENTS_TABLE,
                    FilterExpression: 'doctorEmail = :de',
                    ExpressionAttributeValues: { ':de': doctorEmail.toLowerCase().trim() },
                }));
            } else {
                res = await ddb.send(new ScanCommand({ TableName: PAYMENTS_TABLE }));
            }
            const data = res.Items ?? [];
            return ok({ data, count: data.length, hasMore: false });
        }

        // GET /patients/:patientId/payments
        if (method === 'GET' && patientId && !paymentId) {
            const doctorEmail = query['doctorEmail'];
            let filterExp   = 'patientId = :p';
            const exprVals: Record<string, unknown> = { ':p': patientId };
            if (doctorEmail) {
                filterExp += ' AND doctorEmail = :de';
                exprVals[':de'] = doctorEmail.toLowerCase().trim();
            }
            const res = await ddb.send(new QueryCommand({
                TableName: PAYMENTS_TABLE,
                IndexName: 'by-patient-index',
                KeyConditionExpression: 'patientId = :p',
                ExpressionAttributeValues: exprVals,
            }));
            const data = res.Items ?? [];
            return ok({ data, count: data.length });
        }

        // POST /patients/:patientId/payments
        if (method === 'POST' && patientId && !paymentId) {
            const now  = new Date().toISOString();
            const pid  = randomUUID();
            const item = {
                paymentId: pid,
                patientId,
                ...body,
                createdAt: now,
                updatedAt: now,
            };
            await ddb.send(new PutCommand({ TableName: PAYMENTS_TABLE, Item: item }));
            return ok({ data: item }, 201);
        }

        // PATCH /patients/:patientId/payments/:paymentId
        if (method === 'PATCH' && patientId && paymentId) {
            const now = new Date().toISOString();
            const { paymentId: _p, patientId: _pid, createdAt: _c, ...updates } = body;
            const sets: string[] = ['#ua = :ua'];
            const names: Record<string, string> = { '#ua': 'updatedAt' };
            const vals:  Record<string, unknown> = { ':ua': now };
            Object.entries(updates).forEach(([k, v], i) => {
                sets.push(`#k${i} = :v${i}`);
                names[`#k${i}`] = k;
                vals[`:v${i}`]  = v;
            });
            const res = await ddb.send(new UpdateCommand({
                TableName: PAYMENTS_TABLE,
                Key: { paymentId, patientId },
                UpdateExpression: `SET ${sets.join(', ')}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: vals,
                ConditionExpression: 'attribute_exists(paymentId)',
                ReturnValues: 'ALL_NEW',
            }));
            return ok({ updatedData: res.Attributes });
        }

        // DELETE /patients/:patientId/payments/:paymentId
        if (method === 'DELETE' && patientId && paymentId) {
            await ddb.send(new DeleteCommand({
                TableName: PAYMENTS_TABLE,
                Key: { paymentId, patientId },
                ConditionExpression: 'attribute_exists(paymentId)',
            }));
            return ok({ message: 'Payment deleted' });
        }

        return err('Not found', 404);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ConditionalCheckFailed')) return err('Item not found', 404);
        console.error(e);
        return err(msg);
    }
};
