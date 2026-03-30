const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand, GetCommand, QueryCommand,
    UpdateCommand, DeleteCommand, ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const client     = new DynamoDBClient({ region: REGION });
const db         = DynamoDBDocumentClient.from(client);

// ── Helpers ──────────────────────────────────────────────────────────────────
function res(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
function err(code, msg) { return res(code, { error: msg, message: msg }); }

function getClaims(event) {
    return event.requestContext?.authorizer?.jwt?.claims
        || event.requestContext?.authorizer?.claims || {};
}

function getActor(event) {
    const claims = getClaims(event);
    const email = (claims.email || claims['cognito:username'] || '').toLowerCase().trim();
    return {
        email,
        name: claims.name || email || 'unknown'
    };
}


function getUserGroups(event) {
    const claims = getClaims(event);
    const groups = claims['cognito:groups'] || '';
    if (Array.isArray(groups)) return groups;
    // API GW JWT authorizer wraps groups in square brackets: "[Pharmacists]" or "[A, B]"
    let str = String(groups).trim().replace(/^\[/, '').replace(/\]$/, '');
    if (!str) return [];
    if (str.includes(',')) return str.split(',').map(g => g.trim()).filter(Boolean);
    return str.split(' ').map(g => g.trim()).filter(Boolean);
}

function isAdmin(event) {
    return getUserGroups(event).some(g => ['admin','Admin','developer','Developer','Developers'].includes(g));
}

function isPharmacist(event) {
    return getUserGroups(event).some(g => ['pharmacist','Pharmacist','Pharmacists'].includes(g));
}

function canAccessPharmacy(event) {
    return isAdmin(event) || isPharmacist(event);
}

// Days until date
function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Check if medication name/generic contains any patient allergy keyword
function checkAllergies(medicationName, genericName, patientAllergies) {
    if (!patientAllergies || patientAllergies.length === 0) return [];
    const medStr = `${medicationName} ${genericName || ''}`.toLowerCase();
    const warnings = [];
    const allergies = Array.isArray(patientAllergies)
        ? patientAllergies
        : String(patientAllergies).split(',').map(a => a.trim());
    for (const allergy of allergies) {
        if (allergy && medStr.includes(allergy.toLowerCase())) {
            warnings.push(`Patient has known allergy to: ${allergy}`);
        }
    }
    return warnings;
}

// ── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    console.log('Pharmacy event:', JSON.stringify(event));

    const method = event.requestContext?.http?.method || event.httpMethod;
    const path   = event.rawPath || event.path || '';
    const qs     = event.queryStringParameters || {};
    const params = event.pathParameters || {};

    if (method === 'OPTIONS') return res(200, {});
    if (!canAccessPharmacy(event)) return err(403, 'Access denied: pharmacy staff only');

    // ══════════════════════════════════════════════════════════════════════════
    // MEDICATION CATALOG
    // ══════════════════════════════════════════════════════════════════════════

    // GET /pharmacy/medications
    if (method === 'GET' && path.endsWith('/medications') && !params.medId) {
        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'MEDICATION' }
        }));
        const meds = (result.Items || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        return res(200, meds);
    }

    // POST /pharmacy/medications
    if (method === 'POST' && path.endsWith('/medications')) {
        if (!isAdmin(event) && !isPharmacist(event)) return err(403, 'Only admins or pharmacists can add medications to the catalog');
        const body = JSON.parse(event.body || '{}');
        if (!body.name)     return err(400, 'Medication name is required');
        if (!body.category) return err(400, 'Category is required');

        const id  = randomUUID();
        const now = new Date().toISOString();
        const med = {
            PK:                `MED#${id}`,
            SK:                'PROFILE',
            EntityType:        'MEDICATION',
            medId:             id,
            name:              body.name.trim(),
            genericName:       body.genericName?.trim() || null,
            category:          body.category.trim(),
            form:              body.form     || null,   // tablet, capsule, injection, syrup, etc.
            strength:          body.strength || null,   // e.g. 500mg
            unit:              body.unit     || null,   // e.g. mg, ml
            manufacturer:      body.manufacturer || null,
            description:       body.description  || null,
            requiresPrescription: body.requiresPrescription !== false,
            reorderPoint:      body.reorderPoint || 10,   // min stock before alert
            createdAt:         now,
            updatedAt:         null
        };

        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: med }));

        // Create inventory record
        const inventory = {
            PK:          `MED#${id}`,
            SK:          'INVENTORY',
            EntityType:  'INVENTORY',
            medId:       id,
            medName:     med.name,
            stockQty:    0,
            reservedQty: 0,
            unit:        body.unit || null,
            location:    body.location    || null,
            batchNumber: null,
            expiryDate:  null,
            lastUpdated: now,
            adjustments: []
        };
        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: inventory }));

        return res(201, { medication: med, inventory });
    }

    // PATCH /pharmacy/medications/{medId}
    if (method === 'PATCH' && path.includes('/medications/') && params.medId && !path.includes('/inventory')) {
        if (!isAdmin(event) && !isPharmacist(event)) return err(403, 'Only admins or pharmacists can update the medication catalog');
        const body  = JSON.parse(event.body || '{}');
        const medId = params.medId;
        const now   = new Date().toISOString();

        const allowed = ['name','genericName','category','form','strength','unit','manufacturer','description','requiresPrescription','reorderPoint'];
        const expParts = ['#updatedAt = :ua'];
        const names    = { '#updatedAt': 'updatedAt' };
        const values   = { ':ua': now };

        allowed.forEach(f => {
            if (body[f] !== undefined) {
                expParts.push(`#${f} = :${f}`);
                names[`#${f}`]  = f;
                values[`:${f}`] = body[f];
            }
        });

        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `MED#${medId}`, SK: 'PROFILE' },
            UpdateExpression:          `SET ${expParts.join(', ')}`,
            ExpressionAttributeNames:  names,
            ExpressionAttributeValues: values
        }));

        const updated = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${medId}`, SK: 'PROFILE' } }));
        return res(200, updated.Item);
    }

    // DELETE /pharmacy/medications/{medId}
    if (method === 'DELETE' && path.includes('/medications/') && params.medId) {
        if (!isAdmin(event) && !isPharmacist(event)) return err(403, 'Only admins or pharmacists can delete medications');
        const medId = params.medId;

        // Check stock before delete
        const inv = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${medId}`, SK: 'INVENTORY' } }));
        if (inv.Item?.stockQty > 0) return err(409, `Cannot delete medication with ${inv.Item.stockQty} units in stock. Adjust stock to 0 first.`);

        await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${medId}`, SK: 'PROFILE' } }));
        await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${medId}`, SK: 'INVENTORY' } }));
        return res(200, { message: 'Medication deleted', medId });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INVENTORY
    // ══════════════════════════════════════════════════════════════════════════

    // GET /pharmacy/inventory
    if (method === 'GET' && path.endsWith('/inventory')) {
        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'INVENTORY' }
        }));

        // Fetch reorder points from medication profiles
        const items = await Promise.all((result.Items || []).map(async inv => {
            const med = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${inv.medId}`, SK: 'PROFILE' } }));
            const reorderPoint = med.Item?.reorderPoint || 10;
            const daysToExpiry = daysUntil(inv.expiryDate);
            return {
                ...inv,
                reorderPoint,
                isLowStock:     inv.stockQty <= reorderPoint,
                isExpiringSoon: daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0,
                isExpired:      daysToExpiry !== null && daysToExpiry <= 0,
                daysToExpiry,
                category:       med.Item?.category || null,
                form:           med.Item?.form     || null,
                strength:       med.Item?.strength || null,
                genericName:    med.Item?.genericName || null
            };
        }));

        return res(200, items.sort((a,b) => (a.medName||'').localeCompare(b.medName||'')));
    }

    // PATCH /pharmacy/inventory/{medId} — adjust stock
    if (method === 'PATCH' && path.includes('/inventory/') && params.medId) {
        const body   = JSON.parse(event.body || '{}');
        const medId  = params.medId;
        const actor  = getActor(event);
        const now    = new Date().toISOString();

        if (!body.adjustmentType) return err(400, 'adjustmentType is required: received | returned | expired | damaged | correction');
        if (body.quantity === undefined || body.quantity === null) return err(400, 'quantity is required');

        const validTypes = ['received','returned','expired','damaged','correction'];
        if (!validTypes.includes(body.adjustmentType)) return err(400, `adjustmentType must be one of: ${validTypes.join(', ')}`);

        const inv = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${medId}`, SK: 'INVENTORY' } }));
        if (!inv.Item) return err(404, 'Inventory record not found');

        // For deductions, quantity should be negative
        const delta = body.adjustmentType === 'correction' ? body.quantity : Math.abs(body.quantity) * (['expired','damaged'].includes(body.adjustmentType) ? -1 : 1);
        const newQty = Math.max(0, (inv.Item.stockQty || 0) + delta);

        const adjustment = {
            id:             randomUUID(),
            type:           body.adjustmentType,
            quantity:       body.quantity,
            delta,
            newQty,
            reason:         body.reason  || null,
            batchNumber:    body.batchNumber || inv.Item.batchNumber || null,
            expiryDate:     body.expiryDate  || null,
            actorEmail:     actor.email,
            actorName:      actor.name,
            timestamp:      now
        };

        const updateExp  = ['#stockQty = :qty', '#lastUpdated = :lu', '#adjustments = list_append(if_not_exists(#adjustments, :empty), :adj)'];
        const updateNames  = { '#stockQty': 'stockQty', '#lastUpdated': 'lastUpdated', '#adjustments': 'adjustments' };
        const updateValues = { ':qty': newQty, ':lu': now, ':adj': [adjustment], ':empty': [] };

        if (body.expiryDate) { updateExp.push('#expiryDate = :ed');  updateNames['#expiryDate']  = 'expiryDate';  updateValues[':ed']  = body.expiryDate; }
        if (body.batchNumber){ updateExp.push('#batchNumber = :bn'); updateNames['#batchNumber'] = 'batchNumber'; updateValues[':bn']  = body.batchNumber; }
        if (body.location)   { updateExp.push('#location = :loc');   updateNames['#location']    = 'location';   updateValues[':loc'] = body.location; }

        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `MED#${medId}`, SK: 'INVENTORY' },
            UpdateExpression:          `SET ${updateExp.join(', ')}`,
            ExpressionAttributeNames:  updateNames,
            ExpressionAttributeValues: updateValues
        }));

        return res(200, { message: 'Stock updated', adjustment, newQty });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRESCRIPTIONS QUEUE — pending prescriptions from examinations
    // ══════════════════════════════════════════════════════════════════════════

    // GET /pharmacy/prescriptions
    if (method === 'GET' && path.endsWith('/prescriptions')) {
        const status = qs.status || 'ordered'; // ordered | dispensed | cancelled

        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'EXAMINATION' }
        }));

        const pending = [];
        for (const exam of (result.Items || [])) {
            const rxs = (exam.prescriptions || []).filter(rx => rx.status === status);
            if (rxs.length === 0) continue;

            // Fetch patient allergies for allergy check
            let patientAllergies = [];
            try {
                const patient = await db.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: `PATIENT#${exam.patientId}`, SK: 'PROFILE' }
                }));
                patientAllergies = patient.Item?.allergies || [];
            } catch (_) {}

            rxs.forEach(rx => {
                const allergyWarnings = checkAllergies(rx.medication, '', patientAllergies);
                pending.push({
                    examId:          exam.examId,
                    examDate:        exam.date,
                    patientId:       exam.patientId,
                    patientName:     exam.patientName,
                    doctorName:      exam.doctorName,
                    prescription:    rx,
                    allergyWarnings,
                    hasAllergyAlert: allergyWarnings.length > 0
                });
            });
        }

        // Sort by date descending
        pending.sort((a,b) => b.examDate.localeCompare(a.examDate));
        return res(200, pending);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPENSE
    // ══════════════════════════════════════════════════════════════════════════

    // POST /pharmacy/dispense
    if (method === 'POST' && path.endsWith('/dispense')) {
        const body  = JSON.parse(event.body || '{}');
        const actor = getActor(event);
        const now   = new Date().toISOString();

        if (!body.examId)         return err(400, 'examId is required');
        if (!body.prescriptionId) return err(400, 'prescriptionId is required');
        if (!body.medId)          return err(400, 'medId is required — select the inventory medication');
        if (!body.quantityDispensed) return err(400, 'quantityDispensed is required');

        // Get exam and find prescription
        const exam = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `EXAM#${body.examId}`, SK: 'PROFILE' } }));
        if (!exam.Item) return err(404, 'Examination not found');

        const rxIndex = (exam.Item.prescriptions || []).findIndex(rx => rx.id === body.prescriptionId);
        if (rxIndex === -1) return err(404, 'Prescription not found in this examination');

        const rx = exam.Item.prescriptions[rxIndex];
        if (rx.status === 'dispensed') return err(409, 'This prescription has already been dispensed');
        if (rx.status === 'cancelled') return err(409, 'This prescription has been cancelled');

        // Check inventory
        const inv = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${body.medId}`, SK: 'INVENTORY' } }));
        if (!inv.Item) return err(404, 'Medication not found in inventory');
        if (inv.Item.stockQty < body.quantityDispensed) {
            return err(409, `Insufficient stock. Available: ${inv.Item.stockQty}, Requested: ${body.quantityDispensed}`);
        }

        // Allergy check
        let allergyWarnings = [];
        try {
            const patient = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `PATIENT#${exam.Item.patientId}`, SK: 'PROFILE' } }));
            const med = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${body.medId}`, SK: 'PROFILE' } }));
            allergyWarnings = checkAllergies(med.Item?.name || '', med.Item?.genericName || '', patient.Item?.allergies || []);
        } catch (_) {}

        // If allergy warning and override not confirmed — return warning for frontend to show
        if (allergyWarnings.length > 0 && !body.allergyOverrideConfirmed) {
            return res(200, { requiresAllergyConfirmation: true, allergyWarnings, message: 'Allergy alert — confirm override to proceed' });
        }

        // Create dispense record
        const dispenseId = randomUUID();
        const dispense = {
            PK:                  `DISPENSE#${dispenseId}`,
            SK:                  'PROFILE',
            EntityType:          'DISPENSE',
            dispenseId,
            examId:              body.examId,
            prescriptionId:      body.prescriptionId,
            patientId:           exam.Item.patientId,
            patientName:         exam.Item.patientName,
            doctorName:          exam.Item.doctorName,
            medId:               body.medId,
            medName:             inv.Item.medName,
            quantityDispensed:   body.quantityDispensed,
            unit:                inv.Item.unit,
            batchNumber:         inv.Item.batchNumber || null,
            expiryDate:          inv.Item.expiryDate  || null,
            notes:               body.notes           || null,
            allergyWarnings:     allergyWarnings,
            allergyOverridden:   allergyWarnings.length > 0 && body.allergyOverrideConfirmed,
            dispensedBy:         actor.email,
            dispensedByName:     actor.name,
            dispensedAt:         now,
            prescription: {
                medication: rx.medication,
                dose:       rx.dose,
                frequency:  rx.frequency,
                route:      rx.route,
                duration:   rx.duration
            }
        };

        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: dispense }));

        // Deduct stock
        const newQty = inv.Item.stockQty - body.quantityDispensed;
        const adjustment = {
            id: randomUUID(), type: 'dispensed',
            quantity: body.quantityDispensed, delta: -body.quantityDispensed, newQty,
            reason: `Dispensed for ${exam.Item.patientName} — Exam ${body.examId}`,
            actorEmail: actor.email, actorName: actor.name, timestamp: now, dispenseId
        };
        await db.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MED#${body.medId}`, SK: 'INVENTORY' },
            UpdateExpression: 'SET #qty = :qty, #lu = :lu, #adj = list_append(if_not_exists(#adj, :empty), :a)',
            ExpressionAttributeNames: { '#qty': 'stockQty', '#lu': 'lastUpdated', '#adj': 'adjustments' },
            ExpressionAttributeValues: { ':qty': newQty, ':lu': now, ':a': [adjustment], ':empty': [] }
        }));

        // Update prescription status on exam to 'dispensed'
        const updatedPrescriptions = [...exam.Item.prescriptions];
        updatedPrescriptions[rxIndex] = { ...rx, status: 'dispensed', dispensedAt: now, dispenseId };
        await db.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${body.examId}`, SK: 'PROFILE' },
            UpdateExpression: 'SET prescriptions = :rx, updatedAt = :ua',
            ExpressionAttributeValues: { ':rx': updatedPrescriptions, ':ua': now }
        }));

        return res(201, { dispense, newStock: newQty, allergyWarnings });
    }

    // GET /pharmacy/dispense
    if (method === 'GET' && path.endsWith('/dispense')) {
        const patientId = qs.patientId;
        const result = await db.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            FilterExpression: patientId ? 'patientId = :pid' : undefined,
            ExpressionAttributeValues: patientId
                ? { ':et': 'DISPENSE', ':pid': patientId }
                : { ':et': 'DISPENSE' }
        }));
        const items = (result.Items || []).sort((a,b) => b.dispensedAt.localeCompare(a.dispensedAt));
        return res(200, items);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PURCHASE ORDERS
    // ══════════════════════════════════════════════════════════════════════════

    // GET /pharmacy/purchase-orders
    if (method === 'GET' && path.endsWith('/purchase-orders')) {
        const result = await db.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'PURCHASE_ORDER' }
        }));
        const items = (result.Items || []).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        return res(200, items);
    }

    // POST /pharmacy/purchase-orders
    if (method === 'POST' && path.endsWith('/purchase-orders')) {
        const body  = JSON.parse(event.body || '{}');
        const actor = getActor(event);
        const now   = new Date().toISOString();

        if (!body.items || !Array.isArray(body.items) || body.items.length === 0)
            return err(400, 'items array is required and must not be empty');

        for (const item of body.items) {
            if (!item.medId)    return err(400, 'Each item must have a medId');
            if (!item.medName)  return err(400, 'Each item must have a medName');
            if (!item.quantity) return err(400, 'Each item must have a quantity');
            if (!item.unitCost) return err(400, 'Each item must have a unitCost');
        }

        const id = randomUUID();
        const poItems = body.items.map(item => ({
            ...item,
            id:        randomUUID(),
            totalCost: item.quantity * item.unitCost,
            received:  0
        }));

        const totalCost = poItems.reduce((sum, i) => sum + i.totalCost, 0);

        const po = {
            PK:           `PO#${id}`,
            SK:           'PROFILE',
            EntityType:   'PURCHASE_ORDER',
            poId:         id,
            poNumber:     `PO-${Date.now()}`,
            status:       'draft',   // draft | submitted | ordered | partially_received | received | cancelled
            supplier:     body.supplier     || null,
            notes:        body.notes        || null,
            expectedDate: body.expectedDate || null,
            items:        poItems,
            totalCost,
            currency:     body.currency || 'QAR',
            createdBy:    actor.email,
            createdByName:actor.name,
            createdAt:    now,
            updatedAt:    null,
            submittedAt:  null,
            orderedAt:    null,
            receivedAt:   null
        };

        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: po }));
        return res(201, po);
    }

    // PATCH /pharmacy/purchase-orders/{poId}
    if (method === 'PATCH' && path.includes('/purchase-orders/') && params.poId) {
        const body  = JSON.parse(event.body || '{}');
        const poId  = params.poId;
        const actor = getActor(event);
        const now   = new Date().toISOString();

        const existing = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `PO#${poId}`, SK: 'PROFILE' } }));
        if (!existing.Item) return err(404, 'Purchase order not found');
        const po = existing.Item;

        const validTransitions = {
            draft:               ['submitted','cancelled'],
            submitted:           ['ordered','cancelled'],
            ordered:             ['partially_received','received','cancelled'],
            partially_received:  ['received','cancelled']
        };

        if (body.status && body.status !== po.status) {
            const allowed = validTransitions[po.status] || [];
            if (!allowed.includes(body.status)) {
                return err(409, `Cannot transition from ${po.status} to ${body.status}`);
            }
        }

        const expParts = ['#updatedAt = :ua'];
        const names    = { '#updatedAt': 'updatedAt' };
        const values   = { ':ua': now };

        const updatable = ['status','supplier','notes','expectedDate','items','currency'];
        updatable.forEach(f => {
            if (body[f] !== undefined) {
                expParts.push(`#${f} = :${f}`);
                names[`#${f}`]  = f;
                values[`:${f}`] = body[f];
            }
        });

        // Timestamp fields per status
        if (body.status === 'submitted')          { expParts.push('#submittedAt = :sa'); names['#submittedAt'] = 'submittedAt'; values[':sa'] = now; }
        if (body.status === 'ordered')            { expParts.push('#orderedAt = :oa');   names['#orderedAt']   = 'orderedAt';   values[':oa'] = now; }
        if (body.status === 'received')           { expParts.push('#receivedAt = :ra');  names['#receivedAt']  = 'receivedAt';  values[':ra'] = now; }

        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `PO#${poId}`, SK: 'PROFILE' },
            UpdateExpression:          `SET ${expParts.join(', ')}`,
            ExpressionAttributeNames:  names,
            ExpressionAttributeValues: values
        }));

        // If status = received, auto-update inventory for each item
        if (body.status === 'received' && body.items) {
            for (const item of body.items) {
                if (!item.medId || !item.received) continue;
                const inv = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${item.medId}`, SK: 'INVENTORY' } }));
                if (!inv.Item) continue;
                const newQty = (inv.Item.stockQty || 0) + item.received;
                const adjustment = {
                    id: randomUUID(), type: 'received',
                    quantity: item.received, delta: item.received, newQty,
                    reason: `Received from PO ${po.poNumber}`,
                    batchNumber: item.batchNumber || null,
                    expiryDate:  item.expiryDate  || null,
                    actorEmail: actor.email, actorName: actor.name, timestamp: now, poId
                };
                await db.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: `MED#${item.medId}`, SK: 'INVENTORY' },
                    UpdateExpression: 'SET #qty = :qty, #lu = :lu, #adj = list_append(if_not_exists(#adj, :empty), :a), #batch = :batch, #expiry = :expiry',
                    ExpressionAttributeNames: { '#qty': 'stockQty', '#lu': 'lastUpdated', '#adj': 'adjustments', '#batch': 'batchNumber', '#expiry': 'expiryDate' },
                    ExpressionAttributeValues: { ':qty': newQty, ':lu': now, ':a': [adjustment], ':empty': [], ':batch': item.batchNumber || inv.Item.batchNumber || null, ':expiry': item.expiryDate || inv.Item.expiryDate || null }
                }));
            }
        }

        const updated = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `PO#${poId}`, SK: 'PROFILE' } }));
        return res(200, updated.Item);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ALERTS
    // ══════════════════════════════════════════════════════════════════════════

    // GET /pharmacy/alerts
    if (method === 'GET' && path.endsWith('/alerts')) {
        const invResult = await db.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'INVENTORY' }
        }));

        const alerts = [];
        for (const inv of (invResult.Items || [])) {
            const med = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MED#${inv.medId}`, SK: 'PROFILE' } }));
            const reorderPoint = med.Item?.reorderPoint || 10;
            const daysToExpiry = daysUntil(inv.expiryDate);

            if (inv.stockQty === 0) {
                alerts.push({ type: 'out_of_stock', severity: 'critical', medId: inv.medId, medName: inv.medName, stockQty: inv.stockQty, reorderPoint, message: `${inv.medName} is out of stock` });
            } else if (inv.stockQty <= reorderPoint) {
                alerts.push({ type: 'low_stock', severity: 'warning', medId: inv.medId, medName: inv.medName, stockQty: inv.stockQty, reorderPoint, message: `${inv.medName} is below reorder point (${inv.stockQty} remaining, reorder at ${reorderPoint})` });
            }

            if (daysToExpiry !== null && daysToExpiry <= 0) {
                alerts.push({ type: 'expired', severity: 'critical', medId: inv.medId, medName: inv.medName, expiryDate: inv.expiryDate, daysToExpiry, message: `${inv.medName} has expired (${inv.expiryDate})` });
            } else if (daysToExpiry !== null && daysToExpiry <= 30) {
                alerts.push({ type: 'expiring_soon', severity: 'warning', medId: inv.medId, medName: inv.medName, expiryDate: inv.expiryDate, daysToExpiry, message: `${inv.medName} expires in ${daysToExpiry} days (${inv.expiryDate})` });
            }
        }

        alerts.sort((a,b) => (a.severity === 'critical' ? -1 : 1));
        return res(200, { count: alerts.length, alerts });
    }

    return err(400, 'Unknown pharmacy route');
};