// tiryaq-document-manager Lambda Function
// Handles: upload-url, download-url, list, delete, folders
// Uses pre-signed URLs for secure S3 uploads/downloads

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const BUCKET = process.env.DOCUMENTS_BUCKET || 'tiryaq-documents';
const TABLE  = process.env.TABLE_NAME || 'Hospital';
const URL_EXPIRY = 300; // 5 minutes

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
    const h = event.headers || {};
    return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
    if (!cid) return null;
    try {
        const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
        if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
    } catch (_) {}
    return null;
}
async function storeIdempotency(cid, response) {
    if (!cid) return;
    try {
        await ddb.send(new PutCommand({
            TableName: TABLE,
            Item: {
                PK: `IDEMP#${cid}`, SK: 'PROFILE', EntityType: 'IDEMPOTENCY',
                clientRequestId: cid, response: JSON.stringify(response),
                dataClass: 'SYSTEM',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: Math.floor(Date.now() / 1000) + 86400
            }
        }));
    } catch (_) {}
}

// Allowed folders — requests for any other folder are rejected
const ALLOWED_FOLDERS = [
    'doctors-documents',
    'patients-documents',
    'lab-results',
    'prescriptions',
    'radiology-images',
    'pharmacy-approvals'
];

// Allowed file types
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/dicom',
    'application/dicom',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Folder-to-group access rules — admin/developer have full access; doctors
 * may read/write clinical folders; pharmacists may read/write pharmacy
 * folders only. Anything outside this matrix is rejected before we hit S3.
 */
