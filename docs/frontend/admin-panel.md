# Admin Panel Module — Technical Documentation

**Document version:** 2.0
**Date:** 2026-05-25
**Scope:** Frontend (Angular) + the `tiryaq-admin-panel` Lambda contract it consumes.

> **What changed in 2.0:** Re-derived from `admin-panel.service.ts` and `tiryaq-admin-panel/index.js`. The current Lambda exposes **six** routes: stats, users, disable, enable, **set-password** (not "reset-password"), and audit. The previously-documented `/admin/gdpr/*` routes and the password-reset-email route are **not in the code** and have been removed. Hardcoded API base / user-pool IDs were removed in favour of config + environment.

---

## 1. Architecture

| Component | Detail |
|-----------|--------|
| Lambda | `tiryaq-admin-panel` — Node.js 20.x |
| API base | `src/app/services/config.ts` (`Config.buildUrl(...)`) |
| Database | DynamoDB `Hospital` table |
| Cognito | User pool from `USER_POOL_ID` env (set by CDK) |
| Auth | AWS SDK v3 `@aws-sdk/client-cognito-identity-provider` |
| Access | **Admin + Developers groups only** |

---

## 2. Access control

- **Lambda:** every route checks `isAdmin(event)` (matches `Admin`/`admin`/`Developer`/`Developers`) and returns `403 'Access denied: admin only'` otherwise.
- **Route guard:** `app.routes.ts` → `{ path: 'admin-panel', canActivate: [roleGuard(ADMIN_ROLES)], component: AdminPanelComponent }`, `ADMIN_ROLES = ['admin', 'developer']`.
- **Menu:** the **Administration** item appears only for Admin and Developer.

---

## 3. API routes (consumed by `admin-panel.service.ts`)

All routes require `Authorization: Bearer <jwt>`.

| Method | Route | Service method | Description |
|--------|-------|----------------|-------------|
| GET | `/admin/stats` | `getStats()` | System counts |
| GET | `/admin/users` | `getUsers(filter?, nextToken?)` | Cognito users + groups (paginated) |
| POST | `/admin/users/{username}/disable` | `disableUser()` | Disable a user |
| POST | `/admin/users/{username}/enable` | `enableUser()` | Enable a user |
| POST | `/admin/users/{username}/set-password` | `setPassword(username, password)` | Set a **temporary** password (user must change at next login) |
| GET | `/admin/audit` | `getAuditLog({...})` | Query the audit log |

### GET /admin/stats

```json
{ "totalPatients": 142, "totalDoctors": 18, "totalExams": 310, "totalInvoices": 275 }
```

Patients/doctors come from `COUNTER#PATIENTS` / `COUNTER#DOCTORS`; exams/invoices are counted via `EntityType-index`.

### GET /admin/users

Query params: `limit` (default 60), `nextToken`, `filter` (Cognito filter e.g. `email ^= "omar"`).

```json
{
  "users": [
    {
      "username": "doctor1", "email": "doctor1@tiryaq.com", "name": "Doctor One",
      "sub": "…", "status": "CONFIRMED", "enabled": true,
      "created": "2026-01-15T08:00:00.000Z", "modified": "…", "groups": ["Doctors"]
    }
  ],
  "nextToken": null
}
```

Group membership is computed by checking all four groups (`Admin`, `Developers`, `Doctors`, `Pharmacists`).

### POST /admin/users/{username}/set-password

Body `{ "password": "<min 8 chars>" }`. Calls `AdminSetUserPassword` with `Permanent: false`, so Cognito flags the account to change the password on next login.

```json
{ "message": "Temporary password set for doctor1. User must change it on next login." }
```

> There is **no** "send password reset email" route in the current Lambda. To rotate a password, an admin sets a temporary one here.

### GET /admin/audit

Query params: `date` (default today, `YYYY-MM-DD`), `entityType`, `entityId`, `action`, `actor`, `limit` (default 100). Queries `PK = AUDIT#<date>`, `SK begins_with AUDIT#`, newest first.

```json
{ "date": "2026-05-25", "count": 5, "items": [ /* audit rows */ ] }
```

---

## 4. Audit record schema (read-only here)

Audit rows are written by the feature Lambdas (appointments, examinations, etc.) on mutating actions; the Admin Panel only reads them.

| Attribute | Value |
|-----------|-------|
| `PK` | `AUDIT#YYYY-MM-DD` |
| `SK` | `AUDIT#<ISO timestamp>#<uuid>` |
| `EntityType` | `AUDIT` |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `SIGNOFF`, … |
| `entityType` | affected entity, e.g. `APPOINTMENT`, `EXAMINATION`, `PATIENT` |
| `entityId` | UUID of the affected record |
| `actorEmail` / `actorName` | who performed the action |
| `ipAddress` | source IP (where captured) |
| `timestamp` | ISO 8601 |
| `before` / `after` | JSON snapshots (string) |

The Angular `AuditItem` interface also includes `changeSummary` for display where present.

---

## 5. Frontend

| File | Location |
|------|----------|
| Component | `src/app/components/admin-panel/admin-panel.ts` |
| Template | `src/app/components/admin-panel/admin-panel.html` |
| Styles | `src/app/components/admin-panel/admin-panel.scss` |
| Service | `src/app/services/admin-panel.service.ts` |

### Tabs

| Tab | Content |
|-----|---------|
| Overview | 4 stat cards: patients, doctors, exams, invoices |
| User Management | Cognito user table with enable / disable / set-temporary-password |
| Audit Log | Filterable by date, entity type, action, actor email |

> Patient data lifecycle (soft-delete / restore) is handled in the **Patients** module via `DELETE /patients/{id}` (soft delete) and `PATCH /patients/{id}/restore`, not through admin-panel routes.

### Role check

```typescript
get isAdmin(): boolean { return this.current.role === 'admin'; }
get isDeveloper(): boolean { return this.current.role === 'developer'; }
```

The route guard uses `ADMIN_ROLES = ['admin', 'developer']`.

---

## 6. IAM policy (granted by CDK)

The `tiryaq-admin-panel` execution role is granted, scoped to the user pool ARN:

```
cognito-idp:ListUsers
cognito-idp:ListUsersInGroup
cognito-idp:AdminDisableUser
cognito-idp:AdminEnableUser
cognito-idp:AdminSetUserPassword
```

plus read/write on the `Hospital` table and Encrypt/Decrypt on the data CMK (shared grant).

---

## 7. Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | — | Initial admin panel documentation |
| 2.0 | 2026-05-25 | Matched to code: removed non-existent GDPR + reset-password routes; `set-password` documented; config/env instead of hardcoded IDs; corrected service path, route guard, IAM actions |
