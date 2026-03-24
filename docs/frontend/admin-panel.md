# Admin Panel Module — Technical Documentation

## Overview

The Admin Panel is a restricted module accessible only to users in the **Admin** or **Developers** Cognito groups. It provides system administration tools including user management, audit log browsing, system statistics, and GDPR data tools.

---

## 1. Architecture

| Component | Detail |
|-----------|--------|
| Lambda | `tiryaq-admin-panel` — Node.js 20.x |
| API Base | `https://xy829e3qw2.execute-api.us-east-1.amazonaws.com` |
| Database | DynamoDB — `Hospital` table |
| Cognito | User Pool `us-east-1_K2smcI5zB` |
| Auth | AWS SDK v3 `@aws-sdk/client-cognito-identity-provider` |
| Access | Admin + Developers groups only |

---

## 2. API Routes

All routes require a valid Cognito JWT token in the `Authorization: Bearer <token>` header. All routes return 403 if the user is not in the Admin or Developers group.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/stats` | System statistics from DynamoDB |
| GET | `/admin/users` | List all Cognito users with group membership |
| POST | `/admin/users/{username}/disable` | Disable a Cognito user account |
| POST | `/admin/users/{username}/enable` | Enable a Cognito user account |
| POST | `/admin/users/{username}/reset-password` | Send password reset email |
| GET | `/admin/audit` | Query the audit log |
| GET | `/admin/gdpr/export` | Export all data for a patient |
| POST | `/admin/gdpr/soft-delete` | Mark a patient as GDPR deleted |
| POST | `/admin/gdpr/restore` | Restore a GDPR deleted patient |

---

## 3. Route Details

### GET /admin/stats

Returns total counts for the system.

**Response:**
```json
{
  "totalPatients": 142,
  "totalDoctors": 18,
  "totalExams": 310,
  "totalInvoices": 275
}
```

Patients and doctors are read from DynamoDB counter records (`COUNTER#PATIENTS` and `COUNTER#DOCTORS`). Exams and invoices are counted via the `EntityType-index` GSI.

---

### GET /admin/users

Lists all users in the Cognito User Pool with their group membership.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max users to return (default 60) |
| `nextToken` | string | Pagination token from previous response |
| `filter` | string | Cognito filter expression e.g. `email ^= "omar"` |

**Response:**
```json
{
  "users": [
    {
      "username": "khalil",
      "email": "khalil@tiryaq.com",
      "name": "Khalil Hassan",
      "status": "CONFIRMED",
      "enabled": true,
      "created": "2026-01-15T08:00:00.000Z",
      "groups": ["Developers"]
    }
  ],
  "nextToken": null
}
```

Group membership is fetched by checking all four groups: `Admin`, `Developers`, `Doctors`, `Pharmacists`.

---

### POST /admin/users/{username}/disable

Disables the user — they will not be able to log in until re-enabled.

**Response:**
```json
{ "message": "User khalil disabled successfully" }
```

---

### POST /admin/users/{username}/enable

Re-enables a disabled user.

**Response:**
```json
{ "message": "User khalil enabled successfully" }
```

---

### POST /admin/users/{username}/reset-password

Triggers Cognito to send a password reset email to the user.

**Response:**
```json
{ "message": "Password reset email sent to khalil" }
```

---

### GET /admin/audit

Queries the audit log for a specific date with optional filters.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Date in `YYYY-MM-DD` format (defaults to today) |
| `entityType` | string | Filter by entity: `EXAMINATION`, `PATIENT`, `DOCTOR`, `PAYMENT` |
| `entityId` | string | Filter by specific record UUID |
| `action` | string | Filter by action: `CREATE`, `UPDATE`, `DELETE`, `SIGNOFF`, `VIEW` |
| `actor` | string | Filter by actor email |
| `limit` | number | Max records to return (default 100) |

**Response:**
```json
{
  "date": "2026-03-24",
  "count": 5,
  "items": [
    {
      "action": "SIGNOFF",
      "entityType": "EXAMINATION",
      "entityId": "abc-123",
      "actorEmail": "omar@tiryaq.com",
      "actorName": "Omar Rashidi",
      "timestamp": "2026-03-24T09:15:00.000Z",
      "changeSummary": "Examination signed off"
    }
  ]
}
```

