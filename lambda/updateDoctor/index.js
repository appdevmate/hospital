// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// const client = new DynamoDBClient({ region: 'eu-north-1' });
// const dynamo = DynamoDBDocumentClient.from(client);

// exports.handler = async (event) => {
//     console.log("Incoming event:", JSON.stringify(event));

//     try {
//         // Extract doctorID from path parameters
//         const doctorID = decodeURIComponent(event.pathParameters.doctorID);
        
//         // Parse request body
//         const body = JSON.parse(event.body);

//         // Validate request body
//         if (!body || Object.keys(body).length === 0) {
//             return {
//                 statusCode: 400,
//                 body: JSON.stringify({ 
//                     message: "Request body cannot be empty." 
//                 })
//             };
//         }

//         // Protected fields that shouldn't be updated
//         const protectedFields = ['PK', 'SK', 'EntityType'];
//         const allowedFields = ['name', 'dob', 'gender', 'insurance', 'specialty'];

//         // Filter out protected fields and validate allowed fields
//         const updateFields = {};
//         for (const [key, value] of Object.entries(body)) {
//             if (protectedFields.includes(key)) {
//                 console.log(`⚠️ Skipping protected field: ${key}`);
//                 continue;
//             }
//             if (allowedFields.includes(key)) {
//                 updateFields[key] = value;
//             } else {
//                 console.log(`⚠️ Skipping unknown field: ${key}`);
//             }
//         }

//         // Check if there are valid fields to update
//         if (Object.keys(updateFields).length === 0) {
//             return {
//                 statusCode: 400,
//                 body: JSON.stringify({ 
//                     message: "No valid fields to update. Allowed fields: " + allowedFields.join(', ')
//                 })
//             };
//         }

//         // Build UpdateExpression dynamically
//         let updateExpression = "SET ";
//         const expressionAttributeNames = {};
//         const expressionAttributeValues = {};

//         // Add timestamp for tracking updates
//         updateFields.updatedAt = new Date().toISOString();

//         Object.keys(updateFields).forEach((key, idx) => {
//             updateExpression += `#field${idx} = :value${idx}, `;
//             expressionAttributeNames[`#field${idx}`] = key;
//             expressionAttributeValues[`:value${idx}`] = updateFields[key];
//         });

//         // Remove trailing comma and space
//         updateExpression = updateExpression.slice(0, -2);

//         const params = {
//             TableName: 'Hospital',
//             Key: {
//                 PK: `DOCTOR#${doctorID}`, 
//                 SK: 'PROFILE'
//             },
//             UpdateExpression: updateExpression,
//             ExpressionAttributeNames: expressionAttributeNames,
//             ExpressionAttributeValues: expressionAttributeValues,
//             ReturnValues: "ALL_NEW",
//             // Add condition to ensure the item exists
//             ConditionExpression: "attribute_exists(PK)"
//         };

//         const result = await dynamo.send(new UpdateCommand(params));
//         console.log("✅ Doctor updated successfully:", result.Attributes);

//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: "Doctor updated successfully",
//                 doctorID: doctorID,
//                 updatedData: result.Attributes
//             })
//         };

//     } catch (error) {
//         console.error("❌ Error updating doctor:", error);

//         // Handle specific DynamoDB errors
//         if (error.name === 'ConditionalCheckFailedException') {
//             return {
//                 statusCode: 404,
//                 body: JSON.stringify({
//                     message: "Doctor not found",
//                     doctorID: event.pathParameters?.doctorID
//                 })
//             };
//         }

//         return {
//             statusCode: 500,
//             body: JSON.stringify({
//                 message: "Failed to update doctor",
//                 error: error.message
//             })
//         };
//     }
// };

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

exports.handler = async (event) => {
  try {
    const doctorID = decodeURIComponent(event.pathParameters.doctorID);
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Request body cannot be empty.' }) };
    }

    const protectedFields = ['PK', 'SK', 'EntityType'];
    const alias = { specialty: 'specialization', qatarID: 'qid', QatarID: 'qid' };

    const updateFields = Object.fromEntries(
      Object.entries(body)
        .filter(([k]) => !protectedFields.includes(k))
        .map(([k, v]) => [alias[k] || k, toLower(v)])
    );
    updateFields.updatedAt = new Date().toISOString();

    const keys = Object.keys(updateFields);
    if (!keys.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No valid fields to update.' }) };
    }

    const UpdateExpression = 'SET ' + keys.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updateFields[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: 'Hospital',
      Key: { PK: `DOCTOR#${doctorID}`, SK: 'PROFILE' },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Doctor updated successfully', doctorID, updatedData: result.Attributes })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return { statusCode: 404, body: JSON.stringify({ message: 'Doctor not found' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to update doctor', error: error.message }) };
  }
};
