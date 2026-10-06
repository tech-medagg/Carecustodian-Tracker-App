# PROJECT_AUDIT.md — Salesman Tracker (Medagg Carecustodian)

**Audit Date:** 2026-09-08  
**Auditor:** Antigravity IDE  
**Project Path:** `d:\Adi_Download\salesman-tracker-js`  
**Version:** 0.1.0 (MVP)  
**Status:** Pre-V2 Architecture Review — DO NOT BEGIN IMPLEMENTATION UNTIL APPROVED

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Complete File Inventory & Status](#3-complete-file-inventory--status)
4. [Active Routes](#4-active-routes)
5. [Authentication System Analysis](#5-authentication-system-analysis)
6. [Redux State Analysis](#6-redux-state-analysis)
7. [Firebase & Firestore Analysis](#7-firebase--firestore-analysis)
8. [External API Integrations](#8-external-api-integrations)
9. [Component Analysis](#9-component-analysis)
10. [Existing Working Features](#10-existing-working-features)
11. [Technical Debt Register](#11-technical-debt-register)
12. [Security Risk Register](#12-security-risk-register)
13. [Unused Code & Dependencies](#13-unused-code--dependencies)
14. [Existing Bugs & Stale State Issues](#14-existing-bugs--stale-state-issues)
15. [Environment Variables](#15-environment-variables)
16. [Proposed V2 Architecture](#16-proposed-v2-architecture)
17. [V2 Folder Structure](#17-v2-folder-structure)
18. [V2 Data Model Summary](#18-v2-data-model-summary)
19. [Migration Strategy](#19-migration-strategy)
20. [Files — Do Not Touch](#20-files--do-not-touch)
21. [Files — Will Be Changed](#21-files--will-be-changed)
22. [Files — Will Be Deleted](#22-files--will-be-deleted)
23. [Files — Will Be Created](#23-files--will-be-created)
24. [Implementation Phases](#24-implementation-phases)
25. [Open Questions Before Approval](#25-open-questions-before-approval)

---

## 1. Executive Summary

The existing "Salesman Tracker" is a functional MVP that successfully delivers:
- Firebase-authenticated salesman and admin login
- Real-time GPS trip tracking with live Firestore updates
- Leaflet map visualization with route, markers, and polylines
- Admin trip monitoring with date filtering and CSV export

**Critical problems that block V2:**

| Problem | Severity |
|---|---|
| Role detection uses `email.includes('admin')` — easily bypassed | 🔴 Critical |
| No route-level role enforcement — any user can access any dashboard | 🔴 Critical |
| Two conflicting authentication systems exist simultaneously | 🔴 Critical |
| Hard-coded credentials in repository (`Medaggtrip@123`) | 🔴 Critical |
| Real API keys committed inside `.env` file | 🔴 Critical |
| Admin and Salesman dashboards are 700–791 line monoliths | 🟡 High |
| Stale closure in auto-refresh `useEffect` | 🟡 High |
| ~1,303 lines of dead/unused code across 15+ files | 🟡 High |
| 7 unused npm packages inflating bundle | 🟡 Medium |
| Firestore has only 1 collection — not scalable for V2 | 🟡 High |

**Recommendation:** Fix the authentication foundation first. Migrate to feature-based architecture. Then add new V2 features incrementally. Do not add new features on top of broken auth.

---

## 2. Current Architecture Overview

```
BROWSER (React SPA — HashRouter)
  index.js
    Provider (Redux) → PersistGate (redux-persist) → App.js
      ErrorBoundary
      HashRouter
        /login    → LoginPage.js
        /admin    → ProtectedRoute* → MainLayout → AdminDashboard (700 lines)
        /sales    → ProtectedRoute* → MainLayout → SalesDashboard (791 lines)
        /         → RootRedirect (role detection via email text)
        /*        → Navigate to /

*ProtectedRoute checks login only — does NOT check role

Firebase Auth (Email/Password + Google OAuth)
Firebase Firestore → trips/ collection (only collection)

External APIs:
  Geoapify Geocoding  → destination search
  OSM Nominatim       → fallback geocoding + reverse geocode
  OSRM Routing        → route calculation
  OpenStreetMap Tiles → map background
```

### Tech Stack
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.2.0 |
| Build | Create React App | 5.0.1 |
| State | Redux Toolkit + redux-persist | 2.2.5 / 6.0.0 |
| UI | Material UI | 5.15.20 |
| Router | React Router DOM | 6.26.0 |
| Maps | React Leaflet + Leaflet | 4.2.1 / 1.9.4 |
| Backend | Firebase (Auth + Firestore) | 10.12.2 |
| Font | Inter (Google Fonts) | — |

---

## 3. Complete File Inventory & Status

### Root Files
| File | Action | Notes |
|---|---|---|
| `.env` | ⚠️ Keep / Rotate Keys | Contains real Firebase + Geoapify keys |
| `.env.example` | ✅ Keep | Good template |
| `.gitignore` | ✅ Keep | Verify `.env` is listed |
| `firebase.json` | ✅ Keep | Firebase hosting config — correct |
| `netlify.toml` | ✅ Keep | Netlify deploy — correct |
| `package.json` | 🔧 Update | Remove unused deps |
| `server.js` | ✅ Keep | Express production server — working |
| `webpack.config.js` | ❌ Delete | Ignored by CRA — does nothing |
| `postcss.config.js` | ✅ Keep | PostCSS config |
| `README.md` | 🔧 Rewrite | Outdated; needs V2 instructions |
| `FIREBASE_SETUP.md` | 🔧 Update | Needs role + security rules section |
| `GOOGLE_MAPS_SETUP.md` | ❌ Delete | Google Maps not used |
| `DEPLOYMENT_TROUBLESHOOTING.md` | ✅ Keep | Still relevant |
| `PERFORMANCE_OPTIMIZATION.md` | 🔧 Update | After refactor |

### Source Files (`src/`)
| File | Lines | Action | Reason |
|---|---|---|---|
| `index.js` | 19 | 🔧 Minor update | Add ThemeProvider |
| `App.js` | 174 | 🔧 Rewrite | Fix routing + add role guards |
| `index.css` | 449 | 🔧 Trim | Remove duplicates, fix border reset |
| `App.css` | ~10 | ❌ Delete | Redundant |
| `firebase.js` | 22 | ✅ Keep | Clean Firebase init |
| `logo.svg` | — | ❌ Delete | Not used |
| `reportWebVitals.js` | 15 | ✅ Keep | Standard |
| `setupTests.js` | 5 | ✅ Keep | Test setup |
| `App.test.js` | 9 | 🔧 Expand | Add real tests |
| **store/store.js** | 33 | ✅ Keep | Solid config |
| **store/authSlice.js** | 124 | 🔧 Update | Add role field from Firestore |
| **store/tripSlice.js** | 125 | ✅ Keep | Working — minor bug fixes only |
| **pages/Login/LoginPage.js** | 191 | 🔧 Update | Fetch + store role after login |
| **pages/Admin/Dashboard.js** | 700 | 🔧 Decompose | Extract into sub-components |
| **pages/Sales/Dashboard.js** | 791 | 🔧 Decompose | Extract into sub-components |
| **pages/Auth/Login.js** | 216 | ❌ Delete | Dead — replaced |
| **pages/Shared/** | 0 | ❌ Delete | Empty directory |
| **components/layout/MainLayout.js** | 97 | ✅ Keep | Active layout (Redux-connected) |
| **components/layout/Sidebar.js** | 53 | 🔧 Update | Wire navigation links |
| **components/Map.js** | 55 | ❌ Delete | Not imported; Next.js artifact |
| **components/common/MainLayout.js** | 255 | ❌ Delete | Dead — uses unprovided AuthContext |
| **components/common/ProtectedRoute.js** | 41 | ❌ Delete | Dead — uses unprovided AuthContext |
| **components/common/LoadingSpinner.js** | ~20 | ❌ Delete | Unused |
| **components/admin/** | 0 | ❌ Delete | Empty directory |
| **components/sales/** | 0 | ❌ Delete | Empty directory |
| **contexts/AuthContext.js** | 81 | ❌ Delete | Mock auth with hard-coded credentials |
| **contexts/TripsContext.js** | 63 | ❌ Delete | localStorage trips — replaced by Redux |
| **hooks/useTrips.js** | 131 | ✅ Keep | Clean Redux abstraction |
| **hooks/usePerformance.js** | 196 | ❌ Delete | Never imported anywhere |
| **utils/performance.js** | 134 | ❌ Delete | Never imported |
| **utils/performanceMonitor.js** | 242 | ❌ Delete | Never imported |
| **src/styles/** | 0 | ❌ Delete | Empty directory |
| **src/assets/images/** | 0 | ❌ Delete | Empty directory |

---

## 4. Active Routes

| Path | Component | Auth Required | Role Check |
|---|---|---|---|
| `/` | RootRedirect | No | Uses `email.includes('admin')` ⚠️ |
| `/login` | LoginPage | No | — |
| `/admin` | AdminDashboard (lazy) | Yes | NONE ⚠️ |
| `/sales` | SalesDashboard (lazy) | Yes | NONE ⚠️ |
| `/*` | Navigate to `/` | No | — |

**Critical Finding:** Any authenticated user can navigate to `/#/admin` directly and access the admin dashboard. There is no role check at the route level.

---

## 5. Authentication System Analysis

### System A — ACTIVE (Firebase + Redux)

**Flow:**
```
LoginPage.js
  → dispatch(loginUser) or dispatch(loginWithGoogle)
  → Firebase Auth SDK
  → Redux: state.auth.user = { uid, email, displayName, photoURL, provider }
  → Persisted to localStorage via redux-persist
  → App.js reads user, redirects by email text
```

**Role Detection — BROKEN:**
```js
// App.js line 117 and LoginPage.js line 56
const isAdmin = user.email && user.email.includes('admin');
```
Anyone whose email contains the word "admin" (e.g., `administrator@hospital.com`) gets admin access.

**What is missing:** No `users` Firestore collection. Role is never stored or fetched from database.

---

### System B — DEAD (Mock AuthContext)

**Files:**
- `src/contexts/AuthContext.js` — mock login with `setTimeout`
- `src/pages/Auth/Login.js` — unused role-picker UI
- `src/components/common/MainLayout.js` — calls `useAuth()` → CRASHES if rendered
- `src/components/common/ProtectedRoute.js` — calls `useAuth()` → CRASHES if rendered

**Hard-coded credentials in repository:**
```js
// AuthContext.js lines 29-38
if (email === 'admin@medagg.com' && password === 'Medaggtrip@123') { ... }
else if (email === 'sale@medagg.com' && password === 'sale@123') { ... }
```
If these passwords match real Firebase accounts, they are compromised. Rotate immediately.

**Resolution:** Delete System B entirely. Verify Firebase account passwords differ.

---

### V2 Authentication Plan

```
1. Create Firestore 'users/{uid}' document with role field
2. After Firebase Auth success → fetch users/{uid} from Firestore
3. Store in Redux: { uid, email, displayName, role, teamId, ... }
4. RoleGuard component reads role from Redux
5. Route tree split: /admin/* requires role=admin|super_admin
6. Route tree split: /app/* requires role=salesman
7. Firestore security rules enforce same restrictions server-side
```

---

## 6. Redux State Analysis

### Store Configuration
```js
persistReducer({ key: 'root', whitelist: ['auth'] },
  combineReducers({
    auth: authReducer,   // Persisted to localStorage
    trip: tripReducer,   // NOT persisted — fetched fresh from Firestore
  })
)
```

### Auth Slice — Current State Shape
```js
{
  user: null | {
    uid: string,
    email: string,
    displayName: string,
    photoURL: string | null,
    provider: 'email' | 'google'
    // MISSING: role, teamId, status, territory
  },
  status: 'idle' | 'loading' | 'succeeded' | 'failed',
  error: null | string
}
```

**V2 additions needed:** After login, fetch `users/{uid}` from Firestore and merge `{ role, teamId, territory, status }` into the Redux user object.

### Trip Slice — Current State Shape
```js
{
  trips: Trip[],
  currentTrip: Trip | null,
  status: 'idle' | 'loading' | 'succeeded' | 'failed',
  error: null | string
}
```

**Known bugs:**
- `addTrip.rejected` has no handler → error state not set on failure
- `updateTrip.rejected` has no handler → same issue

---

## 7. Firebase & Firestore Analysis

### Firebase Project
- **Project ID:** `salesman-tracker-app-19201`
- **Auth Domain:** `salesman-tracker-app-19201.firebaseapp.com`
- **Active Services:** Firebase Auth + Cloud Firestore
- **Unused Services Available:** Storage, Functions, Hosting

### Current Firestore — Single Collection: `trips`
```
trips/{tripId}
  userId          string        Firebase Auth UID
  salesman        string        Display name or email
  salesmanEmail   string        Email
  status          string        'In Progress' | 'Completed'
  startTime       Timestamp     Trip start
  endedAt         Timestamp     Trip end (null if in progress)
  startLocation   {name, lat, lng}    Object format
  endLocation     {name, lat, lng}    Object format
  currentLocation [lat, lng]          Array format ← inconsistent
  route           [[lat,lng], ...]    Array of coordinate pairs
  distance        number        km
  cost            number        INR
  to              string        Destination text
  destinationCoords [lat, lng]  Array
  date            string        ISO date
  createdAt       Timestamp     serverTimestamp
```

**Critical Issues:**
1. No `users` collection — no role storage
2. `currentLocation` is `[lat,lng]` array while `startLocation`/`endLocation` are `{lat,lng}` objects — inconsistency causes handling code in SalesDashboard
3. No compound Firestore index for `userId + startTime` queries — will fail when added
4. Firestore security rules unknown — likely over-permissive

### Firestore Security Rules — Assumed Current State
Without seeing the `firestore.rules` file, the most common default is:
```
match /trips/{tripId} {
  allow read, write: if request.auth != null;
}
```
This allows any authenticated user (any salesman) to read ALL trips. Must be fixed.

---

## 8. External API Integrations

### Active APIs
| API | Endpoint | Auth | Cost | Purpose |
|---|---|---|---|---|
| Geoapify Geocoding | `api.geoapify.com/v1/geocode/search` | API Key | Freemium (3k/day free) | Destination autocomplete |
| OSM Nominatim Search | `nominatim.openstreetmap.org/search` | None | Free (rate-limited) | Fallback geocoding |
| OSM Nominatim Reverse | `nominatim.openstreetmap.org/reverse` | None | Free (rate-limited) | Start/end address |
| OSRM Routing | `router.project-osrm.org/route/v1/driving` | None | Free (demo server) | Route + distance |
| OpenStreetMap Tiles | `{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | None | Free (rate-limited) | Map background |

### API Risks
- **OSRM public server:** Terms of service prohibit use as production dependency. Self-host or use a paid provider for production.
- **Geoapify:** Free tier is 3,000 req/day. Will hit limits with multiple active salesmen.
- **OSM Nominatim:** Max 1 request/second. The current debounce (600ms) is appropriate.

### Installed But Unused
- `@react-google-maps/api` — Google Maps SDK but Leaflet is used

---

## 9. Component Analysis

### Active Component Tree
```
App.js
├── ErrorBoundary (class component)
└── HashRouter
      ├── /login → LoginPage
      │     ├── Google OAuth button → dispatch(loginWithGoogle)
      │     └── Email/password form → dispatch(loginUser)
      │
      ├── /admin → ProtectedRoute → MainLayout(layout/) → AdminDashboard
      │           (checks login — NOT role)
      │
      └── /sales → ProtectedRoute → MainLayout(layout/) → SalesDashboard
                  (checks login — NOT role)
```

### AdminDashboard.js — Monolith (700 lines)
All of these exist in one component function:
- Date filter logic + state
- Firestore fetch + auto-refresh
- Statistics calculation
- Trip table rendering
- Leaflet map with markers + polylines
- Trip detail card
- CSV export logic
- 4 separate `useEffect` hooks

### SalesDashboard.js — Monolith (791 lines)
All of these exist in one component function:
- GPS location watching (initial + continuous)
- Geoapify + Nominatim geocoding with fallback chain
- Suggestion dropdown rendering
- OSRM routing calculation
- Trip start/stop + Firestore writes
- Reverse geocoding
- Leaflet map rendering
- Trip detail card
- 5 separate `useEffect` hooks

**These files are untestable, hard to maintain, and cannot support V2 feature additions.**

### Dead Component Tree (All Should Be Deleted)
```
components/common/MainLayout.js     → calls useAuth() — crashes if rendered
components/common/ProtectedRoute.js → calls useAuth() — crashes if rendered
components/common/LoadingSpinner.js → not imported anywhere
components/Map.js                   → not imported; has 'use client' (Next.js artifact)
pages/Auth/Login.js                 → replaced by pages/Login/LoginPage.js
```

---

## 10. Existing Working Features

These work correctly and must be preserved without regression:

| Feature | File | Status |
|---|---|---|
| Email/password login | `LoginPage.js` + `authSlice.js` | ✅ Working |
| Google OAuth login | `LoginPage.js` + `authSlice.js` | ✅ Working |
| Session persistence | `store.js` + redux-persist | ✅ Working |
| Logout | `layout/MainLayout.js` + `authSlice.js` | ✅ Working |
| Fetch all trips from Firestore | `tripSlice.js` | ✅ Working |
| Admin trip table with date filter | `Admin/Dashboard.js` | ✅ Working |
| Admin trip statistics | `Admin/Dashboard.js` | ✅ Working |
| Admin Leaflet map | `Admin/Dashboard.js` | ✅ Working |
| Admin CSV export | `Admin/Dashboard.js` | ✅ Working |
| Admin auto-refresh on active trips | `Admin/Dashboard.js` | ✅ Working (stale closure bug) |
| GPS current location | `Sales/Dashboard.js` | ✅ Working |
| Live GPS watch | `Sales/Dashboard.js` | ✅ Working |
| Destination autocomplete | `Sales/Dashboard.js` | ✅ Working |
| Route calculation | `Sales/Dashboard.js` | ✅ Working |
| Distance + cost estimation | `Sales/Dashboard.js` | ✅ Working |
| Start trip → Firestore | `Sales/Dashboard.js` → `tripSlice.js` | ✅ Working |
| Live location updates during trip | `Sales/Dashboard.js` → `tripSlice.js` | ✅ Working |
| Stop trip → Firestore | `Sales/Dashboard.js` → `tripSlice.js` | ✅ Working |
| Reverse geocoding | `Sales/Dashboard.js` | ✅ Working |

---

## 11. Technical Debt Register

| ID | Item | Location | Priority |
|---|---|---|---|
| TD-01 | `email.includes('admin')` role detection | `App.js:117`, `LoginPage.js:56` | 🔴 P0 |
| TD-02 | No role enforcement on routes | `App.js:93-101` | 🔴 P0 |
| TD-03 | Two conflicting auth systems | Multiple files | 🔴 P0 |
| TD-04 | Hard-coded credentials in repo | `AuthContext.js:29-38` | 🔴 P0 |
| TD-05 | Stale closure — `trips` missing from `useEffect` deps | `Admin/Dashboard.js:191` | 🔴 P1 |
| TD-06 | AdminDashboard.js 700-line monolith | `Admin/Dashboard.js` | 🟡 P1 |
| TD-07 | SalesDashboard.js 791-line monolith | `Sales/Dashboard.js` | 🟡 P1 |
| TD-08 | Sidebar navigation items not wired | `layout/Sidebar.js:35-46` | 🟡 P1 |
| TD-09 | `window.innerWidth` in render — no resize listener | `Sales/Dashboard.js:643` | 🟡 P2 |
| TD-10 | Duplicate `debounce` function | `Sales/Dashboard.js:51` + `utils/performance.js` | 🟡 P2 |
| TD-11 | Duplicate CSS class definitions | `index.css` | 🟡 P2 |
| TD-12 | `border: 0` global reset breaks MUI borders | `index.css:14` | 🟡 P2 |
| TD-13 | `addTrip.rejected` and `updateTrip.rejected` not handled | `tripSlice.js:96-111` | 🟡 P2 |
| TD-14 | Inconsistent location format in Firestore | `tripSlice.js:20-21` | 🟡 P2 |
| TD-15 | `express` in dependencies (not devDependencies) | `package.json:21` | 🔵 P3 |
| TD-16 | `webpack.config.js` present but CRA ignores it | Root | 🔵 P3 |
| TD-17 | No Firestore compound indexes | Firestore | 🟡 P2 |
| TD-18 | Zero real unit tests | `App.test.js` | 🟡 P2 |
| TD-19 | Console.log in production code | `App.js:127-130` | 🔵 P3 |
| TD-20 | `'use client'` Next.js artifact in `Map.js` | `components/Map.js:2` | 🔵 P3 |

---

## 12. Security Risk Register

| ID | Risk | Severity | Remediation |
|---|---|---|---|
| SEC-01 | Role by `email.includes('admin')` | 🔴 Critical | Firestore role field lookup |
| SEC-02 | No route-level role enforcement | 🔴 Critical | RoleGuard component |
| SEC-03 | Real API keys in `.env` file | 🔴 Critical | Ensure in `.gitignore`; rotate if exposed |
| SEC-04 | Hard-coded credentials in `AuthContext.js` | 🔴 Critical | Delete file; change Firebase passwords |
| SEC-05 | Unknown Firestore security rules | 🔴 Critical | Write and deploy `firestore.rules` |
| SEC-06 | Salesman can read all other trips | 🔴 Critical | Rule: `request.auth.uid == resource.data.userId` |
| SEC-07 | No field validation on Firestore writes | 🟡 High | Add field type checks to rules |
| SEC-08 | Geoapify key exposed in frontend bundle | 🟡 Medium | Add HTTP referrer restriction in Geoapify dashboard |
| SEC-09 | OSRM public server in production | 🟡 Medium | Plan migration to self-hosted or paid routing |
| SEC-10 | No session expiry handling | 🟡 Medium | Add Firebase Auth token refresh handling |

---

## 13. Unused Code & Dependencies

### Unused npm Packages (Remove to Reduce Bundle)
| Package | Why Installed | Why Unused |
|---|---|---|
| `@react-google-maps/api` | Google Maps | Leaflet used instead |
| `@nivo/core` | Charts | No charts rendered |
| `@nivo/line` | Line charts | No charts rendered |
| `@nivo/geo` | Geo charts | No charts rendered |
| `formik` | Form management | Plain React state used |
| `yup` | Form validation | No validation implemented |
| `jsPDF` | PDF export | CSV used instead |
| `axios` | HTTP client | Native `fetch()` used |

### Unused Source Code — 1,303+ Lines
| File | Lines |
|---|---|
| `pages/Auth/Login.js` | 216 |
| `components/common/MainLayout.js` | 255 |
| `components/common/ProtectedRoute.js` | 41 |
| `components/common/LoadingSpinner.js` | ~20 |
| `components/Map.js` | 55 |
| `contexts/AuthContext.js` | 81 |
| `contexts/TripsContext.js` | 63 |
| `hooks/usePerformance.js` | 196 |
| `utils/performance.js` | 134 |
| `utils/performanceMonitor.js` | 242 |
| **Total** | **~1,303** |

---

## 14. Existing Bugs & Stale State Issues

### Bug 1 — Stale Closure: `trips` Missing from `useEffect` Dependencies
```js
// Admin/Dashboard.js lines 172-191
useEffect(() => {
  if (tripStatus === 'idle') { dispatch(fetchTrips()); }
  const hasActiveTrip = trips.some(t => t.status === 'In Progress'); // STALE
  let interval;
  if (hasActiveTrip) {
    interval = setInterval(() => dispatch(fetchTrips()), 10000);
  }
  return () => { if (interval) clearInterval(interval); };
}, [tripStatus, dispatch]); // ← 'trips' is MISSING from deps
```
**Effect:** `trips` is frozen at stale value. Polling may run/stop at wrong times.  
**Fix:** Add `trips` to dependency array, or use `useRef` for the polling flag.

### Bug 2 — No Role Check on Protected Routes
Any authenticated user can type `/#/admin` and access the admin dashboard.

### Bug 3 — Sidebar Navigation Does Nothing
`layout/Sidebar.js` renders "Dashboard" and "Profile" list items with no click handlers or `<Link>` components.

### Bug 4 — `window.innerWidth` in JSX Render
```js
size={window.innerWidth < 600 ? "medium" : "large"}
scrollWheelZoom={window.innerWidth >= 600}
```
Read once at render. Does not update on window resize.  
**Fix:** Use MUI `useMediaQuery` hook.

### Bug 5 — `addTrip.rejected` and `updateTrip.rejected` Not Handled
Only `fetchTrips.rejected` sets `state.error`. If adding or updating a trip fails in Firestore, the Redux error state is never set.

### Bug 6 — Inconsistent Firestore Location Format
- `startLocation` / `endLocation`: `{ name, lat, lng }` (object)
- `currentLocation`: `[lat, lng]` (array)

SalesDashboard handles this with explicit branching (lines 107-113), but it is fragile and confusing.

### Bug 7 — `reverseGeocode` Used Before Defined
`handleStartTrip` (line ~394) calls `reverseGeocode()` which is defined at line ~453. Works due to async timing, but creates maintenance confusion.

---

## 15. Environment Variables

| Variable | File | Required |
|---|---|---|
| `REACT_APP_FIREBASE_API_KEY` | `firebase.js` | ✅ Yes |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `firebase.js` | ✅ Yes |
| `REACT_APP_FIREBASE_PROJECT_ID` | `firebase.js` | ✅ Yes |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `firebase.js` | ✅ Yes |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `firebase.js` | ✅ Yes |
| `REACT_APP_FIREBASE_APP_ID` | `firebase.js` | ✅ Yes |
| `REACT_APP_GEOAPIFY_API_KEY` | `Sales/Dashboard.js` | Optional (falls back to Nominatim) |

> [!CAUTION]
> The `.env` file contains real API keys. If this file was ever committed to git, rotate all keys immediately. Add HTTP referrer restrictions to the Geoapify key in the Geoapify dashboard.

---

## 16. Proposed V2 Architecture

```
BROWSER — React SPA (HashRouter)
  index.js
    Redux Provider → PersistGate → ThemeProvider → App.js
      ErrorBoundary
      HashRouter
        /login          → LoginPage
        /unauthorized   → UnauthorizedPage

        /admin/*        → RoleGuard(roles: super_admin, admin)
          /admin                → Admin Overview Dashboard
          /admin/live           → Live Field Activity Map
          /admin/visits         → Visit Management
          /admin/salesmen       → Salesman Management
          /admin/customers      → Customer / Hospital Management
          /admin/follow-ups     → Follow-up Management
          /admin/reports        → Reports & Analytics
          /admin/settings       → Settings

        /app/*          → RoleGuard(roles: salesman)
          /app                  → Today's Dashboard
          /app/visits           → My Visits (today / upcoming / completed)
          /app/visit/:id        → Visit Detail + Start/Complete Actions
          /app/trips            → Trip Tracking
          /app/follow-ups       → My Follow-ups
          /app/profile          → Profile & Settings

Firebase Auth (Email/Password + Google OAuth)
Firestore:
  users/              NEW
  teams/              NEW
  customers/          NEW
  visits/             NEW
  visitActivities/    NEW
  followUps/          NEW
  trips/              EXISTING (extend, no breaking changes)
  expenses/           NEW
  targets/            NEW
  notifications/      NEW
  auditLogs/          NEW
  settings/           NEW
```

### V2 Auth Flow
```
1. User visits app → no valid Redux session → redirect /login
2. User authenticates via Firebase Auth
3. On success: fetch Firestore users/{uid}
4. If no user document: create with role='salesman' (default)
5. Merge { role, teamId, territory, status } into Redux auth state
6. Persist to localStorage (auth slice only)
7. RoleGuard reads role from Redux — allows or redirects to /unauthorized
8. Firestore security rules enforce same restrictions server-side
```

---

## 17. V2 Folder Structure

```
src/
├── app/
│   ├── store.js
│   └── rootReducer.js
│
├── features/
│   ├── auth/
│   │   ├── authSlice.js         (update — add role)
│   │   ├── authService.js       (NEW — Firebase calls)
│   │   ├── LoginPage.jsx        (update)
│   │   ├── RoleGuard.jsx        (NEW)
│   │   └── UnauthorizedPage.jsx (NEW)
│   │
│   ├── trips/
│   │   ├── tripSlice.js         (keep)
│   │   ├── tripService.js       (NEW — extract Firestore)
│   │   ├── useTrips.js          (keep)
│   │   ├── TripMap.jsx          (NEW — extracted)
│   │   └── TripTracker.jsx      (NEW — extracted)
│   │
│   ├── visits/                  (NEW)
│   │   ├── visitSlice.js
│   │   ├── visitService.js
│   │   ├── VisitList.jsx
│   │   ├── VisitDetail.jsx
│   │   ├── VisitForm.jsx
│   │   └── VisitCompletion.jsx
│   │
│   ├── customers/               (NEW)
│   │   ├── customerSlice.js
│   │   ├── customerService.js
│   │   ├── CustomerList.jsx
│   │   └── CustomerForm.jsx
│   │
│   ├── followUps/               (NEW)
│   │   ├── followUpSlice.js
│   │   ├── followUpService.js
│   │   ├── FollowUpList.jsx
│   │   └── FollowUpForm.jsx
│   │
│   └── reports/                 (NEW)
│       ├── ReportsPage.jsx
│       └── reportUtils.js
│
├── layouts/
│   ├── AdminLayout.jsx          (refactor from layout/)
│   ├── SalesLayout.jsx          (NEW — mobile-first)
│   └── AuthLayout.jsx           (NEW — centered)
│
├── components/
│   ├── ui/
│   │   ├── StatCard.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── DataTable.jsx
│   │   ├── LoadingState.jsx
│   │   ├── EmptyState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── PageHeader.jsx
│   ├── map/
│   │   ├── MapPanel.jsx
│   │   └── MapMarkers.jsx
│   └── forms/
│       ├── SearchField.jsx
│       └── DateRangeFilter.jsx
│
├── services/
│   ├── firebase.js              (keep as-is)
│   ├── firestoreService.js      (NEW — shared helpers)
│   ├── geocodingService.js      (NEW — extracted)
│   └── routingService.js        (NEW — extracted)
│
├── hooks/
│   ├── useTrips.js              (keep)
│   ├── useGeoLocation.js        (NEW — extract GPS)
│   ├── useDebounce.js           (NEW — clean debounce)
│   └── useMediaQuery.js         (replace window.innerWidth)
│
├── utils/
│   ├── dateUtils.js
│   ├── costUtils.js
│   └── exportUtils.js           (extract CSV logic)
│
├── constants/
│   ├── roles.js
│   ├── visitStatuses.js
│   ├── leadStatuses.js
│   └── routes.js
│
├── theme/
│   └── theme.js
│
├── pages/
│   ├── admin/
│   │   ├── AdminOverviewPage.jsx
│   │   ├── LiveFieldPage.jsx
│   │   ├── VisitManagementPage.jsx
│   │   ├── SalesmenPage.jsx
│   │   ├── CustomersPage.jsx
│   │   ├── FollowUpsPage.jsx
│   │   ├── ReportsPage.jsx
│   │   └── SettingsPage.jsx
│   └── sales/
│       ├── TodayPage.jsx
│       ├── MyVisitsPage.jsx
│       ├── VisitDetailPage.jsx
│       ├── TripPage.jsx
│       ├── FollowUpsPage.jsx
│       └── ProfilePage.jsx
│
├── App.js                       (rewrite)
└── index.js                     (add ThemeProvider)
```

---

## 18. V2 Data Model Summary

### `users/{uid}`
```
uid             string    Firebase Auth UID (= doc ID)
email           string
displayName     string
photoURL        string | null
role            string    'super_admin' | 'admin' | 'salesman'
teamId          string | null
territory       string | null
phone           string | null
status          string    'active' | 'inactive'
createdAt       Timestamp
updatedAt       Timestamp
lastLoginAt     Timestamp
```

### `customers/{customerId}`
```
id              string
name            string
type            string    'hospital' | 'clinic' | 'pharmacy' | 'doctor' | 'other'
contactPerson   string
phone           string
email           string | null
address         string
location        {lat, lng}
city            string
state           string
tags            string[]
assignedTo      string | null    userId of primary salesman
status          'active' | 'inactive'
createdBy       string
createdAt       Timestamp
updatedAt       Timestamp
```

### `visits/{visitId}`
```
id              string
customerId      string    → customers/{id}
assignedTo      string    → users/{uid} (salesman)
assignedBy      string    → users/{uid} (admin)
plannedDate     Timestamp
actualStartTime Timestamp | null
actualEndTime   Timestamp | null
status          string    'planned' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'postponed' | 'cancelled' | 'unable_to_meet'
priority        string    'low' | 'medium' | 'high' | 'urgent'
purpose         string
expectedOutcome string
outcome         string | null    (filled on completion)
personMet       string | null
meetingType     string | null
notes           string
followUpRequired boolean
followUpDate    Timestamp | null
linkedTripId    string | null    → trips/{id}
leadGenerated   boolean
leadId          string | null
createdBy       string
createdAt       Timestamp
updatedAt       Timestamp
```

### `trips/{tripId}` (Extended — Backward Compatible)
```
[ALL EXISTING FIELDS KEPT UNCHANGED]

+ visitId       string | null    NEW — links trip to a visit (null for old records)
+ teamId        string | null    NEW — team context
```

### `followUps/{followUpId}`
```
id              string
visitId         string    → visits/{id}
customerId      string    → customers/{id}
assignedTo      string    → users/{uid}
dueDate         Timestamp
status          string    'pending' | 'completed' | 'overdue' | 'rescheduled'
notes           string
nextAction      string
completedAt     Timestamp | null
completedBy     string | null
createdBy       string
createdAt       Timestamp
updatedAt       Timestamp
```

Full schema with indexes and rules → `FIRESTORE_SCHEMA.md` (created in Phase 1).

---

## 19. Migration Strategy

### Principle: Additive and Non-Destructive
All existing Firestore data is preserved. New collections are added. Existing functionality continues to work throughout migration.

### Phase-by-Phase Data Changes

| Phase | Data Change | Breaking? |
|---|---|---|
| Phase 1 — Auth fix | Create `users` collection | No |
| Phase 2 — Cleanup | No data changes | No |
| Phase 3 — Decompose | No data changes | No |
| Phase 4 — Customers | Create `customers` collection | No |
| Phase 5 — Visits | Create `visits` collection; add `visitId` nullable field to trips | No |
| Phase 6 — Follow-ups | Create `followUps` collection | No |
| Phase 7+ | Add reporting queries with indexes | No |

Existing `trips` documents without `visitId` are treated as standalone trips. No migration script required — the field is nullable.

---

## 20. Files — Do Not Touch

| File | Reason |
|---|---|
| `src/firebase.js` | Clean, correct Firebase init |
| `src/store/store.js` | Solid Redux + persist config |
| `src/store/tripSlice.js` | Working Firestore CRUD (minor bug fixes only) |
| `src/hooks/useTrips.js` | Clean abstraction — keep |
| `src/reportWebVitals.js` | Standard |
| `src/setupTests.js` | Standard test setup |
| `firebase.json` | Correct hosting config |
| `netlify.toml` | Correct Netlify config |
| `server.js` | Working Express server |
| `.env.example` | Correct template |
| `DEPLOYMENT_TROUBLESHOOTING.md` | Still useful |

---

## 21. Files — Will Be Changed

| File | Changes |
|---|---|
| `src/index.js` | Add ThemeProvider |
| `src/App.js` | Rewrite: role-based routing, RoleGuard, new routes |
| `src/store/authSlice.js` | Add role fetch from Firestore; extend user state |
| `src/pages/Login/LoginPage.jsx` | Fetch + store role after login |
| `src/components/layout/MainLayout.js` | Add proper nav; admin/sales variants |
| `src/components/layout/Sidebar.js` | Wire navigation links |
| `src/index.css` | Remove duplicates; fix global border reset |
| `package.json` | Remove 8 unused deps |
| `README.md` | Full rewrite for V2 |
| `FIREBASE_SETUP.md` | Add role + security rules section |

---

## 22. Files — Will Be Deleted

| File | Reason |
|---|---|
| `src/pages/Auth/Login.js` | Dead — replaced |
| `src/components/common/MainLayout.js` | Dead — crashes if rendered |
| `src/components/common/ProtectedRoute.js` | Dead — crashes if rendered |
| `src/components/common/LoadingSpinner.js` | Unused |
| `src/components/Map.js` | Unused; has Next.js artifact |
| `src/contexts/AuthContext.js` | Contains hard-coded credentials |
| `src/contexts/TripsContext.js` | Replaced by Redux + Firestore |
| `src/hooks/usePerformance.js` | Never imported |
| `src/utils/performance.js` | Never imported |
| `src/utils/performanceMonitor.js` | Never imported |
| `src/logo.svg` | Not used |
| `src/App.css` | Redundant |
| `webpack.config.js` | Ignored by CRA |
| `GOOGLE_MAPS_SETUP.md` | Google Maps not used |
| `src/styles/` (empty dir) | Empty |
| `src/assets/images/` (empty dir) | Empty |
| `src/components/admin/` (empty dir) | Empty |
| `src/components/sales/` (empty dir) | Empty |
| `src/pages/Shared/` (empty dir) | Empty |

---

## 23. Files — Will Be Created

### Phase 1 — Auth & Security
```
firestore.rules
FIRESTORE_SCHEMA.md
FIRESTORE_RULES.md
src/features/auth/authService.js
src/features/auth/RoleGuard.jsx
src/features/auth/UnauthorizedPage.jsx
src/constants/roles.js
src/constants/routes.js
```

### Phase 2 — Shared Foundation
```
src/theme/theme.js
src/components/ui/StatCard.jsx
src/components/ui/StatusBadge.jsx
src/components/ui/DataTable.jsx
src/components/ui/LoadingState.jsx
src/components/ui/EmptyState.jsx
src/components/ui/ErrorState.jsx
src/components/ui/ConfirmDialog.jsx
src/components/map/MapPanel.jsx
src/hooks/useGeoLocation.js
src/hooks/useDebounce.js
src/services/geocodingService.js
src/services/routingService.js
src/utils/dateUtils.js
src/utils/exportUtils.js
```

### Phase 3+ — Feature Modules (After Approval)
```
src/features/trips/TripMap.jsx
src/features/trips/TripTracker.jsx
src/features/trips/tripService.js
src/features/visits/ (visitSlice, visitService, VisitList, VisitDetail, VisitForm, VisitCompletion)
src/features/customers/ (customerSlice, customerService, CustomerList, CustomerForm)
src/features/followUps/ (followUpSlice, followUpService, FollowUpList, FollowUpForm)
src/features/reports/ (ReportsPage, reportUtils)
src/layouts/ (AdminLayout, SalesLayout, AuthLayout)
src/pages/admin/ (8 pages)
src/pages/sales/ (6 pages)
```

---

## 24. Implementation Phases

### Phase 1 — Security & Authentication (Priority: IMMEDIATE)
Fix broken auth before anything else.

**Steps:**
1. Delete all 19 dead/unused files listed in Section 22
2. Create Firestore `users` collection
3. Update `authSlice.js` — fetch role from `users/{uid}` after Firebase Auth login
4. Create `authService.js` — centralize Firebase Auth + Firestore user fetch
5. Create `RoleGuard.jsx` — replaces current `ProtectedRoute`
6. Rewrite `App.js` routing — `/admin/*` requires admin role, `/app/*` requires salesman role
7. Create `UnauthorizedPage.jsx`
8. Write `firestore.rules` — restrict trips reads to owner, add role checks
9. Create `constants/roles.js` and `constants/routes.js`
10. Fix stale closure bug in `Admin/Dashboard.js:191`

**Test checklist:**
- [ ] Admin logs in → goes to `/admin`
- [ ] Salesman logs in → goes to `/app`
- [ ] Salesman navigates to `/#/admin` → redirected to `/unauthorized`
- [ ] Admin navigates to `/#/app` → redirected to `/unauthorized`
- [ ] Salesman can only read their own trips
- [ ] Logout works for both roles

---

### Phase 2 — Code Cleanup & Foundation (Week 1-2)
Remove dead code. Fix bugs. Establish shared UI system.

**Steps:**
1. Fix sidebar navigation links
2. Fix `window.innerWidth` → `useMediaQuery`
3. Trim `index.css` duplicates
4. Fix `border: 0` global reset
5. Remove 8 unused npm packages
6. Create shared component library (StatCard, StatusBadge, DataTable, etc.)
7. Create MUI theme file
8. Extract `geocodingService.js` and `routingService.js`
9. Create `useGeoLocation.js` and `useDebounce.js`
10. Fix `addTrip.rejected` / `updateTrip.rejected` handlers

---

### Phase 3 — Decompose Monolithic Dashboards (Week 2)
Break large files into testable components. Zero behavior change.

**AdminDashboard extractions:**
- `DateRangeFilter.jsx`
- `TripStatsPanel.jsx`
- `TripTable.jsx`
- `TripMapPanel.jsx`
- `TripDetailCard.jsx`

**SalesDashboard extractions:**
- `DestinationSearch.jsx`
- `TripControls.jsx`
- `CurrentLocationCard.jsx`
- `TripDetailCard.jsx`
- `TripMapView.jsx`

---

### Phase 4 — Customer & Hospital Management (Week 3)
**New:** `customers` Firestore collection + CRUD UI.

---

### Phase 5 — Visit Planning & Assignment (Week 3-4)
**New:** `visits` collection + admin assignment + salesman acceptance + completion form.

---

### Phase 6 — Follow-Up Management (Week 4)
**New:** `followUps` collection + auto-creation on visit completion + overdue alerts.

---

### Phase 7 — Admin Control Center Redesign (Week 5)
Full admin dashboard with real stats, live map, salesman management, reports.

---

### Phase 8 — Mobile-First Salesman UI (Week 5-6)
Bottom navigation, today's dashboard, touch-friendly visit workflow.

---

### Phase 9 — Business Intelligence (Week 6-7)
Productivity score, productive location analysis, follow-up risk, management alerts.

---

### Phase 10 — Quality & Production Readiness (Week 7-8)
Unit tests, integration tests, Firestore pagination, audit logs, deployment docs.

---

## 25. Open Questions Before Approval

These must be answered before implementation begins:

**A. Firestore Region**
What region is the Firebase project using? (`asia-south1` recommended for India.)

**B. First Admin Bootstrap**
How will the first super_admin user be set up?
- Option 1: Manually in Firebase console (set `role: 'super_admin'` in `users/{uid}`)
- Option 2: Firebase Admin SDK script
- Option 3: Seed script run once

**C. Google OAuth Domain Restriction**
Should Google login be restricted to `@medagg.com` emails only, or allow any Gmail?

**D. OSRM Routing for Production**
Current use of OSRM public demo server violates their terms for production. Choose one:
- Self-hosted OSRM instance
- Mapbox Directions API (paid, reliable)
- Keep OSRM public temporarily (acceptable for low-traffic MVP)

**E. Offline Support**
Salesmen work in the field with poor connectivity. Should the app:
- Use Firestore offline persistence (`enableMultiTabIndexedDbPersistence`)?
- Queue writes when offline and sync on reconnect?
- Just show "you're offline" messages?

**F. Team Hierarchy**
Is the organization flat (one admin, many salesmen) or hierarchical (multiple teams, managers, regions)?

**G. Expense Approvals**
Does travel cost need an approval workflow (salesman submits → admin approves), or is it auto-calculated?

**H. Existing Trip Data**
Should the ~existing trips~ in Firestore be annotated with `visitId: null` now, or handled lazily when the field is first read?

**I. Current Firestore Security Rules**
Can you check and share the current rules from the Firebase console?  
Go to: `Firebase Console → Firestore → Rules tab`  
This determines whether SEC-05 and SEC-06 are already exploitable.

---

> ## ✋ APPROVAL CHECKPOINT
>
> This audit is complete. **Do not begin implementation until this document is reviewed and approved.**
>
> **What to review:**
> - Section 3 file statuses (keep / change / delete) — confirm you agree
> - Section 22 deletion list — confirm all files are safe to remove
> - Section 16 proposed V2 architecture — confirm the route structure
> - Section 25 open questions — provide answers
>
> **After approval, implementation begins with Phase 1: Security & Authentication.**
