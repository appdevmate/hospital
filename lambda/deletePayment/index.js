const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log("Incoming event:", JSON.stringify(event));

    try {
        const encodedPatientID = event.pathParameters.patientID;
        const encodedPaymentID = event.pathParameters.paymentID;

        const patientID = decodeURIComponent(encodedPatientID);
        const paymentID = decodeURIComponent(encodedPaymentID);

        const deletedAt = new Date().toISOString(); // current timestamp

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: `PAYMENT#${paymentID}`
            },
            UpdateExpression: 'SET deletedAt = :deletedAt',
            ExpressionAttributeValues: {
                ':deletedAt': deletedAt
            }
        };

        await dynamo.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Payment ${paymentID} for patient ${patientID} soft-deleted.`,
                deletedAt
            })
        };
    } catch (error) {
        console.error("❌ Error soft-deleting payment:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to soft-delete payment",
                error: error.message
            })
        };
    }
};