Audit records are stored in DynamoDB with `PK = AUDIT#YYYY-MM-DD` and `SK = AUDIT#<timestamp>#<uuid>`.

---

### GET /admin/gdpr/export?patientId={id}

Exports all data for a patient as a JSON response. The Angular frontend converts this to a multi-sheet Excel file using the `xlsx` library.

**Response:**
```json
{
  "exportedAt": "2026-03-24T11:00:00.000Z",
  "patientId": "uuid-here",
  "patient": { "...patient record..." },
  "exams": [ "...examination records..." ],
  "invoices": [ "...invoice records..." ]
}
```

---

### POST /admin/gdpr/soft-delete

Marks a patient as GDPR deleted by setting `gdprDeleted: true` on their DynamoDB record. The patient data is **not physically deleted** — it is hidden from all normal views. This can be reversed.

**Request body:**
```json
{ "patientId": "uuid-here" }
```

**Response:**
```json
{ "message": "Patient marked as GDPR deleted", "patientId": "uuid-here" }
```

---

### POST /admin/gdpr/restore

Removes the `gdprDeleted` flag, making the patient visible again in all views.

**Request body:**
```json
{ "patientId": "uuid-here" }
```

---

## 4. DynamoDB — Audit Record Schema

Audit records are written automatically by the `examinations.js` Lambda on every clinical action. The Admin Panel only reads them.

| Attribute | Value |
|-----------|-------|
| `PK` | `AUDIT#YYYY-MM-DD` |
| `SK` | `AUDIT#<ISO timestamp>#<uuid>` |
| `EntityType` | `AUDIT` |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `SIGNOFF`, or `VIEW` |
| `entityType` | The type of record affected, e.g. `EXAMINATION` |
| `entityId` | UUID of the affected record |
| `actorEmail` | Email of the user who performed the action |
| `actorName` | Name of the user |
| `timestamp` | ISO 8601 timestamp |
| `changeSummary` | Plain text description of what changed |
| `before` | JSON snapshot before the change (null for CREATE) |
| `after` | JSON snapshot after the change (null for DELETE) |

---

## 5. Frontend

### Files

| File | Location |
|------|----------|
| `admin-panel.ts` | `src/app/components/admin-panel/admin-panel.ts` |
| `admin-panel.html` | `src/app/components/admin-panel/admin-panel.html` |
| `admin-panel.scss` | `src/app/components/admin-panel/admin-panel.scss` |
| `admin-panel.service.ts` | `src/app/pages/service/admin-panel.service.ts` |

### Route

```typescript
{ path: 'admin-panel', component: AdminPanelComponent }
```

### Menu

Visible only to Admin and Developers roles under the **Administration** section in `app.menu.ts`.

### Tabs

| Tab | Content |
|-----|---------|
| Overview | 4 stat cards: total patients, doctors, exams, invoices |
| User Management | Table of all Cognito users with enable/disable/reset actions |
| Audit Log | Filterable table by date, entity type, action, actor email |
| GDPR Tools | Patient search → Excel export → soft delete → restore |

### Role Check

```typescript
get isAdmin(): boolean {
    return this.current.role === 'developer' || this.current.role === 'admin';
}
```

The menu item and route are only accessible if `auth.isAdmin` returns true.

---

## 6. IAM Policy Required

The Lambda execution role must have the following inline policy attached:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:ListUsersInGroup",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminResetUserPassword"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:075134876036:userpool/us-east-1_K2smcI5zB"
    }
  ]
}
```

---

## 7. Known Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'aws-sdk'` | Node.js 20+ does not include SDK v2 | Switched to SDK v3 `@aws-sdk/client-cognito-identity-provider` |
| `Illegal return statement` | Lambda runtime was Node.js 24 with `.mjs` file extension forcing ES modules | Changed runtime to Node.js 20.x and file to `.js` |
| `User pool does not exist` | User Pool ID was lowercase `us-east-1_k2smci5zb` | Corrected to `us-east-1_K2smcI5zB` (case sensitive) |
| `Access denied: admin only` | Cognito group `Developers` (with capital D and s) not matched | Added `Developers` to the allowed groups array in `isAdmin()` |
| `cognito:groups` arrives as `"[Developers]"` string | API Gateway JWT authorizer serializes groups with square brackets | Strip `[` and `]` before splitting the string |