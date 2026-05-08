# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Dev server at http://localhost:4200 (polls every 2s, binds 0.0.0.0)
npm build        # Production build → dist/verona-ng
npm watch        # Development build with watch mode
npm test         # Karma + Jasmine test runner
npm run format   # Prettier format (JS, TS, HTML)
```

## Architecture Overview

Angular 20 standalone-component hospital management system (Clinify) with role-based access for **admin**, **doctor**, and **patient** roles.

### Entry Points

- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`
- `src/app/app.config.ts` — providers: HttpClient, router, auth OIDC, interceptors
- `src/app/app.routes.ts` — all routes, lazy-loaded under `AppLayout` (protected by `authGuard`)

### Path Alias

`@/*` maps to `src/app/*` (configured in `tsconfig.json`).

### Authentication

AWS Cognito via `angular-auth-oidc-client`. The `authGuard` checks authentication on all protected routes. `authInterceptor` attaches Bearer tokens to same-origin requests and handles 401s. Role is parsed from Cognito groups + `localStorage` by `AuthService`, yielding `'admin' | 'doctor' | 'patient' | 'unknown'`.

### API & Services

API endpoints are hardcoded in `src/app/pages/service/config.ts` (no environment files). Core services live in `src/app/pages/service/`:

- `DoctorsService`, `PatientsService`, `AppointmentsService`, `PaymentsService`, `HospitalCalendarService`, `NotificationsService`

Pagination uses cursor-based `lastKey + pageSize` (not offset). Filtering uses `FilterOption { value, matchMode, operator }`.

### State Management

No NgRx. State flows through service `Observable`s into component Angular Signals (`signal()`, `computed()`, `effect()`). `LayoutService` owns global UI state: menu mode (slim/overlay/static/horizontal), dark theme, sidebar, and open-tab list.

### Component Conventions

- All components are **standalone** (no NgModules).
- Use `OnPush` change detection where present.
- Template control flow uses `@for` / `@if` (Angular 20 syntax, not `*ngFor`/`*ngIf`).
- `PrimeNG v20` components throughout (Table, Dialog, Button, Tag, Toast, Skeleton, etc.).

### Layout

`AppLayout` wraps all authenticated pages and contains `AppTopbar`, `AppSidebar`, `AppBreadcrumb`, and `AppFooter`. Breadcrumb labels come from route `data: { breadcrumb: 'Label' }`.

### Styling

Tailwind CSS v4 (PostCSS) + PrimeNG Aura theme (`@primeuix/themes`) + `tailwindcss-primeui`. Global styles in `src/assets/styles.scss`.

### Role-Based Views

Dashboard and other pages conditionally render different content based on role (e.g., admin sees all invoices; doctor sees only pending). Check `AuthService.currentUser()` signal for role-gating logic.

### Feature Areas

| Path | Feature |
|------|---------|
| `src/app/components/` | Feature components (doctors, patients, appointments, invoices, workflow, etc.) |
| `src/app/layout/` | Shell layout components + `LayoutService` |
| `src/app/apps/` | Embedded apps (blog, chat, files, kanban, mail, tasklist) |
| `src/app/pages/` | Page-level components + core services |
| `src/app/guards/` | `authGuard` |
| `src/app/interceptors/` | `authInterceptor` |
| `src/app/interfaces/` | `TablePlugin` interfaces (column config, filters, export, row edit) |
| `src/app/types/` | Domain models (Doctor, Patient, Appointment, Payment, etc.) |
