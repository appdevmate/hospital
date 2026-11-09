# Akwadona Platform — Full Test Plan

**URL:** https://d37kqu4c91mlc4.cloudfront.net  
**Test accounts:**

| Username | Password | Role |
|---|---|---|
| admin1 | Admin@1234 | Admin |
| doctor1 | Admin@1234 | Doctor |
| pharmacist1 | Admin@1234 | Pharmacist |
| developer1 | Admin@1234 | Developer |

---

## 1. Authentication

### 1.1 Login
| # | Action | Expected |
|---|---|---|
| 1 | Navigate to the app URL (e.g. `tiryaq.akwadona.com`) | Lands on the Akwadona custom Angular login page (branded, with language picker + Remember-me checkbox) — no Cognito Hosted UI redirect |
| 2 | Enter wrong password | Inline error message shown on the login form (`NotAuthorizedException` mapped to localized text) |
| 3 | Login as `admin1 / Admin@12345` | Redirected to dashboard |
| 4 | Verify topbar shows "Admin One" and `admin1@tiryaq.com` | Correct name and email shown |
| 4a | First-login user (Status `FORCE_CHANGE_PASSWORD`) | After password entry, app shows the in-app "Change Password" screen and completes the `NEW_PASSWORD_REQUIRED` challenge before routing to dashboard |
| 4b | Click "Forgot password?" → enter username → receive 6-digit code via email from `noreply@akwadona.com` → enter code + new password | Resets password, returns to login, sign-in works |

### 1.2 Logout
| # | Action | Expected |
|---|---|---|
| 5 | Click avatar → Sign Out | Tokens cleared from session/local storage, routed back to `/login` (no Hosted UI roundtrip) |
| 6 | After logout, navigate to `https://d37kqu4c91mlc4.cloudfront.net/patients-management` directly | Redirected to login — not allowed in |
| 7 | Login again | Works correctly |

---

## 2. Role-Based Access Control

### 2.1 Admin (`admin1`)
| # | Action | Expected |
|---|---|---|
| 8 | Login as admin1 | Sidebar shows: Dashboard, Calendar, Appointments, Invoices, Notifications, Patients, Pharmacy, Doctors Management, Administration |
| 9 | Navigate to `/admin-panel` | Loads correctly |
| 10 | Navigate to `/pharmacy` | Loads correctly |
| 11 | Navigate to `/patients-management` | Loads correctly |
| 12 | Navigate to `/doctors-management` | Loads correctly |

### 2.2 Doctor (`doctor1`)
| # | Action | Expected |
|---|---|---|
| 13 | Login as doctor1 | Sidebar shows: Dashboard, Calendar, Appointments, Invoices, Notifications, Patients |
| 14 | Navigate to `/patients-management` | Loads correctly |
| 15 | Navigate to `/pharmacy` directly via URL | Redirected to `/notfound` |
| 16 | Navigate to `/admin-panel` directly via URL | Loads (no roleGuard on this route — note for future fix) |

### 2.3 Pharmacist (`pharmacist1`)
| # | Action | Expected |
|---|---|---|
| 17 | Login as pharmacist1 | Sidebar shows: Dashboard, Calendar, Appointments, Invoices, Notifications |
| 18 | Navigate to `/patients-management` directly via URL | Redirected to `/notfound` |
| 19 | Navigate to `/pharmacy` directly via URL | Loads (no roleGuard on this route) |

### 2.4 Developer (`developer1`)
| # | Action | Expected |
|---|---|---|
| 20 | Login as developer1 | Sidebar shows all items including Administration and Pharmacy |
| 21 | All routes accessible | No redirects to notfound |

---

## 3. Dashboard

| # | Action | Expected |
|---|---|---|
| 22 | Login as admin1, view dashboard | Stats cards visible: Today's Appointments, Upcoming, Pending Invoices, Total Revenue |
| 23 | Stats show numeric values | Numbers load without errors |

---

## 4. Patients Management

Login as **admin1** for all patient tests.

### 4.1 View & Search
| # | Action | Expected |
|---|---|---|
| 24 | Navigate to `/patients-management` | Patient list loads |
| 25 | Use search box | Results filter in real time |
| 26 | Click a patient row | Patient profile opens at `/patient-profile/:id` |

### 4.2 Create Patient
| # | Action | Expected |
|---|---|---|
| 27 | Click "New Patient" | Create patient form opens |
| 28 | Submit with empty required fields | Validation errors shown |
| 29 | Fill all required fields and submit | Patient created, appears in list |

