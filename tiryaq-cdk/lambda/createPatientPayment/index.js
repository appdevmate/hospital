const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const patientID = decodeURIComponent(event.pathParameters.patientID);
        const body = JSON.parse(event.body);

        if (!body.amount || !body.status) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: amount, status' })
            };
        }

        const paymentUUID = randomUUID();
        const timestamp = new Date().toISOString();

        const item = {
            PK: `PATIENT#${patientID}`,
            SK: `PAYMENT#${paymentUUID}`,
            EntityType: 'PAYMENT',
            paymentId: paymentUUID,
            patientId: patientID,
            invoiceNumber: body.invoiceNumber || `INV-${Date.now()}`,
            patientName: body.patientName || null,
            doctorId: body.doctorId || null,
            doctorName: body.doctorName || null,
            doctorEmail: body.doctorEmail || null,
            appointmentId: body.appointmentId || null,
            items: body.items || [],
            amount: body.amount,
            insuranceProvider: body.insuranceProvider || null,
            insuranceCoverage: body.insuranceCoverage || 0,
            insuranceAmount: body.insuranceAmount || 0,
            patientOwes: body.patientOwes ?? body.amount,
            status: body.status,
            paymentType: body.paymentType || null,
            dueDate: body.dueDate || null,
            notes: body.notes || null,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await dynamo.send(new PutCommand({ TableName: 'Hospital', Item: item }));

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Payment created successfully', data: item })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create payment', error: error.message })
        };
    }
};