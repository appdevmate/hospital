# 19 — UI Architecture

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** Engineers writing or reviewing frontend code.
> **Read first:** [`00-akwadona-explained.md`](00-akwadona-explained.md).

## 1. TL;DR
- Angular 20 standalone + PrimeNG + Tailwind + ngx-translate + Angular Service Worker (PWA).
- Custom Angular login replaces Cognito Hosted UI; branded auth domain `auth.akwadona.com`.
- Offline-first: IndexedDB queue drains on reconnect.
- Tenant resolved from subdomain + JWT; mismatch → forced redirect.

## 2. What this is

**What it is** — the Angular 20 single-page application served from CloudFront at `*.akwadona.com`.

**Why it exists** — doctors and administrators use a browser; the UI is where every clinical workflow starts.

**Real-life example** — a doctor at Tiryaq Hospital types `tiryaq.akwadona.com`, sees an Arabic login, enters their password, and lands on their dashboard. If their WiFi drops mid-visit, writes queue locally and sync when it's back.

**How Akwadona uses it** — one Angular app binary (`dist/verona-ng/browser/`) serves every tenant subdomain. Branding + tenant data is resolved at runtime from the subdomain + JWT claim.

## 3. Technology stack

| Layer | Choice | File / version |
|---|---|---|
| Framework | Angular 20 (standalone components, signals, `@if`/`@for`) | `package.json` → `@angular/core@^20` |
| UI kit | PrimeNG 20 + Tailwind CSS v4 (via PostCSS) | `tailwind.config.js`, `src/assets/styles.scss` |
| Theme | PrimeUIX Aura preset | `src/app.config.ts` → `providePrimeNG` |
| Icons | PrimeIcons | `src/assets/styles.scss` |
| Charts | Chart.js | `package.json` |
| Calendar | FullCalendar 6 (daygrid + timegrid + interaction) | `src/app/components/hospital-calendar/` |
| Rich text | Quill 2 | `package.json` |
| Spreadsheet export | SheetJS (xlsx) | `package.json` |
| Auth | angular-auth-oidc-client v19 | `src/app.config.ts` → `provideAuth` |
| i18n | ngx-translate v16+ | `src/app.config.ts` → `TranslateModule.forRoot` |
| PWA | Angular Service Worker (`ngsw-worker.js`) | `src/app.config.ts` → `provideServiceWorker` + `ngsw-config.json` |

## 4. Routing (`src/app.routes.ts`)

All authenticated routes are children of `AppLayout` under `canActivate: [authGuard]`.

### 4.1 Role sets
```ts
const PATIENTS_ROLES  = ['admin', 'developer', 'doctor'];
const ADMIN_ROLES     = ['admin', 'developer'];
const PHARMACY_ROLES  = ['pharmacist'];
const SCRIBE_ROLES    = ['developer', 'doctor'];
const DOCS_ROLES      = ['admin', 'developer', 'doctor'];
const BLOODBANK_ROLES = ['admin', 'developer', 'doctor', 'pharmacist'];
```

### 4.2 Route table

See [`20-api-reference.md`](20-api-reference.md) §5 for the full matching table of frontend route → backend endpoint.

| Path | Guard | Component (lazy) |
|---|---|---|
| `/` | authGuard | dashboard |
| `/doctors-management` | authGuard + roleGuard(ADMIN) | Doctors Management |
| `/patients-management` | authGuard + roleGuard(PATIENTS) | Patients Management |
| `/patient-profile/:id` | authGuard + roleGuard(PATIENTS) | PatientProfile |
| `/consultation/:consultationId` | authGuard + roleGuard(PATIENTS) | ConsultationForm |
| `/consultation/:consultationId/view` | authGuard + roleGuard(PATIENTS) | ConsultationDetail |
| `/pharmacy` | authGuard + roleGuard(PHARMACY) | Pharmacy |
| `/blood-bank` | authGuard + roleGuard(BLOODBANK) | BloodBank |
| `/voice-scribe` | authGuard + roleGuard(SCRIBE) | VoiceScribe |
| `/admin-panel` | authGuard + roleGuard(ADMIN) | AdminPanel |
| `/documents` | authGuard + roleGuard(DOCS) | DocumentManager |
| `/calendar` | authGuard | HospitalCalendar |
| `/appointments` | authGuard | Appointments |
| `/invoices` | authGuard | Invoices |
| `/notifications` | authGuard | Notifications |
| `/user-profile` | authGuard | UserProfile |
| `/operator` | authGuard + operatorGuard | OperatorConsole |
| `/operator/onboard` | authGuard + operatorGuard | TenantOnboardingWizard |