const FOLDER_ACCESS = {
    'doctors-documents':  ['Admin', 'Developers', 'Doctors'],
    'patients-documents': ['Admin', 'Developers', 'Doctors'],
    'lab-results':        ['Admin', 'Developers', 'Doctors'],
    'radiology-images':   ['Admin', 'Developers', 'Doctors'],
    'prescriptions':      ['Admin', 'Developers', 'Doctors', 'Pharmacists'],
    'pharmacy-approvals': ['Admin', 'Developers', 'Doctors', 'Pharmacists']
};
function getGroups(claims) {
    const raw = claims['cognito:groups'] || '';
    return Array.isArray(raw)
        ? raw
        : String(raw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
}
function canAccessFolder(groups, folder) {
    const allowed = FOLDER_ACCESS[folder];
    if (!allowed) return false;
    return groups.some(g => allowed.includes(g.trim()));
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    // Handle CORS preflight
    const method = event.httpMethod || event.requestContext?.http?.method || '';
    if (method === 'OPTIONS') {
        return ok({});
    }

    try {
        // Extract user info from Cognito authorizer
        const claims = event.requestContext?.authorizer?.claims
            || event.requestContext?.authorizer?.jwt?.claims
            || {};
        const userId = claims.sub || claims['cognito:username'];
        if (!userId) {
            return errResp(401, 'Unauthenticated — missing sub claim');
        }
        const groups = getGroups(claims);
        const isAdminLike = groups.some(g => ['Admin','Developers','admin','developer'].includes(g.trim()));

        // Parse path
        const path = event.path || event.rawPath || '';

        // Parse body for POST/DELETE requests
        let body = {};
        if (event.body) {
            try {
                body = JSON.parse(
                    event.isBase64Encoded
                        ? Buffer.from(event.body, 'base64').toString()
                        : event.body
                );
            } catch {
                body = {};
            }
        }

        // Parse query string for GET requests
        const qp = event.queryStringParameters || {};

        // ─────────────────────────────────────────────
        // POST /documents/upload-url
        // Generate a pre-signed URL for uploading a file
        // ─────────────────────────────────────────────
        if (path.endsWith('/upload-url') && method === 'POST') {
            const cid = getClientRequestId(event);
            const cached = await checkIdempotency(cid);
            if (cached) return cached;
            const { folder, fileName, contentType, fileSize } = body;

            // Validate required fields
            if (!folder || !fileName || !contentType) {
                return errResp(400, 'Missing required fields: folder, fileName, contentType');
            }

            // Validate folder
            if (!validateFolder(folder)) {
                return errResp(400, 'Invalid folder. Allowed: ' + ALLOWED_FOLDERS.join(', '));
            }
            // Authorization: only certain groups can write to certain folders.
            if (!canAccessFolder(groups, folder)) {
                return errResp(403, 'You do not have permission to upload to this folder');
            }

            // Validate file type
            if (!ALLOWED_TYPES.includes(contentType)) {
                return errResp(400, 'File type not allowed: ' + contentType);
            }

            // Validate file size
            if (fileSize && fileSize > MAX_FILE_SIZE) {
                return errResp(400, 'File too large. Maximum: ' + (MAX_FILE_SIZE / 1024 / 1024) + ' MB');
            }

            // Build the S3 key: folder/userId/timestamp_filename
            const safeName = sanitizeFilename(fileName);
            const timestamp = Date.now();
            const key = folder + '/' + userId + '/' + timestamp + '_' + safeName;

            // Generate the pre-signed upload URL
            const command = new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                ContentType: contentType,
                Metadata: {
                    'uploaded-by': userId,
                    'original-name': fileName
                }
            });

            const uploadUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY });

            const response = ok({
                uploadUrl: uploadUrl,
                key: key,
                expiresIn: URL_EXPIRY,
                message: 'Upload URL generated. Use PUT method to upload.'
            });
            await storeIdempotency(cid, response);
            return response;
        }

        // ─────────────────────────────────────────────
        // POST /documents/download-url
        // Generate a pre-signed URL for downloading a file
        // ─────────────────────────────────────────────
        if (path.endsWith('/download-url') && method === 'POST') {
            const { key } = body;

            if (!key) {
                return errResp(400, 'Missing required field: key');
            }

            // Validate the key starts with an allowed folder
            const folder = key.split('/')[0];
            if (!validateFolder(folder)) {
                return errResp(400, 'Invalid file path');
            }
            // Authorization: caller must have access to this folder by group.
            if (!canAccessFolder(groups, folder)) {
                return errResp(403, 'You do not have permission to download from this folder');
            }
            // Per-resource check: non-admin users may only fetch keys uploaded
            // by themselves (key format is `folder/<userId>/...`).
            const keyOwner = key.split('/')[1];
            if (!isAdminLike && keyOwner && keyOwner !== userId) {
                return errResp(403, 'You may only download your own files');
            }

            const command = new GetObjectCommand({
                Bucket: BUCKET,
                Key: key
            });

            const downloadUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY });

            return ok({
                downloadUrl: downloadUrl,
                expiresIn: URL_EXPIRY
            });
        }

        // ─────────────────────────────────────────────
        // GET /documents/list?folder=lab-results
        // List files in a folder
        // ─────────────────────────────────────────────
        if (path.endsWith('/list') && method === 'GET') {
            const folder = qp.folder || '';
            const prefix = qp.prefix || '';

            if (!folder) {
                return errResp(400, 'Missing required query parameter: folder');
            }

            if (!validateFolder(folder)) {
                return errResp(400, 'Invalid folder. Allowed: ' + ALLOWED_FOLDERS.join(', '));
            }
            if (!canAccessFolder(groups, folder)) {
                return errResp(403, 'You do not have permission to list this folder');
            }

            // Build the prefix to search
            let searchPrefix = folder + '/';
            if (prefix) {
                searchPrefix += prefix;
            }

            const command = new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: searchPrefix,
                MaxKeys: 100
            });

            const result = await s3.send(command);

            const files = (result.Contents || [])
                .filter(function (item) {
                    return !item.Key.endsWith('/'); // Exclude folder markers
                })
                .map(function (item) {
                    const parts = item.Key.split('/');
                    return {
                        key: item.Key,
                        fileName: parts[parts.length - 1] || '',
                        folder: parts[0] || '',
                        uploadedBy: parts[1] || 'unknown',
                        size: item.Size,
                        lastModified: item.LastModified
                    };
                });

            return ok({
                folder: folder,
                count: files.length,
                files: files
            });
        }

        // ─────────────────────────────────────────────
        // DELETE /documents/delete
        // Delete a specific file
        // ─────────────────────────────────────────────
        if (path.endsWith('/delete') && method === 'DELETE') {
            const cid = getClientRequestId(event);
            const cached = await checkIdempotency(cid);
            if (cached) return cached;
            const key = body.key || '';

            if (!key) {
                return errResp(400, 'Missing required field: key');
            }

            const folder = key.split('/')[0];
            if (!validateFolder(folder)) {
                return errResp(400, 'Invalid file path');
            }
            if (!canAccessFolder(groups, folder)) {
                return errResp(403, 'You do not have permission to delete from this folder');
            }
            const keyOwner = key.split('/')[1];
            if (!isAdminLike && keyOwner && keyOwner !== userId) {
                return errResp(403, 'You may only delete your own files');
            }

            const command = new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key
            });

            await s3.send(command);

            const response = ok({ message: 'File deleted successfully', key: key });
            await storeIdempotency(cid, response);
            return response;
        }

        // ─────────────────────────────────────────────
        // GET /documents/folders
        // Return list of available folders
        // ─────────────────────────────────────────────
        if (path.endsWith('/folders') && method === 'GET') {
            const folders = ALLOWED_FOLDERS.map(function (f) {
                const words = f.split('-').map(function (w) {
                    return w.charAt(0).toUpperCase() + w.slice(1);
                });
                return {
                    id: f,
                    name: words.join(' ')
                };
            });

            return ok({ folders: folders });
        }

        return errResp(404, 'Route not found');

    } catch (err) {
        return errResp(500, err?.message || 'Internal Server Error');
    }
};

/* --------------------------------- helpers ---------------------------------- */

function validateFolder(folder) {
    return ALLOWED_FOLDERS.includes(folder);
}

function sanitizeFilename(filename) {
    // Remove path traversal, keep only the filename, replace unsafe chars
    return filename
        .replace(/^.*[\\/]/, '')           // Remove any path prefix
        .replace(/\.\./g, '')              // Remove .. sequences
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Only safe characters
        .substring(0, 255);               // Limit length
}

// CORS headers are injected by API Gateway HTTP API's corsPreflight
// allow-list (see tiryaq-cdk-stack.ts). Do NOT echo wildcard CORS headers
// here — they would override the allow-list and re-open every origin.
function ok(body) {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function errResp(status, message) {
    return {
        statusCode: status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    };
}