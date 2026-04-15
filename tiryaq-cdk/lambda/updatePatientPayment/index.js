const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const patientID = decodeURIComponent(event.pathParameters.patientID);
        const paymentID = decodeURIComponent(event.pathParameters.paymentID);
        const body = JSON.parse(event.body);

        if (!body || Object.keys(body).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Request body cannot be empty." })
            };
        }

        // Fields to protect
        const protectedFields = ['PK', 'SK', 'EntityType'];

        // Filter allowed update fields
        const updateFields = {};
        for (const [key, value] of Object.entries(body)) {
            if (protectedFields.includes(key)) {
                continue;
            }
            updateFields[key] = value;
        }

        // Add update timestamp
        updateFields.updatedAt = new Date().toISOString();

        if (Object.keys(updateFields).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No valid fields to update." })
            };
        }

        // Build update expression
        let updateExpression = "SET ";
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updateFields).forEach((key, idx) => {
            updateExpression += `#field${idx} = :value${idx}, `;
            expressionAttributeNames[`#field${idx}`] = key;
            expressionAttributeValues[`:value${idx}`] = updateFields[key];
        });

        updateExpression = updateExpression.slice(0, -2);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: `PAYMENT#${paymentID}`
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
        };

        const result = await dynamo.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Payment updated successfully",
                patientID,
                paymentID,
                updatedData: result.Attributes
            })
        };

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Payment record not found",
                    patientID: event.pathParameters?.patientID,
                    paymentID: event.pathParameters?.paymentID
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to update payment",
                error: error.message
            })
        };
    }
};
