const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log("Incoming event:", JSON.stringify(event));

    try {
        // ✅ Decode the URL-encoded patientID
        const encodedID = event.pathParameters.patientID;
        const patientID = decodeURIComponent(encodedID);

        console.log(`Decoded patientID: ${patientID}`);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: 'PROFILE'
            }
        };

        const command = new GetCommand(params);
        const result = await dynamo.send(command);

        if (!result.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Patient with ID ${patientID} not found.`
                })
            };
        }

        console.log("✅ Patient retrieved successfully.");
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Patient retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        console.error("❌ Error retrieving patient:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve patient.',
                error: error.message
            })
        };
    }
};
