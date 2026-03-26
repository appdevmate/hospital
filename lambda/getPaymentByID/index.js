const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log("Incoming event:", JSON.stringify(event));

    try {
        // ✅ Decode the URL-encoded patientID and paymentID
        const encodedPatientID = event.pathParameters.patientID;
        const encodedpaymentID = event.pathParameters.paymentID;

        const patientID = decodeURIComponent(encodedPatientID);
        const paymentID = decodeURIComponent(encodedpaymentID);

        console.log(`Decoded patientID: ${patientID}`);
        console.log(`Decoded paymentID: ${paymentID}`);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: `PAYMENT#${paymentID}`
            }
        };

        const command = new GetCommand(params);
        const result = await dynamo.send(command);

        if (!result.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Payment with ID ${paymentID} for patient ${patientID} not found.`
                })
            };
        }

        console.log("✅ Payment retrieved successfully.");
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payment retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        console.error("❌ Error retrieving payment:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve payment.',
                error: error.message
            })
        };
    }
};