### 4.3 Edit Patient
| # | Action | Expected |
|---|---|---|
| 30 | Open a patient, click Edit | Edit form opens with current data |
| 31 | Change a field and save | Changes reflected in patient profile |

### 4.4 Delete / Restore Patient
| # | Action | Expected |
|---|---|---|
| 32 | Delete a patient | Patient soft-deleted (marked as deleted, not removed) |
| 33 | Enable "Show Deleted" filter | Deleted patient appears in list |
| 34 | Restore the patient | Patient restored to active |

---

## 5. Doctors Management

Login as **admin1**.

| # | Action | Expected |
|---|---|---|
| 35 | Navigate to `/doctors-management` | Doctor list loads |
| 36 | Create a new doctor | Doctor appears in list |
| 37 | Edit a doctor | Changes saved correctly |
| 38 | Delete a doctor | Doctor removed from list |

---

## 6. Examinations

Login as **doctor1**.

### 6.1 Create Examination
| # | Action | Expected |
|---|---|---|
| 39 | Open a patient profile | "New Examination" button visible |
| 40 | Click "New Examination" | Examination form opens at `/examination/:examId` |
| 41 | Save Chief Complaint with less than 3 characters | Validation error shown |
| 42 | Fill Chief Complaint correctly and save | Section saved |

### 6.2 Fill Examination Sections
| # | Action | Expected |
|---|---|---|
| 43 | Fill Vital Signs with invalid values (e.g. systolic = 500) | Validation error shown |
| 44 | Fill Vital Signs correctly | BMI auto-calculated from weight and height |
| 45 | Add a Diagnosis — no primary diagnosis | Error: at least one primary diagnosis required |
| 46 | Add a primary diagnosis with ICD code | Diagnosis saved |
| 47 | Add Prescription without diagnosis existing | Error shown |
| 48 | Add Prescription with valid fields | Prescription saved with status `ordered` |
| 49 | Add Lab Order | Lab order saved |
| 50 | Add Radiology Order | Radiology order saved |
| 51 | Add Treatment Plan with less than 10 characters | Validation error |
| 52 | Add Treatment Plan correctly | Treatment plan saved |

### 6.3 Sign Off
| # | Action | Expected |
|---|---|---|
| 53 | Click Sign Off without Chief Complaint | Error shown |
| 54 | Complete Chief Complaint and Diagnosis, then Sign Off | Examination status changes to `completed` |
| 55 | Try to edit a signed-off examination as doctor | All fields read-only |
| 56 | Try to edit a signed-off examination as admin | Admin can still edit |

### 6.4 View Examination
| # | Action | Expected |
|---|---|---|
| 57 | Navigate to `/examination/:examId/view` | Read-only view of examination details |
| 58 | All sections display correctly | No missing data |

---

## 7. Pharmacy

Login as **admin1**.

### 7.1 Catalog
| # | Action | Expected |
|---|---|---|
| 59 | Navigate to `/pharmacy` → Catalog tab | Medication list loads |
| 60 | Add a new medication | Appears in catalog |
| 61 | Edit a medication | Changes saved |
| 62 | Delete a medication | Removed from catalog |

### 7.2 Inventory
| # | Action | Expected |
|---|---|---|
| 63 | Open Inventory tab | Stock items listed with qty, expiry, low stock indicators |
| 64 | Adjust stock (add received qty) | Stock quantity updated |
| 65 | Verify `isLowStock` badge shows for items below reorder point | Badge visible |
| 66 | Verify `isExpiringSoon` badge shows for items expiring within threshold | Badge visible |

### 7.3 Prescriptions Queue
| # | Action | Expected |
|---|---|---|
| 67 | Open Prescriptions tab | Queue shows prescriptions with status `ordered` |
| 68 | If a patient has known allergies to a medication, verify allergy warning shows | Warning badge visible |
| 69 | Dispense a prescription | Status changes to `dispensed`, stock decremented |
| 70 | Dispense with allergy warning — confirm override | Override recorded, dispense completes |

### 7.4 Purchase Orders
| # | Action | Expected |
|---|---|---|
| 71 | Create a purchase order (draft) | PO created with status `draft` |
| 72 | Submit the PO | Status changes to `submitted` |
| 73 | Update PO to `received` | Status updates correctly |

### 7.5 Alerts
| # | Action | Expected |
|---|---|---|
| 74 | Open Alerts tab | Lists all critical and warning alerts |
| 75 | Out of stock items show as critical (danger) | Red badges |
| 76 | Low stock / expiring soon show as warning | Yellow badges |

---

## 8. Appointments

Login as **admin1**.

