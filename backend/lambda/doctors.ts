import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand,
    DeleteCommand, ScanCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DOCTORS_TABLE         = process.env.DOCTORS_TABLE!;
const DEPARTMENTS_TABLE     = process.env.DEPARTMENTS_TABLE!;
const SPECIALIZATIONS_TABLE = process.env.SPECIALIZATIONS_TABLE!;

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
    const method  = event.httpMethod;
    const path    = event.path;
    const params  = event.pathParameters ?? {};
    const query   = event.queryStringParameters ?? {};
    const body    = event.body ? JSON.parse(event.body) : {};

    try {
        // ── Doctors ────────────────────────────────────────────────────────────

        // POST /doctors/email
        if (method === 'POST' && path.endsWith('/doctors/email')) {
            const { email } = body as { email: string };
            if (!email) return err('email required', 400);
            const res = await ddb.send(new ScanCommand({
                TableName: DOCTORS_TABLE,
                FilterExpression: 'email = :e',
                ExpressionAttributeValues: { ':e': email.toLowerCase().trim() },
                Limit: 1,
            }));
            return ok({ data: res.Items?.[0] ?? null });
        }

        // GET /doctors/filter-options/:field
        if (method === 'GET' && path.includes('/doctors/filter-options/')) {
            const field = params['field'] ?? path.split('/').pop();
            const res = await ddb.send(new ScanCommand({
                TableName: DOCTORS_TABLE,
                ProjectionExpression: '#f',
                ExpressionAttributeNames: { '#f': field! },
            }));
            const values = [...new Set(
                (res.Items ?? []).map((i) => i[field!]).filter(Boolean)
            )].sort();
            return ok(values);
        }

        // GET /doctors
        if (method === 'GET' && path.endsWith('/doctors')) {
            const pageSize = parseInt(query['pageSize'] ?? '25');
            const search   = (query['search'] ?? '').toLowerCase().trim();
            const lastKey  = query['lastKey'] ? JSON.parse(decodeURIComponent(query['lastKey'])) : undefined;

            let filterExp   = '';
            const exprNames: Record<string, string> = {};
            const exprVals:  Record<string, unknown> = {};

            if (search) {
                filterExp = 'contains(#nm, :s) OR contains(email, :s)';
                exprNames['#nm'] = 'name';
                exprVals[':s']   = search;
            }

            const res = await ddb.send(new ScanCommand({
                TableName: DOCTORS_TABLE,
                Limit: pageSize,
                ExclusiveStartKey: lastKey,
                ...(filterExp ? { FilterExpression: filterExp, ExpressionAttributeNames: exprNames, ExpressionAttributeValues: exprVals } : {}),
            }));

            return ok({
                data:       res.Items ?? [],
                lastKey:    res.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(res.LastEvaluatedKey)) : null,
                hasMore:    !!res.LastEvaluatedKey,
                count:      res.Count ?? 0,
                pageSize,
            });
        }

        // GET /doctors/:id
        if (method === 'GET' && params['id']) {
            const res = await ddb.send(new GetCommand({ TableName: DOCTORS_TABLE, Key: { doctorId: params['id'] } }));
            if (!res.Item) return err('Doctor not found', 404);
            return ok({ data: res.Item });
        }

        // POST /doctors
        if (method === 'POST' && path.endsWith('/doctors')) {
            const doctorId  = randomUUID();
            const now       = new Date().toISOString();
            const item      = { ...body, doctorId, createdAt: now, updatedAt: now };
            await ddb.send(new PutCommand({ TableName: DOCTORS_TABLE, Item: item }));
            return ok({ data: item }, 201);
        }

        // PATCH /doctors/:id
        if (method === 'PATCH' && params['id']) {
            const now = new Date().toISOString();
            const { doctorId: _d, createdAt: _c, ...updates } = body;
            const sets: string[] = ['#ua = :ua'];
            const names: Record<string, string> = { '#ua': 'updatedAt' };
            const vals: Record<string, unknown>  = { ':ua': now };

            Object.entries(updates).forEach(([k, v], i) => {
                sets.push(`#k${i} = :v${i}`);
                names[`#k${i}`] = k;
                vals[`:v${i}`]  = v;
            });

            const res = await ddb.send(new UpdateCommand({
                TableName: DOCTORS_TABLE,
                Key: { doctorId: params['id'] },
                UpdateExpression: `SET ${sets.join(', ')}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: vals,
                ConditionExpression: 'attribute_exists(doctorId)',
                ReturnValues: 'ALL_NEW',
            }));
            return ok({ data: res.Attributes });
        }

        // DELETE /doctors/:id
        if (method === 'DELETE' && params['id']) {
            await ddb.send(new DeleteCommand({
                TableName: DOCTORS_TABLE,
                Key: { doctorId: params['id'] },
                ConditionExpression: 'attribute_exists(doctorId)',
            }));
            return ok({ message: 'Doctor deleted' });
        }

        // ── Departments ────────────────────────────────────────────────────────

        if (path.includes('/departments')) {
            // POST /departments/bulk
            if (method === 'POST' && path.endsWith('/bulk')) {
                const items = (body.items ?? body) as Array<{ name: string; code?: string }>;
                const now   = new Date().toISOString();
                const created = await Promise.all(items.map(async (d) => {
                    const item = { departmentId: randomUUID(), ...d, createdAt: now };
                    await ddb.send(new PutCommand({ TableName: DEPARTMENTS_TABLE, Item: item }));
                    return item;
                }));
                return ok({ message: 'Created', count: created.length, items: created }, 201);
            }
            // GET /departments
            if (method === 'GET') {
                const search = (query['search'] ?? '').toLowerCase();
                const limit  = parseInt(query['limit'] ?? '100');
                const res    = await ddb.send(new ScanCommand({ TableName: DEPARTMENTS_TABLE, Limit: limit }));
                const items  = search
                    ? (res.Items ?? []).filter((i) => i['name']?.toLowerCase().includes(search))
                    : res.Items ?? [];
                return ok({ items });
            }
            // POST /departments
            if (method === 'POST') {
                const item = { departmentId: randomUUID(), ...body, createdAt: new Date().toISOString() };
                await ddb.send(new PutCommand({ TableName: DEPARTMENTS_TABLE, Item: item }));
                return ok({ departmentID: item.departmentId, ...item }, 201);
            }
        }

        // ── Specializations ────────────────────────────────────────────────────

        if (path.includes('/specializations')) {
            // POST /specializations/bulk
            if (method === 'POST' && path.endsWith('/bulk')) {
                const items = (body.items ?? body) as Array<{ name: string; code?: string }>;
                const now   = new Date().toISOString();
                const created = await Promise.all(items.map(async (s) => {
                    const item = { specializationId: randomUUID(), ...s, createdAt: now };
                    await ddb.send(new PutCommand({ TableName: SPECIALIZATIONS_TABLE, Item: item }));
                    return item;
                }));
                return ok({ message: 'Created', count: created.length, items: created }, 201);
            }
            // GET /specializations
            if (method === 'GET') {
                const search = (query['search'] ?? '').toLowerCase();
                const limit  = parseInt(query['limit'] ?? '100');
                const res    = await ddb.send(new ScanCommand({ TableName: SPECIALIZATIONS_TABLE, Limit: limit }));
                const items  = search
                    ? (res.Items ?? []).filter((i) => i['name']?.toLowerCase().includes(search))
                    : res.Items ?? [];
                return ok({ items });
            }
            // POST /specializations
            if (method === 'POST') {
                const item = { specializationId: randomUUID(), ...body, createdAt: new Date().toISOString() };
                await ddb.send(new PutCommand({ TableName: SPECIALIZATIONS_TABLE, Item: item }));
                return ok({ specializationID: item.specializationId, ...item }, 201);
            }
        }

        return err('Not found', 404);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ConditionalCheckFailed')) return err('Item not found', 404);
        console.error(e);
        return err(msg);
    }
};
