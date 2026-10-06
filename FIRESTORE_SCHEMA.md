# Firestore Data Model & Schema — Medagg Field Sales Management System

## Overview
This document defines the complete Cloud Firestore database schema for the Medagg Carecustodian Field Sales Management System (V2).

---

## 1. Collections & Document Structures

### `users/{userId}`
Stores user profiles and authorization roles.
```json
{
  "uid": "string (Firebase Auth UID)",
  "email": "salesman@medagg.com",
  "displayName": "Rajesh Kumar",
  "photoURL": "https://... | null",
  "role": "salesman | admin | super_admin",
  "teamId": "team-north | null",
  "territory": "Chennai South",
  "phone": "+91 9876543210",
  "status": "active | inactive",
  "dailyTarget": 5,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastLoginAt": "Timestamp"
}
```

---

### `customers/{customerId}`
Stores hospitals, clinics, medical centers, and healthcare providers visited by sales reps.
```json
{
  "id": "string",
  "name": "Apollo Specialty Hospital",
  "type": "hospital | clinic | diagnostic_center | pharmacy",
  "address": "456 OMR Road, Kandanchavadi",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600096",
  "location": {
    "lat": 12.9654,
    "lng": 80.2461
  },
  "contactPerson": "Dr. S. Ramanathan",
  "phone": "+91 9840123456",
  "email": "contact@apolloomr.com",
  "department": "Orthopedics & Surgery",
  "category": "Tier 1 | Tier 2 | Tier 3",
  "notes": "Key surgical equipment procurement lead",
  "status": "active | inactive",
  "totalVisits": 12,
  "lastVisitedAt": "Timestamp | null",
  "createdBy": "admin-uid",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

### `visits/{visitId}`
The core unit of sales operations: planned, assigned, and executed meetings with customers/doctors.
```json
{
  "id": "string",
  "customerId": "customer-id",
  "customerName": "Apollo Specialty Hospital",
  "customerAddress": "456 OMR Road, Kandanchavadi",
  "customerLocation": {
    "lat": 12.9654,
    "lng": 80.2461
  },
  "assignedTo": "salesman-uid",
  "salesmanName": "Rajesh Kumar",
  "salesmanEmail": "rajesh@medagg.com",
  "scheduledDate": "YYYY-MM-DD",
  "scheduledTime": "10:30 AM",
  "priority": "Low | Medium | High | Urgent",
  "purpose": "Introduce new disposable surgical equipment catalog",
  "status": "Planned | Assigned | In Progress | Completed | Postponed | Cancelled | Unable to Meet",
  "checkInTime": "Timestamp | null",
  "checkInLocation": {
    "lat": 12.9655,
    "lng": 80.2462
  },
  "completedAt": "Timestamp | null",
  "durationMinutes": 45,
  
  // Meeting Outcome Details
  "personMet": "Dr. Ramanathan (HOD Ortho)",
  "meetingType": "In-Person | Video Call | Phone Call",
  "discussionNotes": "Showcased knee replacement instrument trays. Client requested quotation.",
  "outcome": "Positive | Follow-up Required | Lead Generated | Proposal Requested | Not Interested | Decision Pending",
  
  // Linked entities
  "linkedTripId": "trip-id | null",
  "hasLead": true,
  "leadId": "lead-id | null",
  "hasNextFollowUp": true,
  "followUpId": "followup-id | null",
  
  "createdBy": "admin-uid",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

### `leads/{leadId}`
High-value revenue opportunities generated directly from completed visits.
```json
{
  "id": "string",
  "visitId": "visit-id",
  "customerId": "customer-id",
  "customerName": "Apollo Specialty Hospital",
  "salesmanId": "salesman-uid",
  "salesmanName": "Rajesh Kumar",
  "title": "Surgical Trays & Implants Procurement",
  "expectedValue": 250000,
  "status": "New | Contacted | Qualified | Proposal Sent | Negotiation | Won | Lost",
  "stage": "Proposal Sent",
  "probability": 70,
  "expectedCloseDate": "YYYY-MM-DD",
  "notes": "Quotation submitted for 5 sets of ortho toolkits.",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

### `followUps/{followUpId}`
Actionable reminders and next-steps scheduled during or after sales meetings.
```json
{
  "id": "string",
  "visitId": "visit-id",
  "customerId": "customer-id",
  "customerName": "Apollo Specialty Hospital",
  "salesmanId": "salesman-uid",
  "salesmanName": "Rajesh Kumar",
  "dueDate": "YYYY-MM-DD",
  "dueTime": "02:00 PM",
  "type": "Phone Call | In-Person Visit | Send Proposal | Email | Demo",
  "actionNote": "Follow up on quotation approval with Purchase Department",
  "priority": "Medium | High | Urgent",
  "status": "Pending | Completed | Overdue | Rescheduled",
  "completedAt": "Timestamp | null",
  "completionNote": "Quotation approved, invoice pending.",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

### `trips/{tripId}`
GPS travel tracking records created by salesmen during transit.
```json
{
  "id": "string",
  "userId": "salesman-uid",
  "salesman": "Rajesh Kumar",
  "salesmanEmail": "rajesh@medagg.com",
  "visitId": "visit-id | null",
  "startTime": "ISO String",
  "endTime": "ISO String | null",
  "startLocation": {
    "name": "Guindy, Chennai",
    "lat": 13.0067,
    "lng": 80.2021
  },
  "endLocation": {
    "name": "Apollo Specialty Hospital, OMR",
    "lat": 12.9654,
    "lng": 80.2461
  },
  "currentLocation": [12.9801, 80.2245],
  "distance": 14.2,
  "cost": 42.6,
  "status": "In Progress | Completed",
  "route": [[13.0067, 80.2021], [12.9801, 80.2245], [12.9654, 80.2461]],
  "createdAt": "Timestamp",
  "endedAt": "ISO String | null"
}
```

---

### `settings/global`
Organization configuration, reimbursement rates, and feature toggles.
```json
{
  "costPerKm": 3.0,
  "currency": "INR",
  "currencySymbol": "₹",
  "workingHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "visitPriorityLevels": ["Low", "Medium", "High", "Urgent"],
  "allowedMeetingTypes": ["In-Person", "Video Call", "Phone Call", "Hospital Demo"],
  "updatedAt": "Timestamp"
}
```

---

## 2. Entity Relationships

```
              ┌───────────────┐
              │     users     │ (Salesmen / Admins)
              └───────┬───────┘
                      │ 1:N
                      ▼
              ┌───────────────┐        1:N        ┌─────────────────┐
              │    visits     │ ────────────────> │    followUps    │
              └───────┬───────┘                   └─────────────────┘
                      │
           ┌──────────┼──────────┐
           │ 1:1      │ 1:1      │ 1:1
           ▼          ▼          ▼
     ┌───────────┐ ┌─────────┐ ┌─────────┐
     │ customers │ │  trips  │ │  leads  │
     │ (Hospital)│ │ (GPS)   │ │ (Deals) │
     └───────────┘ └─────────┘ └─────────┘
```
