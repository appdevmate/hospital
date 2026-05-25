const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'Hospital';
// Keep reference/lookup data; wipe everything else INCLUDING the counters.
// (createPatient / createDoctor recreate the counters lazily via
//  `SET total = if_not_exists(total, :zero) + :inc` on first insert.)
const KEEP_PREFIXES = ['SPECIALIZATION#', 'DEPARTMENT#'];
const KEEP_EXACT    = [];

async function main() {
    let items = [], lastKey;
    do {
        const resp = await client.send(new ScanCommand({
            TableName: TABLE,
            ProjectionExpression: 'PK, SK',
            ExclusiveStartKey: lastKey
        }));
        items = items.concat(resp.Items || []);
        lastKey = resp.LastEvaluatedKey;
    } while (lastKey);

    const toDelete = items.filter(item => {
        const pk = item.PK.S;
        return !KEEP_PREFIXES.some(p => pk.startsWith(p)) && !KEEP_EXACT.includes(pk);
    });

    for (let i = 0; i < toDelete.length; i++) {
        const pk = toDelete[i].PK.S;
        const sk = toDelete[i].SK.S;
        await client.send(new DeleteItemCommand({
            TableName: TABLE,
            Key: { PK: { S: pk }, SK: { S: sk } }
        }));
    }
}

main();