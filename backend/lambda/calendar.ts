import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient, ScanCommand, PutCommand,
    UpdateCommand, DeleteCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CALENDARS_TABLE    = process.env.CALENDARS_TABLE!;
const EVENTS_TABLE       = process.env.EVENTS_TABLE!;
const APPOINTMENTS_TABLE = process.env.APPOINTMENTS_TABLE!;

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
    const path       = event.path;
    const params     = event.pathParameters ?? {};
    const query      = event.queryStringParameters ?? {};
    const body       = event.body ? JSON.parse(event.body) : {};
    const calendarId = params['calendarId'];
    const eventId    = params['eventId'];
    const apptId     = params['appointmentId'];

    try {
        // ── Appointments ───────────────────────────────────────────────────────

        if (path.includes('/appointments')) {
            // GET /appointments?doctorEmail=xxx
            if (method === 'GET' && !apptId) {
                const doctorEmail = query['doctorEmail'];
                if (doctorEmail) {
                    const res = await ddb.send(new QueryCommand({
                        TableName: APPOINTMENTS_TABLE,
                        IndexName: 'by-doctor-index',
                        KeyConditionExpression: 'doctorEmail = :de',
                        ExpressionAttributeValues: { ':de': doctorEmail.toLowerCase().trim() },
                    }));
                    return ok(res.Items ?? []);
                }
                const res = await ddb.send(new ScanCommand({ TableName: APPOINTMENTS_TABLE }));
                return ok(res.Items ?? []);
            }
            // POST /appointments
            if (method === 'POST' && !apptId) {
                const item = { appointmentId: randomUUID(), ...body, createdAt: new Date().toISOString() };
                await ddb.send(new PutCommand({ TableName: APPOINTMENTS_TABLE, Item: item }));
                return ok(item, 201);
            }
            // PATCH /appointments/:appointmentId
            if (method === 'PATCH' && apptId) {
                const { appointmentId: _a, createdAt: _c, ...updates } = body;
                const sets: string[] = ['updatedAt = :ua'];
                const names: Record<string, string> = {};
                const vals:  Record<string, unknown> = { ':ua': new Date().toISOString() };
                Object.entries(updates).forEach(([k, v], i) => {
                    sets.push(`#k${i} = :v${i}`);
                    names[`#k${i}`] = k;
                    vals[`:v${i}`]  = v;
                });
                const res = await ddb.send(new UpdateCommand({
                    TableName: APPOINTMENTS_TABLE,
                    Key: { appointmentId: apptId },
                    UpdateExpression: `SET ${sets.join(', ')}`,
                    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
                    ExpressionAttributeValues: vals,
                    ConditionExpression: 'attribute_exists(appointmentId)',
                    ReturnValues: 'ALL_NEW',
                }));
                return ok(res.Attributes);
            }
            // DELETE /appointments/:appointmentId
            if (method === 'DELETE' && apptId) {
                await ddb.send(new DeleteCommand({
                    TableName: APPOINTMENTS_TABLE,
                    Key: { appointmentId: apptId },
                    ConditionExpression: 'attribute_exists(appointmentId)',
                }));
                return ok({ message: 'Appointment deleted' });
            }
        }

        // ── Calendar Events ────────────────────────────────────────────────────

        if (calendarId && path.includes('/events')) {
            // GET /calendars/:calendarId/events
            if (method === 'GET' && !eventId) {
                const res = await ddb.send(new QueryCommand({
                    TableName: EVENTS_TABLE,
                    IndexName: 'by-calendar-index',
                    KeyConditionExpression: 'calendarId = :c',
                    ExpressionAttributeValues: { ':c': calendarId },
                }));
                return ok(res.Items ?? []);
            }
            // POST /calendars/:calendarId/events
            if (method === 'POST' && !eventId) {
                const item = { eventId: randomUUID(), calendarId, ...body, createdAt: new Date().toISOString() };
                await ddb.send(new PutCommand({ TableName: EVENTS_TABLE, Item: item }));
                return ok(item, 201);
            }
            // PATCH /calendars/:calendarId/events/:eventId
            if (method === 'PATCH' && eventId) {
                const { eventId: _e, calendarId: _c, createdAt: _cr, ...updates } = body;
                const sets: string[] = ['updatedAt = :ua'];
                const names: Record<string, string> = {};
                const vals:  Record<string, unknown> = { ':ua': new Date().toISOString() };
                Object.entries(updates).forEach(([k, v], i) => {
                    sets.push(`#k${i} = :v${i}`);
                    names[`#k${i}`] = k;
                    vals[`:v${i}`]  = v;
                });
                const res = await ddb.send(new UpdateCommand({
                    TableName: EVENTS_TABLE,
                    Key: { eventId, calendarId },
                    UpdateExpression: `SET ${sets.join(', ')}`,
                    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
                    ExpressionAttributeValues: vals,
                    ConditionExpression: 'attribute_exists(eventId)',
                    ReturnValues: 'ALL_NEW',
                }));
                return ok(res.Attributes);
            }
            // DELETE /calendars/:calendarId/events/:eventId
            if (method === 'DELETE' && eventId) {
                await ddb.send(new DeleteCommand({
                    TableName: EVENTS_TABLE,
                    Key: { eventId, calendarId },
                    ConditionExpression: 'attribute_exists(eventId)',
                }));
                return ok({ message: 'Event deleted' });
            }
        }

        // ── Calendars ──────────────────────────────────────────────────────────

        // GET /calendars
        if (method === 'GET' && !calendarId) {
            const res = await ddb.send(new ScanCommand({ TableName: CALENDARS_TABLE }));
            return ok(res.Items ?? []);
        }
        // POST /calendars
        if (method === 'POST' && !calendarId) {
            const item = { calendarId: randomUUID(), ...body, createdAt: new Date().toISOString() };
            await ddb.send(new PutCommand({ TableName: CALENDARS_TABLE, Item: item }));
            return ok(item, 201);
        }
        // DELETE /calendars/:calendarId
        if (method === 'DELETE' && calendarId && !path.includes('/events')) {
            await ddb.send(new DeleteCommand({
                TableName: CALENDARS_TABLE,
                Key: { calendarId },
                ConditionExpression: 'attribute_exists(calendarId)',
            }));
            return ok({ message: 'Calendar deleted' });
        }

        return err('Not found', 404);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ConditionalCheckFailed')) return err('Item not found', 404);
        console.error(e);
        return err(msg);
    }
};