| # | Action | Expected |
|---|---|---|
| 77 | Navigate to `/appointments` | Appointment list loads |
| 78 | Create a new appointment | Appears in list |
| 79 | Edit appointment | Changes saved |
| 80 | Login as doctor1, view appointments | Only doctor1's appointments shown |

---

## 9. Calendar

| # | Action | Expected |
|---|---|---|
| 81 | Navigate to `/calendar` | Hospital calendar loads |
| 82 | Appointments appear on correct dates | Data matches appointments module |

---

## 10. Invoices

Login as **admin1**.

| # | Action | Expected |
|---|---|---|
| 83 | Navigate to `/invoices` | Invoice list loads |
| 84 | Create a payment for a patient | Payment saved, appears in invoices |
| 85 | Edit a payment | Changes saved |
| 86 | Delete a payment | Removed from list |

---

## 11. Notifications

### 11.1 Admin (`admin1`)
| # | Action | Expected |
|---|---|---|
| 87 | Navigate to `/notifications` | Shows: Today's appointments, Tomorrow's appointments, Critical patients, Critical pharmacy alerts, Pharmacy warnings, Pending prescriptions, Pending exam sign-offs |
| 88 | Bell icon in topbar shows count badge | Count matches number of active notifications |
| 89 | Click a notification card arrow | Navigates to the correct module |

### 11.2 Doctor (`doctor1`)
| # | Action | Expected |
|---|---|---|
| 90 | Navigate to `/notifications` | Shows: Today's own appointments, Tomorrow's own appointments, Critical patients (own patients only), Pending exam sign-offs (own only) |
| 91 | Pharmacy alerts NOT shown | No pharmacy section visible |

### 11.3 Pharmacist (`pharmacist1`)
| # | Action | Expected |
|---|---|---|
| 92 | Navigate to `/notifications` | Shows: Critical pharmacy alerts, Pharmacy warnings, Pending prescriptions |
| 93 | Appointment notifications NOT shown | No appointments section visible |
| 94 | Critical patients NOT shown | No critical patients section visible |

---

## 12. Documents

| # | Action | Expected |
|---|---|---|
| 95 | Navigate to `/documents` | Document list loads |
| 96 | Upload a document | Document appears in list |
| 97 | Download / view a document via pre-signed URL | File opens correctly |
| 98 | Delete a document | Removed from list |

---

## 13. Admin Panel

Login as **admin1**.

### 13.1 Stats
| # | Action | Expected |
|---|---|---|
| 99 | Navigate to `/admin-panel` → Stats tab | Platform statistics load (total patients, doctors, appointments, revenue) |

### 13.2 User Management
| # | Action | Expected |
|---|---|---|
| 100 | Open Users tab | All Cognito users listed |
| 101 | Disable a user | User status changes to disabled |
| 102 | Enable the user again | User status restored |
| 103 | Reset a user's password | Success message shown |

### 13.3 Audit Log
| # | Action | Expected |
|---|---|---|
| 104 | Open Audit tab | Audit log entries shown with action, entity, actor, timestamp |
| 105 | Perform a patient create, then check audit log | New CREATE entry appears |

---

## 14. User Profile

| # | Action | Expected |
|---|---|---|
| 106 | Navigate to `/user-profile` | Profile page loads with logged-in user's name and email |
| 107 | Click "Profile" from topbar dropdown | Navigates to `/user-profile` |

---

## 15. Edge Cases

| # | Action | Expected |
|---|---|---|
| 108 | Navigate to `/notfound` directly | Custom not found page shown |
| 109 | Navigate to a completely unknown URL e.g. `/xyz` | Redirected to `/notfound` |
| 110 | Let the session expire (after 1 hour), try an API call | Redirected to login |
| 111 | Open the app in two browser tabs, sign out in one | Other tab redirects to login on next API call |
| 112 | Refresh the page while logged in | Session restored, user stays on same page |

---

## 16. Summary Checklist

| Module | Admin | Doctor | Pharmacist | Developer |
|---|:---:|:---:|:---:|:---:|
| Login / Logout | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Patients Management | ✅ | ✅ | ❌ | ✅ |
| Doctors Management | ✅ | ❌ | ❌ | ✅ |
| Examinations | ✅ | ✅ | ❌ | ✅ |
| Pharmacy | ✅ | ❌ | ✅ | ✅ |
| Appointments | ✅ | ✅ (own) | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ (all) | ✅ (scoped) | ✅ (pharmacy) | ✅ (all) |
| Documents | ✅ | ✅ | ✅ | ✅ |
| Admin Panel | ✅ | ❌ | ❌ | ✅ |
| User Profile | ✅ | ✅ | ✅ | ✅ |
