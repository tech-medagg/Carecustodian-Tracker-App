# Phase 2.5 — Data Integrity & Reliability Report
**System**: Medagg Carecustodian — Field Sales Management System  
**Audit Date**: September 2026  
**Status**: VERIFIED / TRANSACTION SAFE  

---

## 1. Schema & Relational Model Consistency

```
   ┌─────────────┐
   │    users    │
   └─────────────┘
      ▲       ▲
      │       │ (salesmanId)
      │       ├───────────────────────┐
 (assignedTo) │                       │
      │       ▼                       ▼
   ┌─────────────┐ (visitId)       ┌─────────────┐
   │   visits    │ <─────────────> │    trips    │
   └─────────────┘                 └─────────────┘
      │       │ (visitId)
      │       ├───────────────────────┐
 (customerId) │                       │
      │       ▼                       ▼
      │    ┌─────────────┐         ┌─────────────┐
      ├──> │    leads    │         │  followUps  │
      │    └─────────────┘         └─────────────┘
      ▼
   ┌─────────────┐
   │  customers  │
   └─────────────┘
```

---

## 2. Foreign Key & Reference Integrity

| Reference Field | Parent Collection | Child Collection | Integrity Rule & Fallback Behavior |
| :--- | :--- | :--- | :--- |
| `customerId` | `customers` | `visits`, `leads`, `followUps` | Child documents denormalize `customerName` and `customerAddress` at creation time. If a customer is deleted, historic records retain facility name. |
| `assignedTo` | `users` | `visits` | Denormalizes `salesmanName` and `salesmanEmail`. If salesman is deactivated, visit displays assigned name and appears in historical reports. |
| `salesmanId` | `users` | `leads`, `followUps`, `trips` | Denormalizes `salesmanName`. Deactivated salesmen do not break existing leads or follow-up assignments. |
| `visitId` | `visits` | `leads`, `followUps`, `trips` | Optional relational link. Enables cross-analysis between travel route and visit conversion outcome. |

---

## 3. Timestamp Serialization Standards

- **Firestore Storage**: All write payloads utilize Firestore `serverTimestamp()` for `createdAt` and `updatedAt` to ensure server-side clock monotonicity and prevent client clock manipulation.
- **Client Deserialization**: All service mappers safely convert Firestore `Timestamp` objects (`toDate().toISOString()`) into plain ISO 8601 strings before dispatching to Redux, maintaining 100% serializability for Redux DevTools and Redux Persist.

---

## 4. Transaction Safety & Atomic Batched Writes

### 4.1 Problem Identified in Phase 2
In Phase 2, recording a visit outcome, generating a lead, and scheduling a follow-up required 3 non-atomic client dispatch calls. If network failed midway, orphaned partial records were created.

### 4.2 Solution Implemented in Phase 2.5 (`visitAtomicService.js`)
All multi-step visit operations are now executed in a single atomic Firestore `writeBatch(db)`:

```javascript
const batch = writeBatch(db);
batch.update(visitRef, visitPayload);
if (leadData) batch.set(leadRef, leadPayload);
if (followUpData) batch.set(followUpRef, followUpPayload);
batch.set(auditRef, auditPayload);
await batch.commit();
```

- **Guarantee**: Either all 4 operations succeed simultaneously or none of them do.
- **Zero Partial Writes**: Guaranteed by Firestore ACID transaction semantics.

---

## 5. Lifecycle Transition Enforcement (`validators.js`)

Illegal lifecycle reversions are blocked at both client and validator level:

| Current Status | Allowed Target Statuses | Blocked Target Statuses |
| :--- | :--- | :--- |
| `Planned` | `Assigned`, `In Progress`, `Postponed`, `Cancelled`, `Unable to Meet` | — |
| `Assigned` | `In Progress`, `Completed`, `Postponed`, `Cancelled`, `Unable to Meet` | `Planned` |
| `In Progress` | `Completed`, `Postponed`, `Cancelled`, `Unable to Meet` | `Planned`, `Assigned` |
| `Completed` | **None (Terminal)** | `Planned`, `Assigned`, `In Progress`, `Cancelled` |
| `Cancelled` | **None (Terminal)** | All |
