# Phase 2.5 — Security & Authorization Test Report
**System**: Medagg Carecustodian — Field Sales Management System  
**Audit Date**: September 2026  
**Status**: PASSED / HARDENED  

---

## 1. Authentication & Role-Based Access Control (RBAC)

### 1.1 Role Detection & Non-Heuristic Policy
- **Policy**: User roles are strictly stored in and fetched from the dedicated Firestore document `users/{uid}.role`.
- **Validation**: Role is never inferred from email address keywords (e.g., `admin@medagg.com` is not given admin permissions unless explicitly set in `users/{uid}`).
- **Roles Hierarchy**:
  - `super_admin`: Full system management, user deletions, rule changes.
  - `admin`: Facility management, visit scheduling/reassignment, all salesman trips, executive reports, setting changes, audit log viewing.
  - `salesman`: Assigned visit execution, check-in, outcome recording, own trips tracking, own leads, own follow-ups.

### 1.2 Route Guarding Matrix (`RoleGuard.jsx`)

| Route | Minimum Required Role | Unauthenticated Action | Unauthorized Action | Deactivated User Action |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | Public | Render Login Form | Render Login Form | Error message on login |
| `/admin` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/admin/visits` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/admin/customers` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/admin/follow-ups` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/admin/salesmen` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/admin/reports` | `admin` / `super_admin` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/sales/visits` | `salesman` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/sales` (Live GPS) | `salesman` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/sales/follow-ups`| `salesman` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/sales/trips` | `salesman` | Redirect to `/login` | Redirect to `/unauthorized` | Redirect to `/unauthorized` |
| `/sales/profile` | All authenticated | Redirect to `/login` | Render Profile | Redirect to `/unauthorized` |

---

## 2. Firestore Security Rules Audit (`firestore.rules`)

### 2.1 Collection-by-Collection Security Review

#### `/users/{userId}`
- **Read**: Authenticated user can read own profile; Admins can read all profiles.
- **Create**: Authenticated user can only create own profile with role `salesman`; Admins can create profiles.
- **Update**: Self-updates restricted; non-sensitive fields only (`name`, `phone`). Users cannot alter `role`, `status`, `teamId`, or `uid`. Admins can update any field.
- **Delete**: Restricted to `super_admin`.

#### `/trips/{tripId}`
- **Read**: Salesmen can only read trips where `userId == request.auth.uid`. Admins can read all trips.
- **Create**: Salesmen can only create trips tagged with their own `userId`.
- **Update**: Salesmen can only update their own trips and cannot modify `userId`.
- **Delete**: Restricted to admins.

#### `/customers/{customerId}`
- **Read**: All authenticated active users.
- **Create / Update**: Authenticated active users.
- **Delete**: Restricted to admins.

#### `/visits/{visitId}`
- **Read**: Salesman can only read visits where `assignedTo == uid()`. Admins can read all visits.
- **Create**: Admins create/assign; Salesmen can create self-assigned visits.
- **Update**: Salesmen can update their own visits (check-in, notes, completion) but **CANNOT change `assignedTo`** (reassignment locked to admins).
- **Delete**: Restricted to admins.

#### `/leads/{leadId}`
- **Read / Update**: Restricted to owning `salesmanId == uid()` or admins. Salesmen cannot reassign `salesmanId`.
- **Delete**: Restricted to admins.

#### `/followUps/{followUpId}`
- **Read / Update**: Restricted to owning `salesmanId == uid()` or admins. Salesmen cannot reassign `salesmanId`.
- **Delete**: Restricted to admins.

#### `/auditLogs/{logId}`
- **Read**: Admins only.
- **Create**: Authenticated active users.
- **Update / Delete**: **Strictly False** (Immutable append-only audit trail).

#### `/settings/{settingId}`
- **Read**: All active authenticated users.
- **Write**: Admins only.

---

## 3. Account Deactivation & Session Invalidation
- **Check at Login**: `authService.js` inspects `profile.status`. If `inactive` or `disabled`, signs out immediately and rejects authentication.
- **Check at Route Level**: `RoleGuard.jsx` verifies `user.status !== 'inactive'`.
- **Check at Database Level**: `firestore.rules` helper `isUserActive()` checks `callerProfile().status != 'inactive'`.