Breadcrumbs use translation keys (`'pages.doctors.title'`), not literal English — resolved by ngx-translate so they switch on language change.

## 5. Services (`src/app/services/`)

| Service | Responsibility |
|---|---|
| `auth.service.ts` | Reads `cognito:groups`, `role`, `tenantId`, `doctorId` from access token. Exposes `UserRole` and `CurrentUser`. |
| `tenant.service.ts` | Resolves tenant from subdomain + JWT; detects mismatches. |
| `cognito-auth.service.ts` | Custom Cognito calls for the new login page (sign-in, forgot password, reset). |
| `operator.service.ts` | API client for `/operator/*` endpoints. |
| `patients.service.ts`, `doctors.service.ts`, `appointments.service.ts`, `consultation.service.ts`, `pharmacy.service.ts`, `bloodbank.service.ts`, `payments.service.ts`, `admin-panel.service.ts`, `document.service.ts`, `notifications.service.ts`, `hospital-calendar.service.ts`, `scribe.service.ts` | Per-domain API clients. |
| `cache.service.ts` | In-memory + localStorage cache for lookup data (departments, specializations). |
| `offline.service.ts` + `offline-db.ts` | Offline state + IndexedDB queue (writes queued when offline, drained on reconnect). |
| `refresh-scheduler.service.ts` | Background OIDC token refresh scheduling. |
| `i18n.service.ts` | Language switch + persistence; subscribes to ngx-translate. |
| `config.ts` | Single-source `apiBaseUrl`. |
| `helpers-service.ts` | Toast notifications, login redirect, utility formatters. |
| `icon.service.ts` | Icon registry + lookup. |

## 6. Guards + interceptors

### Guards
- `auth.guard.ts` — redirects to Cognito login if no valid session. Calls `OidcSecurityService.checkAuth()`.
- `role.guard.ts` — `roleGuard(allowedRoles: UserRole[])` factory. Returns 404 route tree on mismatch.
- `operator.guard.ts` — allows only JWT `role === 'operator'`.

### Interceptors (`src/app.config.ts` → `withInterceptors([offlineQueueInterceptor, authInterceptor])`)

Order matters:
1. **`offlineQueueInterceptor`** — intercepts mutating requests (POST/PATCH/DELETE). If `navigator.onLine === false`, enqueues the request body + URL in IndexedDB and returns a stub response. Drains on `window.ononline`.
2. **`authInterceptor`** — only for same-origin requests. Catches 401 → saves `returnUrl` → `oidc.authorize()` → sign-in redirect.

Both skip cross-origin requests to Cognito / Bedrock / SES endpoints.

## 7. State management

Signals-based (`signal()`, `computed()`, `effect()`), no RxJS `BehaviorSubject` proliferation. Example from a recent component:

```ts
export class VoiceScribeComponent {
  consentGiven = signal(false);
  sessionId = signal<string | null>(null);
  status = signal<Status>('idle');
  isRecording = computed(() => this.status() === 'recording');
}
```

Change-detection strategy: `OnPush` on all new components. Call `cdr.markForCheck()` from async callbacks.

## 8. PWA / offline

### 8.1 Service worker
`provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` in `src/app.config.ts`.

- Enabled only in production builds (avoids dev-mode flakiness).
- Registers 30 s after app becomes stable so it doesn't compete with initial render.
- Caches app shell (HTML, JS, CSS, fonts, images) per `ngsw-config.json`.

### 8.2 Offline write queue
`offline-db.ts` wraps IndexedDB; `offline.service.ts` exposes `isOnline()`, `queueSize()`, `drain()`.

