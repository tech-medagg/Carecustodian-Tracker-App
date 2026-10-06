# Phase 2.5 — Functional Test Report
**System**: Medagg Carecustodian — Field Sales Management System  
**Audit Date**: September 2026  
**Test Status**: PASSED / VERIFIED  

---

## 1. Feature Verification Matrix

| Module | Test Scenario | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| **Auth** | Admin Login | Redirects to `/admin` dashboard | **PASS** |
| **Auth** | Salesman Login | Redirects to `/sales/visits` queue | **PASS** |
| **Auth** | Deactivated Account Login | Displays error: "Account has been deactivated" | **PASS** |
| **Auth** | Direct URL to `/admin` as Salesman | Intercepted by `RoleGuard`, redirected to `/unauthorized` | **PASS** |
| **Healthcare CRM** | Search Facilities by City/Name | Dynamic client-side filtering | **PASS** |
| **Healthcare CRM** | Add Facility with GPS Coordinates | Validates bounds and adds to Firestore | **PASS** |
| **Visits Management** | Admin Schedules Visit to Salesman | Validates required fields, sets status `Assigned` | **PASS** |
| **Visits Management** | Status Filtering | Filters by Planned, In Progress, Completed | **PASS** |
| **Field Sales Queue** | Start Travel Action | Pre-fills destination in GPS tracker & switches to Map | **PASS** |
| **Field Sales Queue** | Facility Check-In | Captures device GPS coordinates & check-in timestamp | **PASS** |
| **Field Sales Queue** | Atomic Visit Completion | Atomically updates Visit, creates Lead, creates Follow-up | **PASS** |
| **Field Sales Queue** | Unable to Meet / Postpone | Records reason and sets status `Unable to Meet` | **PASS** |
| **Follow-ups** | Overdue Detection | Badges tasks with due dates in the past with Red Overdue chip | **PASS** |
| **Follow-ups** | Tap-to-Call Phone Action | Opens native dialer via `tel:` URI scheme | **PASS** |
| **Follow-ups** | One-Click Mark Done | Captures discussion note and marks status `Completed` | **PASS** |
| **Follow-ups** | Date Rescheduling | Updates due date, time, and logs reason | **PASS** |
| **GPS & Tracking** | Starting Concurrent Trip | Blocks action if an active trip is already in progress | **PASS** |
| **GPS & Tracking** | Outlier Filter (>150 km/h) | Discards impossible GPS coordinate jumps | **PASS** |
| **GPS & Tracking** | Rate Throttling | Writes to Firestore only when moved >= 10m or >= 10s elapsed | **PASS** |
| **Analytics** | Productivity Score Formula | Accurately calculates composite score (0–100) across 4 factors | **PASS** |
| **Analytics** | Sales vs Travel Reimbursement | Calculates distance * ratePerKm (@ dynamic rate) | **PASS** |
| **Analytics** | CSV Export | Generates formatted CSV for download | **PASS** |
| **Audit Logs** | Event Capture | Immutable records created for visit completions, reassignments | **PASS** |

---

## 2. Mobile UX & Responsiveness Verification

- **Touch Targets**: All primary action buttons (`Start Travel`, `Check-In`, `Record Outcome`, `Call`) have minimum 44px height for touch ergonomics.
- **Card-Based Field Layout**: Visits and Follow-ups utilize responsive cards with color-coded status indicators (Orange = In Progress, Green = Completed, Red = Overdue, Blue = Assigned).
- **Offline & Low Accuracy Resilience**: Graceful fallback when geolocation permissions are denied or GPS signal is weak.
