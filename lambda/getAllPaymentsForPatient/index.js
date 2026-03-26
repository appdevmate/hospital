exports.handler = async (event) => {
    console.log('Incoming event:', JSON.stringify(event));
    try {
        const patientID = event.pathParameters?.patientID;
        if (!patientID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing patientID in path parameters.' })
            };
        }

        const doctorEmail = event.queryStringParameters?.doctorEmail;

        let filterExp = 'attribute_not_exists(deletedAt)';
        const expValues = {
            ':pk': `PATIENT#${patientID}`,
            ':skPrefix': 'PAYMENT#'
        };
        const expNames = {};

        if (doctorEmail) {
            filterExp += ' AND #doctorEmail = :doctorEmail';
            expNames['#doctorEmail'] = 'doctorEmail';
            expValues[':doctorEmail'] = doctorEmail.toLowerCase().trim();
        }

        const result = await dynamo.send(new QueryCommand({
            TableName: 'Hospital',
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            FilterExpression: filterExp,
            ExpressionAttributeValues: expValues,
            ...(Object.keys(expNames).length > 0 && { ExpressionAttributeNames: expNames })
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payments retrieved successfully',
                count: result.Items.length,
                data: result.Items
            })
        };
    } catch (error) {
        console.error('Error retrieving payments:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve payments', error: error.message })
        };
    }
};