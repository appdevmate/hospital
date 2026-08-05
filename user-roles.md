# Akwadona Platform — User Roles & Permissions

## Overview

The platform has 5 active roles. Each role is assigned in **AWS Cognito** via user groups. When a user logs in, their group membership is read from the Access Token and mapped to a role in the app.

| Cognito Group | App Role | Scope |
|---|---|---|
| `Operator` | `operator` | Akwadona platform staff. Lives at `www.akwadona.com/operator`. Sees tenant subscriptions / usage / audit metadata. **Cannot decrypt any tenant's PHI** (KMS key policies explicitly exclude `AkwadonaCdkStack-*Operator*` ARNs). JWT carries `tenantId=OPERATOR`. |
| `Admin` | `admin` | Tenant administrator (per hospital). Manages users, departments, billing within that tenant. |
| `Developers` | `developer` | Tenant-scope developer / power user. |
| `Doctors` | `doctor` | Tenant-scope clinician. |
| `Pharmacists` | `pharmacist` | Tenant-scope pharmacy staff. |
| — | `unknown` (no group assigned) | Lands on the dashboard with no module access. Used as a guardrail. |

---

## Role: Admin

**Cognito Group:** `Admin`  
**Test users:** `admin1`, `admin2`

### Sidebar Menu Access
- Dashboard
- Calendar
- Appointments
- Invoices
- Notifications
- Patients Management
- Pharmacy
- Doctors Management
- Administration

### What they can do
- Full access to all modules
- Manage patients — create, view, edit, soft-delete, restore, hard delete
- Manage doctors — create, view, edit, delete
- View and manage all invoices and payments
- Access the pharmacy — catalog, inventory, prescriptions, purchase orders, alerts
- Access the administration panel:
  - View platform statistics
  - View and manage all Cognito users (enable/disable, reset passwords)
  - View the full audit log
- View and manage appointments
- View notifications

---

## Role: Doctor

**Cognito Group:** `Doctors`  
**Test users:** `doctor1`, `doctor2`

### Sidebar Menu Access
- Dashboard
- Calendar
- Appointments
- Invoices
- Notifications
- Patients

### What they can do
- View the dashboard
- View and manage their own appointments
- View the calendar
- View invoices
- View and manage patients:
  - View patient profiles
  - Create and manage examinations for their patients
  - Write prescriptions within examinations
  - Sign off on completed examinations
- View notifications (including pharmacy alerts for their prescriptions)

### What they cannot do
- Access the Pharmacy module directly
- Access Doctors Management
- Access the Administration panel

---

## Role: Pharmacist

**Cognito Group:** `Pharmacists`  
**Test users:** `pharmacist1`, `pharmacist2`

### Sidebar Menu Access
- Dashboard
- Calendar
- Appointments
- Invoices
- Notifications

> ⚠️ The Pharmacy module is not currently in the pharmacist's sidebar menu. Access is handled differently — pharmacists work within the Pharmacy module but the menu item is currently shown only to Admins and Developers. This can be added to the sidebar by adding a pharmacy menu item to the `else` branch in `app.menu.ts`.

### What they can do
- View the dashboard
- View the calendar and appointments
- View invoices
- View notifications
- Dispense prescriptions (when granted access to the pharmacy route)

### What they cannot do
- Access Patients Management
- Access Doctors Management
- Access the Administration panel

---

## Role: Developer

**Cognito Group:** `Developers`  
**Test users:** `developer1`, `developer2`

### Sidebar Menu Access
- Dashboard
- Calendar
- Appointments
- Invoices
- Notifications
- Pharmacy
- Patients Management
- Doctors Management
- Administration

### What they can do
- Full access to everything — same as Admin
- Intended for development and testing purposes only
- Should not be used in production for real users

---

## Role: Unknown

**Cognito Group:** None assigned

### What they can do
- Dashboard
- Calendar
- Appointments
- Invoices
- Notifications

This is the fallback for any user who is authenticated but has no Cognito group assigned. They get the minimum shared menu only.

---

## Route Guard

Routes are protected by `roleGuard()` in `src/app/guards/role.guard.ts`. Each route specifies which roles are allowed:

```typescript
// Example usage in routes
{
  path: 'admin-panel',
  canActivate: [roleGuard(['admin', 'developer'])]
}
```

If a user tries to access a route their role is not allowed for, they are redirected to `/notfound`.

---

## Summary Table

| Feature | Admin | Doctor | Pharmacist | Developer | Unknown |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ |
| Appointments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patients Management | ✅ | ✅ | ❌ | ✅ | ❌ |
| Examinations | ✅ | ✅ | ❌ | ✅ | ❌ |
| Pharmacy | ✅ | ❌ | ⚠️ | ✅ | ❌ |
| Doctors Management | ✅ | ❌ | ❌ | ✅ | ❌ |
| Administration Panel | ✅ | ❌ | ❌ | ✅ | ❌ |

> ⚠️ Pharmacist access to the Pharmacy module requires adding the route to their sidebar menu in `app.menu.ts`.
