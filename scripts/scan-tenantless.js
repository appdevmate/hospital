const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const ENTITIES = ['PATIENT','DOCTOR','APPOINTMENT','EXAMINATION','BB_DONOR','BB_UNIT','BB_REQUEST','MEDICATION','INVENTORY','DISPENSE','PURCHASE_ORDER','CALENDAR','CALENDAR_EVENT','SCRIBE_SESSION'];

async function countQuery(et, filter) {
    let count = 0;
    let lastKey;
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: 'Hospital',
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            FilterExpression: filter,
            ExpressionAttributeValues: { ':et': et },
            Select: 'COUNT',
            ExclusiveStartKey: lastKey
        }));
        count += r.Count || 0;
        lastKey = r.LastEvaluatedKey;
    } while (lastKey);
    return count;
}

(async () => {
    console.log('Entity'.padEnd(20), 'total'.padStart(8), 'missingTenant'.padStart(15));
    for (const et of ENTITIES) {
        const total = await countQuery(et, undefined);
        const missing = await countQuery(et, 'attribute_not_exists(tenantId)');
        console.log(et.padEnd(20), String(total).padStart(8), String(missing).padStart(15));
    }
})().catch(e => { console.error(e); process.exit(1); });
