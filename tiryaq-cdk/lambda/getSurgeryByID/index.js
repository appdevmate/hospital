const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        // ✅ Decode the URL-encoded patientID and surgeryID
        const encodedPatientID = event.pathParameters.patientID;
        const encodedSurgeryID = event.pathParameters.surgeryID;

        const patientID = decodeURIComponent(encodedPatientID);
        const surgeryID = decodeURIComponent(encodedSurgeryID);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,                           // e.g., PATIENT#<uuid>
                SK: `SURGERY#${surgeryID}`               // e.g., SURGERY#<uuid>
            }
        };

        const command = new GetCommand(params);
        const result = await dynamo.send(command);

        if (!result.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Surgery with ID ${surgeryID} for patient ${patientID} not found.`
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Surgery retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve surgery.',
                error: error.message
            })
        };
    }
};