Flow:
1. `offlineQueueInterceptor` sees POST/PATCH/DELETE and `navigator.onLine === false`.
2. Writes `{ url, method, body, headers, tsEnqueued }` to IndexedDB.
3. Returns a `201 Accepted` stub to the component (UI shows "queued" badge).
4. `window.addEventListener('online', drain)` → replays requests oldest-first.
5. Audit: every drained request writes a client-side audit entry for the server to reconcile.

## 9. i18n (see [`13-i18n.md`](13-i18n.md))

- Loader: `TranslateHttpLoader` fetches `/i18n/{lang}.json` from `public/i18n/*.json`.
- Default: `en`.
- Supported: English, Arabic, French, Spanish, Hindi, Urdu (6 languages per the "translate across 6 languages" commit).
- RTL support: `dir="rtl"` toggled when `lang` ∈ `['ar', 'ur']`.
- Flag emojis removed — avoided ambiguity across jurisdictions (per `cfe25cb` commit).

## 10. Auth architecture (see [`21-authentication-flow.md`](21-authentication-flow.md))

- Custom Angular `/login` page replaces Cognito Hosted UI (Phase 1 Arabic + Phase 4 polish).
- OIDC authority = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_bpipvSdQi` (JWT issuer).
- OAuth endpoints overridden to `https://auth.akwadona.com/oauth2/*` (branded URL bar — Stripe/Vercel pattern).
- `skipUserInfo` + `renewUserInfoAfterTokenRenew: false` — JWT carries everything, no round-trip.
- "Remember me" + silent refresh + language toggle on forgot-password page.

## 11. Build + bundling

- `ng build --configuration production` outputs to `dist/verona-ng/browser/`.
- Hashed chunk names (`chunk-ABCD.js`).
- Lazy routes → separate chunks (loaded on navigation).
- Budgets: initial 1 MB warning / 5 MB error; component style 2 KB warning / 8 KB error (`angular.json`).
- No preload strategy by default — pay the lazy-chunk download only when the user navigates.

## 12. Styling

- Tailwind v4 via `@tailwindcss/postcss` (not CLI). Config in `tailwind.config.js`.
- PrimeNG Aura preset provides the base theme (colors, spacing, shadows).
- Component-scoped SCSS in `.scss` siblings.
- Dark mode: `.app-dark` class on body toggles the preset.

## 13. Testing

- Karma + Jasmine for unit tests (template exists, under-used — see [`43-testing-strategy.md`](43-testing-strategy.md)).
- Manual E2E via `test-plan.md` / `test-plan-v2.md`.
- No Cypress / Playwright yet.

## 14. Known foot-guns

- `.angular/cache` must be cleared before production builds (Tailwind-v4 cache issue — see [`18-deploy-and-operations.md`](18-deploy-and-operations.md) §10.4).
- Breadcrumb strings must be translation keys, not literals, or they won't translate on language switch.
- Service worker + CloudFront caching combine confusingly during a deploy — hard-refresh (Ctrl+Shift+R) after every invalidation.
- OIDC library will loop-redirect if `authGuard` runs before `checkAuth()` resolves — current fix is in-guard await.
- `offlineQueueInterceptor` must run BEFORE `authInterceptor` (order in `provideHttpClient([a, b])`); flipping breaks offline writes.

## 15. Open questions / future work

- Patient portal (currently no `patient` role route gating).
- Push notifications via `ServiceWorkerRegistration.showNotification`.
- Bidirectional offline sync with conflict resolution (currently last-write-wins).
- Native app wrapper (Capacitor) if hospitals ask for a mobile icon.

## 16. References

- `src/app.config.ts`, `src/app.routes.ts`, `src/app/services/*`, `src/app/guards/*`, `src/app/interceptors/*`
- [`13-i18n.md`](13-i18n.md)
- [`20-api-reference.md`](20-api-reference.md)
- [`21-authentication-flow.md`](21-authentication-flow.md)
- `../skills/akwadona-code-standards/SKILL.md`
