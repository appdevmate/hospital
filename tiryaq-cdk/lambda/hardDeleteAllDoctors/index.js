const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  GetCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#DOCTORS';
const COUNTER_SK = 'TOTAL';
const BATCH_SIZE = 25;

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const HDRS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
};

const ok   = (body)            => ({ statusCode: 200, headers: HDRS, body: JSON.stringify(body) });
const fail = (status, message) => ({ statusCode: status, headers: HDRS, body: JSON.stringify({ message }) });

/* ── helpers ── */
const toPK = (id) => id.startsWith('DOCTOR#') ? id : `DOCTOR#${id}`;

const doctorExists = async (pk) => {
  const res = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'PROFILE' },
    ProjectionExpression: 'PK'
  }));
  return !!res.Item;
};

const decrementCounter = async (count) => {
  await dynamo.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: COUNTER_PK, SK: COUNTER_SK },
    UpdateExpression: 'SET #t = if_not_exists(#t, :zero) - :count',
    ExpressionAttributeNames: { '#t': 'total' },
    ExpressionAttributeValues: { ':count': count, ':zero': 0 }
  }));
};

/* ── batch delete with retry ── */
const batchDelete = async (pks) => {
  const chunks = [];
  for (let i = 0; i < pks.length; i += BATCH_SIZE) {
    chunks.push(pks.slice(i, i + BATCH_SIZE));
  }

  let deletedCount = 0;
  const failedPKs  = [];

  for (const chunk of chunks) {
    let unprocessed = chunk.map(pk => ({ DeleteRequest: { Key: { PK: pk, SK: 'PROFILE' } } }));
    let retries = 0;

    while (unprocessed.length > 0 && retries < 3) {
      const res = await dynamo.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: unprocessed } }));
      unprocessed = res.UnprocessedItems?.[TABLE_NAME] || [];
      if (unprocessed.length > 0) {
        retries++;
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, retries)));
      }
    }

    if (unprocessed.length > 0) {
      failedPKs.push(...unprocessed.map(u => u.DeleteRequest.Key.PK));
    } else {
      deletedCount += chunk.length;
    }
  }

  return { deletedCount, failedPKs };
};

/* ── handler ── */
exports.handler = async (event) => {
  try {
    const body   = JSON.parse(event.body || '{}');
    const rawIds = body.ids;

    // ── validate input ──
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return fail(400, 'Request body must contain a non-empty "ids" array');
    }

    const ids = rawIds.map(id => String(id).trim()).filter(Boolean);
    if (ids.length === 0) {
      return fail(400, 'All provided IDs are empty or invalid');
    }

    const pks = ids.map(toPK);

    // ── check existence ──
    const existenceResults = await Promise.all(
      pks.map(async (pk) => ({ pk, exists: await doctorExists(pk) }))
    );

    const found    = existenceResults.filter(r => r.exists).map(r => r.pk);
    const notFound = existenceResults.filter(r => !r.exists).map(r => r.pk.replace('DOCTOR#', ''));

    if (found.length === 0) {
      return fail(404, 'No doctors found for the provided IDs');
    }

    // ── hard delete ──
    const { deletedCount, failedPKs } = await batchDelete(found);

    // ── decrement counter ──
    if (deletedCount > 0) {
      await decrementCounter(deletedCount);
    }

    const failedIds = failedPKs.map(pk => pk.replace('DOCTOR#', ''));

    const statusCode = deletedCount === 0   ? 500
                     : failedIds.length > 0 ? 207
                     : notFound.length > 0  ? 207
                     : 200;

    return {
      statusCode,
      headers: HDRS,
      body: JSON.stringify({
        message: failedIds.length > 0
          ? `Deleted ${deletedCount} doctor(s) with ${failedIds.length} failure(s)`
          : notFound.length > 0
            ? `Deleted ${deletedCount} doctor(s); ${notFound.length} ID(s) not found`
            : `Successfully deleted ${deletedCount} doctor(s)`,
        totalRequested: ids.length,
        deletedCount,
        notFoundCount: notFound.length,
        notFoundIds: notFound,
        failedCount: failedIds.length,
        failedIds
      })
    };

  } catch (err) {
    return fail(500, err?.message || 'Internal Server Error');
  }
};