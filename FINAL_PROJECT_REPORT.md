# VJTI College Complaint Management System
## Final Project Report - Complete Workflow Analysis

---

## EXECUTIVE SUMMARY

The VJTI College Complaint Management System is a comprehensive full-stack web application designed to digitize and manage campus facility complaints. The system automates the workflow from complaint filing to resolution, with role-based access control ensuring appropriate actors handle complaints at each stage. It distinguishes between two types of workflows: **Housekeeping** (fast-track auto-approved) and **Maintenance** (requires departmental approval).

**Key Achievement**: The system implements a complete audit trail, role-based workflow management, and multi-stage approval processes with real-time status tracking.

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend Framework** | FastAPI | 0.115.6 |
| **Database** | PostgreSQL | 16 Alpine (Docker) |
| **ORM** | SQLAlchemy | 2.0.36 |
| **Frontend Framework** | React | 18 + TypeScript |
| **Frontend Builder** | Vite | Latest |
| **Authentication** | JWT (python-jose) | - |
| **Password Hashing** | Bcrypt | - |
| **Styling** | Tailwind CSS | Latest |
| **Internationalization** | i18next | 3 languages (EN, HI, MR) |
| **HTTP Client** | Axios | - |

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Pages: Login | New Complaint | Dashboard | Approvals│  │
│  │        Assignments | Tasks | Admin Management      │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                            ▲       │
│         │ Axios HTTP Requests (JWT Auth)           │       │
│         ▼                                            │       │
└─────────────────────────────────────────────────────────────┘
         │                                            │
         │ CORS enabled: localhost:5173, 127.0.0.1  │
         │                                            │
┌────────▼────────────────────────────────────────────────────┐
│              BACKEND API (FastAPI + Uvicorn)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes:                                              │  │
│  │ • /auth → Login, Registration                       │  │
│  │ • /complaints → CRUD, Status Updates, Approval     │  │
│  │ • /assignments → Create, Update Progress           │  │
│  │ • /feedback → Submit, Retrieve                      │  │
│  │ • /dashboard → Statistics & Analytics              │  │
│  │ • /admin → User Management, Approvals              │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                            ▲       │
│         │ SQL Queries (SQLAlchemy)                  │       │
│         ▼                                            │       │
└─────────────────────────────────────────────────────────────┘
         │
         │ psycopg2-binary
         │
┌────────▼──────────────────────────────────────────────────┐
│           DATABASE (PostgreSQL 16)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Tables:                                          │   │
│  │ • users → User accounts & credentials           │   │
│  │ • complaints → Core complaint data               │   │
│  │ • assignments → Staff task assignments           │   │
│  │ • status_histories → Audit trail                 │   │
│  │ • feedbacks → User satisfaction ratings          │   │
│  │ • departments → Campus departments               │   │
│  │ • locations → Campus physical locations          │   │
│  │ • complaint_attachments → File references        │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 2. USER ROLES & PERMISSION MODEL

### 2.1 Seven User Roles

| Role | Full Name | Primary Responsibility | Can See | Can Do |
|------|-----------|------------------------|---------|--------|
| **STUDENT** | Student/Learner | File and track complaints | Own complaints | Raise, edit, delete, provide feedback |
| **FACULTY** | Faculty Member | File complaints on behalf | Own complaints | Same as student |
| **HOD** | Head of Department | Approve maintenance complaints | Department complaints | Approve/reject maintenance type |
| **HK_MANAGER** | Housekeeping Manager | Manage housekeeping workflow | All complaints | Assign housekeeping to staff |
| **MAINT_MANAGER** | Maintenance Manager | Manage maintenance workflow | All complaints | Assign maintenance (if HOD-approved) to staff |
| **STAFF** | Support Staff | Execute assigned tasks | Assigned complaints | Work on assignments, mark progress/done |
| **ADMIN** | System Administrator | Manage user accounts | All users | Approve/reject user registrations |

### 2.2 Authorization Model

```
Authentication Level:
  JWT Token contains: user_id, role, exp
  Status validation: Users must be "active" (except pending users checking own status)

Authorization Level:
  Role-Based Access Control (RBAC)
  ├─ Resource-level checks (e.g., can only edit own complaint)
  ├─ Department-level checks (e.g., HOD can only approve own dept)
  └─ Status-based checks (e.g., can only close if assignment DONE + feedback confirmed)

User Registration Flow:
  1. User signs up → account created with status = "pending"
  2. Admin approves in admin dashboard → status = "active"
  3. User can now login and access system
```

---

## 3. COMPLAINT WORKFLOW - COMPLETE LIFECYCLE

### 3.1 Complaint Types & Initial Processing

There are **TWO distinct complaint types** with different workflows:

#### **Type A: Housekeeping**
- **Examples**: Cleaning, waste disposal, general hygiene issues
- **Auto-Approval**: YES (instant approval at creation)
- **HOD Involvement**: NO
- **Fast-track**: Goes directly to assignment after creation

#### **Type B: Maintenance**  
- **Examples**: Electrical repairs, plumbing, structural issues
- **Auto-Approval**: NO (requires HOD approval)
- **HOD Involvement**: YES (departmental Head of Department)
- **Approval Process**: HOD must explicitly approve or reject

### 3.2 Complete 8-Stage Workflow

```
START
  │
  ├─→ [STAGE 1: COMPLAINT CREATION]
  │   Student/Faculty files complaint
  │   ├─ If HOUSEKEEPING: auto-approved (APPROVED status)
  │   └─ If MAINTENANCE: pending approval (PENDING approval_status)
  │
  ├─→ [STAGE 2: APPROVAL GATE - MAINTENANCE ONLY]
  │   HOD reviews maintenance complaint
  │   ├─ HOD APPROVES → status: APPROVED, approval_status: APPROVED
  │   ├─ HOD REJECTS → status: CLOSED, workflow ends
  │   └─ Housekeeping SKIPS this stage
  │
  ├─→ [STAGE 3: ASSIGNMENT]
  │   Manager assigns to staff
  │   ├─ HK_Manager assigns housekeeping
  │   ├─ Maint_Manager assigns maintenance (only if approved)
  │   └─ Status: SUBMITTED/APPROVED → ASSIGNED
  │
  ├─→ [STAGE 4: WORK IN PROGRESS]
  │   Staff starts working on assigned task
  │   └─ Status: ASSIGNED → IN_PROGRESS
  │
  ├─→ [STAGE 5: WORK COMPLETION]
  │   Staff marks task as done
  │   └─ Status: IN_PROGRESS → COMPLETED
  │
  ├─→ [STAGE 6: FEEDBACK GATE - CRITICAL]
  │   Student/Faculty provides satisfaction feedback
  │   ├─ Rating 1-5
  │   ├─ Comments
  │   └─ MUST confirm (confirmed=true) to allow closure
  │
  ├─→ [STAGE 7: CLOSURE VALIDATION]
  │   System checks two conditions:
  │   ├─ ✓ Latest assignment.status = DONE
  │   ├─ ✓ Feedback exists AND feedback.confirmed = true
  │   └─ If both true, closure allowed
  │
  └─→ [STAGE 8: COMPLAINT CLOSED]
      Status: COMPLETED → CLOSED
      Complaint archived
      END
```

### 3.3 Detailed Stage-by-Stage Flow

#### **STAGE 1: COMPLAINT CREATION** 
- **Who**: Student or Faculty member
- **Frontend**: New Complaint Page (`/complaints/new`)
- **API Endpoint**: `POST /api/complaints`
- **Input Data**:
  ```json
  {
    "title": "Water Leakage in Lab",
    "description": "Detailed description of issue",
    "complaint_type": "MAINTENANCE",  // or "HOUSEKEEPING"
    "priority": "HIGH",               // LOW, MEDIUM, HIGH, EMERGENCY
    "department_id": 3,
    "building": "Lab Complex",
    "floor": "2",
    "room": "L201",
    "media_files": [uploaded_files]   // optional: images/videos
  }
  ```
- **Backend Processing**:
  ```
  1. Validate input (required fields, file types)
  2. Auto-create location if doesn't exist (building/floor/room combination)
  3. Save attachments to disk: uploads/complaints/{complaint_id}/
  4. For HOUSEKEEPING:
     - Set: approval_status = APPROVED
     - Set: status = SUBMITTED
  5. For MAINTENANCE:
     - Set: approval_status = PENDING
     - Set: status = SUBMITTED
  6. Create Status History entry: "Complaint created"
  ```
- **Output**: Complaint created with unique complaint_id
- **Backend File**: `complaint_service.py` → `create_complaint()`

---

#### **STAGE 2: APPROVAL GATE (MAINTENANCE ONLY)**

**Timeline**: Occurs after complaint creation, only for MAINTENANCE type

##### **Scenario A: HOD Approves**
- **Who**: Head of Department (HOD) for the complaint's department
- **Frontend**: Approvals Page (`/approvals`)
- **When**: When complaint status = SUBMITTED AND approval_status = PENDING
- **API Endpoint**: `POST /api/complaints/{complaint_id}/approve`
- **Action**:
  ```
  1. Verify: User is HOD of complaint's department
  2. Set: approval_status = APPROVED
  3. Set: approved_by = hod.user_id
  4. Set: approval_date = current_timestamp
  5. Update: status = APPROVED
  6. Create Status History: "Complaint approved by HOD"
  ```
- **Next Stage**: Moves to STAGE 3 (Assignment)

##### **Scenario B: HOD Rejects**
- **Who**: Same as above
- **API Endpoint**: `POST /api/complaints/{complaint_id}/reject`
- **Action**:
  ```
  1. Verify: User is HOD of complaint's department
  2. Set: approval_status = REJECTED
  3. Update: status = CLOSED
  4. Set: closed_at = current_timestamp
  5. Create Status History: "Complaint rejected by HOD"
  ```
- **Outcome**: Complaint CLOSED - workflow ends here, no further action needed

**Housekeeping**: Skips this stage entirely - goes directly from SUBMITTED to ready for assignment

---

#### **STAGE 3: ASSIGNMENT**

**Timeline**: After complaint is APPROVED (auto for housekeeping, via HOD for maintenance)

- **Who**: 
  - HK_Manager (for housekeeping complaints)
  - Maint_Manager (for maintenance complaints only)
- **Frontend**: Assignments Page (`/assign`)
- **API Endpoint**: `POST /api/assignments`
- **Prerequisites Check**:
  ```
  ✓ Complaint status NOT in [COMPLETED, CLOSED]
  ✓ No active (PENDING/IN_PROGRESS) assignment exists
  ✓ For MAINTENANCE: approval_status = APPROVED
  ✓ Assigned staff has role = STAFF
  ✓ Staff member status = "active"
  ```
- **Input Data**:
  ```json
  {
    "complaint_id": 42,
    "assigned_to": 15,          // Staff member user_id
    "work_notes": "Initial assessment notes (optional)"
  }
  ```
- **Backend Processing**:
  ```
  1. Validate all prerequisites pass
  2. Create Assignment record:
     - assignment_status = PENDING
     - assigned_to = staff_id
     - assigned_by = current_manager_id
     - assigned_date = now()
  3. If complaint.status in [SUBMITTED, APPROVED]:
     - Update: complaint.status = ASSIGNED
  4. Create Status History: "Staff assigned: [Staff Name]"
  5. Store in database with audit trail
  ```
- **Assignment Details Saved**:
  ```
  assignment_id (unique identifier)
  complaint_id (which complaint)
  assigned_to (staff member)
  assigned_by (which manager)
  assigned_date (when assignment created)
  assignment_status = PENDING (waiting for staff to start)
  ```
- **Next Stage**: Staff begins work (STAGE 4)

---

#### **STAGE 4: WORK IN PROGRESS**

**Timeline**: Staff member logs in and starts working

- **Who**: Staff member (assigned to complaint)
- **Frontend**: My Tasks Page (`/tasks`)
- **API Endpoint**: `PATCH /api/assignments/{assignment_id}`
- **Action**:
  ```
  {
    "assignment_status": "IN_PROGRESS",
    "work_notes": "Starting assessment..."
  }
  ```
- **Backend Processing**:
  ```
  1. Verify: Current user is assigned staff member
  2. Update Assignment: assignment_status = IN_PROGRESS
  3. If complaint.status = ASSIGNED:
     - Update: complaint.status = IN_PROGRESS
  4. Create Status History: "Work started by [Staff Name]"
  5. Update: complaint.updated_at = now()
  ```
- **Status Change**: ASSIGNED → IN_PROGRESS
- **Staff Actions**: Can continue updating work_notes as they progress

---

#### **STAGE 5: WORK COMPLETION**

**Timeline**: Staff finishes the work

- **Who**: Staff member
- **Frontend**: My Tasks Page or Complaint Detail Page
- **API Endpoint**: `PATCH /api/assignments/{assignment_id}`
- **Action**:
  ```
  {
    "assignment_status": "DONE",
    "work_notes": "Work completed. Issue resolved."
  }
  ```
- **Backend Processing**:
  ```
  1. Verify: Current user is assigned staff member
  2. Update Assignment:
     - assignment_status = DONE
     - completion_date = now() (auto-set)
  3. Update Complaint:
     - complaint.status = COMPLETED
     - complaint.updated_at = now()
  4. Create Status History: "Work completed by [Staff Name]"
  ```
- **Status Change**: IN_PROGRESS → COMPLETED
- **Important**: At this point, complaint is NOT yet CLOSED
- **Next Requirement**: Student must provide feedback (STAGE 6)

---

#### **STAGE 6: FEEDBACK SUBMISSION**

**Timeline**: After work is marked COMPLETED

- **Who**: Student/Faculty who raised the complaint
- **Frontend**: Complaint Detail Page
- **API Endpoint**: `POST /api/feedback`
- **Prerequisites**:
  ```
  ✓ User is the complaint raiser
  ✓ Complaint status = COMPLETED
  ✓ No existing feedback for this complaint
  ```
- **Input Data**:
  ```json
  {
    "complaint_id": 42,
    "rating": 5,                     // 1-5 star rating
    "feedback_comment": "Excellent service, issue fully resolved!",
    "confirmed": true                // MUST be true to enable closure
  }
  ```
- **Backend Processing**:
  ```
  1. Validate: No existing feedback (UNIQUE constraint)
  2. Create Feedback record:
     - complaint_id (foreign key)
     - rating (1-5)
     - feedback_comment
     - confirmed (true/false)
     - feedback_date = now()
  3. Store in database
  ```
- **Two Scenarios**:
  - **confirmed = true**: Unblocks closure (allows STAGE 7 → STAGE 8)
  - **confirmed = false**: Complaint stays COMPLETED, cannot be closed

---

#### **STAGE 7: CLOSURE VALIDATION**

**Timeline**: Before final closure (STAGE 8)

- **Prerequisite Check** (automated by backend):
  ```
  System checks TWO conditions simultaneously:
  
  ✓ Condition 1: Latest assignment.assignment_status = DONE
    └─ Verified during STAGE 5
  
  ✓ Condition 2: Feedback exists AND feedback.confirmed = true
    └─ Verified during STAGE 6
  
  BOTH conditions must be TRUE to allow closure
  ```
- **If both TRUE**: Closure endpoint becomes available
- **If either FALSE**: Closure button disabled, error message shown

---

#### **STAGE 8: FINAL CLOSURE**

**Timeline**: When all conditions met

- **Who**: 
  - Student/Faculty (complaint raiser)
  - HK_Manager (for housekeeping)
  - Maint_Manager (for maintenance)
- **Frontend**: Complaint Detail Page
- **API Endpoint**: `POST /api/complaints/{complaint_id}/status-update`
- **Payload**:
  ```json
  {
    "new_status": "CLOSED"
  }
  ```
- **Final Validation**:
  ```
  1. Fetch latest assignment: assignment_status = DONE ✓
  2. Fetch feedback: feedback.confirmed = true ✓
  3. If both pass: proceed with closure
  4. If either fail: reject with error message
  ```
- **Backend Processing**:
  ```
  1. Run validation checks
  2. Update Complaint:
     - complaint.status = CLOSED
     - closed_at = current_timestamp
     - updated_at = now()
  3. Create Status History: "Complaint closed by [User Name]"
  4. Mark assignment as complete in system
  ```
- **Status Change**: COMPLETED → CLOSED
- **End Result**: Complaint archived, workflow complete
- **Backend File**: `complaint_service.py` → `apply_status_update()`

---

### 3.4 Status Transition Diagram

```
Housekeeping Complaint:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│SUBMITTED │───▶│ APPROVED │───▶│ ASSIGNED │───▶│ IN_PROGRESS  │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │ COMPLETED    │
                                                └──────────────┘
                                                        │
                                        (Feedback+Assignment DONE)
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │   CLOSED     │
                                                └──────────────┘

Maintenance Complaint:
┌──────────┐    ┌──────────────────────┐    ┌────────────────┐
│SUBMITTED │───▶│ [HOD APPROVAL GATE]  │───▶│  APPROVED      │
└──────────┘    │ ├─ Approved ────────┐│    └────────────────┘
                │ └─ Rejected ─┐      ││                   │
                └──────────────┼──────┘│                   │
                               │      │                    │
                               ▼      ▼                    ▼
                            ┌──────────┐            ┌──────────────┐
                            │ CLOSED   │            │  ASSIGNED    │
                            └──────────┘            └──────────────┘
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │IN_PROGRESS   │
                                                    └──────────────┘
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │ COMPLETED    │
                                                    └──────────────┘
                                                            │
                                            (Feedback+Assignment DONE)
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │  CLOSED      │
                                                    └──────────────┘
```

---

## 4. DATA MODEL

### 4.1 Core Tables

```
┌─────────────────────────────────────────────────────────────┐
│                      USERS Table                            │
├─────────────────────────────────────────────────────────────┤
│ user_id (PK)         │ student_reg_no                        │
│ name                 │ year_of_study                         │
│ email (UNIQUE)       │ status ('pending'/'active'/'rejected')│
│ password_hash        │ created_at                            │
│ role (7 types)       │                                       │
│ department_id (FK)   │                                       │
│ phone                │                                       │
│ designation          │                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   COMPLAINTS Table                          │
├─────────────────────────────────────────────────────────────┤
│ complaint_id (PK)    │ approval_status (PENDING/APPROVED/...) │
│ title                │ approved_by (FK: Users.user_id)       │
│ description          │ approval_date                         │
│ complaint_type       │ raised_by (FK: Users.user_id)         │
│ priority             │ department_id (FK)                    │
│ status               │ location_id (FK)                      │
│ created_at           │ updated_at                            │
│ closed_at            │                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ASSIGNMENTS Table                         │
├─────────────────────────────────────────────────────────────┤
│ assignment_id (PK)   │ assigned_by (FK: Users.user_id)       │
│ complaint_id (FK)    │ assigned_date                         │
│ assigned_to (FK)     │ completion_date                       │
│ assignment_status    │ work_notes                            │
│ (PENDING/IN_PROGRESS/DONE/CANCELLED)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 STATUS_HISTORIES Table                      │
├─────────────────────────────────────────────────────────────┤
│ history_id (PK)      │ old_status                            │
│ complaint_id (FK)    │ new_status                            │
│ changed_by (FK)      │ remarks (reason for change)           │
│ changed_at           │                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   FEEDBACKS Table                           │
├─────────────────────────────────────────────────────────────┤
│ feedback_id (PK)     │ feedback_comment                      │
│ complaint_id (FK)    │ confirmed (true/false)                │
│ (UNIQUE)             │ feedback_date                         │
│ rating (1-5)         │                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  DEPARTMENTS Table                          │
├─────────────────────────────────────────────────────────────┤
│ department_id (PK)   │ contact_email                         │
│ department_name      │ hod_id (FK: Users.user_id)            │
│ building_name        │ created_at                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  LOCATIONS Table                            │
├─────────────────────────────────────────────────────────────┤
│ location_id (PK)     │ department_id (FK)                    │
│ building_name        │ location_type                         │
│ floor_number         │                                       │
│ room_number          │                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              COMPLAINT_ATTACHMENTS Table                    │
├─────────────────────────────────────────────────────────────┤
│ attachment_id (PK)   │ mime_type                             │
│ complaint_id (FK)    │ file_size (bytes)                     │
│ file_name            │ uploaded_at                           │
│ file_path            │                                       │
│ file_type (inferred) │                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Relationships

```
USER ──┬── DEPARTMENT (as HOD: hod_id)
       │
       ├── COMPLAINTS (as raiser: raised_by)
       │
       ├── COMPLAINTS (as approver: approved_by)
       │
       └── ASSIGNMENTS (as staff: assigned_to)
           │
           └── ASSIGNMENTS (as manager: assigned_by)

DEPARTMENT ──┬── COMPLAINTS (department_id)
             │
             ├── LOCATIONS (department_id)
             │
             └── USERS (department_id: members)

COMPLAINT ──┬── ASSIGNMENTS (complaint_id, one-to-many)
            │
            ├── FEEDBACK (complaint_id, one-to-one unique)
            │
            ├── STATUS_HISTORY (complaint_id, one-to-many)
            │
            ├── COMPLAINT_ATTACHMENTS (complaint_id, one-to-many)
            │
            └── LOCATION (location_id)
```

---

## 5. OFFICER-TO-OFFICER HANDOFF MECHANISM

### 5.1 How Complaints Move Between Officers

The system implements a **sequential handoff model** where a complaint passes through officers in a defined sequence based on role and complaint type.

#### **Housekeeping Workflow - Officer Sequence**

```
Student/Faculty Files Complaint
              │
              ▼
        [AUTO-APPROVED]
              │
              ▼
    HK_Manager Reviews
              │ (assigns to available staff)
              ▼
        Staff Member Receives Assignment
              │ (acknowledges and starts work)
              ▼
        [Work Done]
              │ (provides update via assignment_status)
              ▼
      Student Provides Feedback
              │ (confirms satisfaction)
              ▼
    HK_Manager/Student Closes
```

**Key Points**:
- No approval bottleneck (auto-approved)
- Direct manager-to-staff assignment
- One active assignment per complaint
- Only HK_Manager can create/update assignments for housekeeping

---

#### **Maintenance Workflow - Officer Sequence**

```
Student/Faculty Files Complaint
              │
              ▼
        [PENDING HOD REVIEW]
              │
              ▼
    HOD Approves/Rejects
        If REJECTED → End
        If APPROVED ↓
              │
              ▼
   Maint_Manager Reviews
              │ (assigns to available staff)
              ▼
    Staff Member Receives Assignment
              │ (acknowledges and starts work)
              ▼
        [Work Done]
              │ (provides update via assignment_status)
              ▼
      Student Provides Feedback
              │ (confirms satisfaction)
              ▼
  Maint_Manager/Student Closes
```

**Key Points**:
- Approval gate controlled by HOD (department head)
- HOD has veto power (can reject)
- Only after HOD approval can Maint_Manager assign
- Centralized management: only one Maint_Manager assigns maintenance
- Only one Maint_Manager can work on assignments for maintenance

---

### 5.2 Assignment Mechanics - How Complaint is Passed

#### **Single Assignment Per Complaint**

The system enforces: **Only ONE active assignment per complaint at any time**

```
Complaint Status Timeline with Assignments:

SUBMITTED ──→ APPROVED ──→ [Assignment 1 Created] ──→ ASSIGNED
                           │
                           ├─ assignment_status: PENDING
                           │
                           ▼
                           IN_PROGRESS
                           │
                           ├─ assignment_status: IN_PROGRESS
                           │
                           ▼
                           COMPLETED
                           │
                           ├─ assignment_status: DONE
                           ├─ completion_date set
                           │
                           ▼
                           CLOSED
                           │
                           └─ (Assignment 1 marked complete)

If Work Not Satisfactory:
                           ▼
                           COMPLETED → [Can Create New Assignment]
                           (Previous assignment stays DONE, new one created)
```

---

#### **Assignment Creation Logic**

```python
# Validation before creating new assignment
if active_assignment_exists(complaint_id):
    raise Error("Cannot create new assignment - active one exists")

# One assignment active means complaint is being worked on
active = assignment where status in [PENDING, IN_PROGRESS]

# Only when completed AND satisfaction confirmed:
if complaint.status == COMPLETED and feedback.confirmed:
    allow_closure()
    # Can now optionally create new assignment if needed
```

---

### 5.3 Status History - Complete Audit Trail

Every handoff and status change is recorded in **STATUS_HISTORIES** table:

```sql
INSERT INTO status_histories (
    complaint_id, 
    changed_by, 
    old_status, 
    new_status, 
    remarks, 
    changed_at
) VALUES (
    42,                    -- Which complaint
    101,                   -- Who made the change (user_id)
    'SUBMITTED',          -- From
    'APPROVED',           -- To
    'HOD Approved',       -- Reason/Context
    NOW()                 -- Timestamp
);
```

**Timeline Example for Maintenance**:
```
2024-01-15 10:00 - Changed by 15 (Student): SUBMITTED
2024-01-15 11:30 - Changed by 22 (HOD): SUBMITTED → APPROVED
2024-01-15 12:00 - Changed by 8 (Maint_Manager): APPROVED → ASSIGNED
2024-01-15 12:30 - Changed by 45 (Staff): ASSIGNED → IN_PROGRESS
2024-01-16 09:00 - Changed by 45 (Staff): IN_PROGRESS → COMPLETED
2024-01-16 10:00 - Changed by 15 (Student): COMPLETED → CLOSED
```

This creates a complete audit trail visible to all parties in the **Timeline view**.

---

### 5.4 Role-Based Visibility & Filtering

**Each role sees different complaint lists**:

```
Student/Faculty:
  - Only their own complaints
  - Full lifecycle visibility
  - Can edit/delete before assignment

HOD:
  - Only complaints from their department
  - Filtered to: status=SUBMITTED, type=MAINTENANCE, approval_status=PENDING
  - Can approve/reject

HK_Manager:
  - All housekeeping complaints (operational view)
  - Sees: SUBMITTED, APPROVED, ASSIGNED, IN_PROGRESS, COMPLETED
  - Can assign/reassign

Maint_Manager:
  - All maintenance complaints (operational view)
  - Sees only APPROVED ones for assignment
  - Can assign/reassign

Staff:
  - Only complaints assigned to them
  - Shows current/past assignments
  - Updates work progress

Admin:
  - User management view
  - Not involved in complaint workflow
```

---

## 6. FRONTEND USER INTERFACE PAGES

### 6.1 Page Structure by Role

```
┌─────────────────────────────────────────────────────────────┐
│                 UNAUTHENTICATED PAGES                       │
├─────────────────────────────────────────────────────────────┤
│ ├─ Landing Page (/)          - Info about system            │
│ ├─ Login (/login)            - Authentication              │
│ ├─ Signup (/signup)          - User registration           │
│ ├─ About (/about)            - Project information         │
│ └─ Contact (/contact)        - Support/feedback contact    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         STUDENT / FACULTY PAGES (Common)                    │
├─────────────────────────────────────────────────────────────┤
│ ├─ Dashboard (/dashboard)    - Personal statistics          │
│ │  └─ Shows: My open complaints, status summary             │
│ │                                                            │
│ ├─ New Complaint (/complaints/new)                          │
│ │  └─ Form to file housekeeping or maintenance complaint    │
│ │  └─ Upload media attachments (images/videos)             │
│ │                                                            │
│ ├─ Complaints List (/complaints)                           │
│ │  └─ All complaints filed by student                      │
│ │  └─ Filter by status, type, priority                     │
│ │                                                            │
│ ├─ Complaint Detail (/complaints/{id})                     │
│ │  ├─ Full complaint information                           │
│ │  ├─ Status timeline (from status_histories)              │
│ │  ├─ Assignment information & progress                    │
│ │  ├─ Attached media preview                               │
│ │  ├─ Feedback form (when COMPLETED)                       │
│ │  └─ Close complaint button (when feedback + assignment   │
│ │      DONE)                                                │
│ │                                                            │
│ └─ (Edit/Delete only available before assignment)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              HOD PAGES (Head of Department)                 │
├─────────────────────────────────────────────────────────────┤
│ ├─ Dashboard (/dashboard)                                   │
│ │  └─ Stats: Pending approvals, department statistics      │
│ │                                                            │
│ ├─ Approvals (/approvals)                                   │
│ │  └─ Queue of maintenance complaints awaiting approval     │
│ │  └─ For each: Approve button, Reject button              │
│ │  └─ Can add approval remarks                              │
│ │                                                            │
│ ├─ Complaints List (/complaints)                           │
│ │  └─ All complaints in their department (filtered)        │
│ │                                                            │
│ └─ Complaint Detail (/complaints/{id})                     │
│    └─ View complaint details, approve/reject               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│    MANAGER PAGES (HK_Manager & Maint_Manager)              │
├─────────────────────────────────────────────────────────────┤
│ ├─ Dashboard (/dashboard)                                   │
│ │  └─ Stats: Pending assignments, completion rates          │
│ │                                                            │
│ ├─ Assignments (/assign)                                    │
│ │  └─ List of complaints to be assigned                     │
│ │  └─ Staff availability/selection                          │
│ │  └─ Create assignment modal                               │
│ │  └─ Bulk assignment operations                            │
│ │                                                            │
│ ├─ Complaints List (/complaints)                           │
│ │  └─ All complaints (operational view)                     │
│ │  └─ Filter by status, priority, assignment               │
│ │                                                            │
│ └─ Complaint Detail (/complaints/{id})                     │
│    ├─ Assign button (if not assigned)                      │
│    ├─ View assignment & progress                           │
│    ├─ Close complaint (if eligible)                        │
│    └─ Reassign if needed                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  STAFF PAGES (Support Staff)                │
├─────────────────────────────────────────────────────────────┤
│ ├─ Dashboard (/dashboard)                                   │
│ │  └─ Stats: My open tasks, completion rate                │
│ │                                                            │
│ ├─ My Tasks (/tasks)                                        │
│ │  └─ Current assignments to this staff member              │
│ │  ├─ Grouped by status (PENDING, IN_PROGRESS, DONE)       │
│ │  ├─ Accept task (mark IN_PROGRESS)                       │
│ │  ├─ Update work progress                                  │
│ │  └─ Mark complete (mark DONE)                            │
│ │                                                            │
│ ├─ Complaints List (/complaints)                           │
│ │  └─ Only complaints assigned to them (filtered)          │
│ │                                                            │
│ └─ Complaint Detail (/complaints/{id})                     │
│    └─ Assignment update interface (progress/status)         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ADMIN PAGES (System Admin)                 │
├─────────────────────────────────────────────────────────────┤
│ ├─ Admin Dashboard (/admin)                                 │
│ │  └─ System-wide statistics                                │
│ │  └─ User registration requests                            │
│ │                                                            │
│ ├─ User Management (/admin/users)                           │
│ │  ├─ List all users with filters                          │
│ │  ├─ Pending registration approvals                        │
│ │  ├─ Approve/Reject buttons for pending users             │
│ │  └─ Active/Inactive status management                    │
│ │                                                            │
│ └─ System Statistics                                        │
│    └─ Overall system health & usage stats                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Key Page Features

#### **New Complaint Page** (`/complaints/new`)
```
┌─────────────────────────────────────────────────┐
│ NEW COMPLAINT FORM                              │
├─────────────────────────────────────────────────┤
│ Department: [Dropdown - Auto-filled from user]  │
│ Building: [Dropdown + Other option]             │
│ Floor: [Dropdown + Other option]                │
│ Room/Wing: [Text input - Optional]              │
│ Title: [Required text]                          │
│ Description: [Required textarea]                │
│ Complaint Type: ○ Housekeeping ● Maintenance  │
│ Priority: [HIGH / MEDIUM / LOW / EMERGENCY]    │
│ Media Attachments: [Upload images/videos]       │
│ [SUBMIT]  [CANCEL]                             │
└─────────────────────────────────────────────────┘
```

#### **Complaint Detail Page** (`/complaints/{id}`)
```
┌─────────────────────────────────────────────────┐
│ COMPLAINT DETAIL                                │
├─────────────────────────────────────────────────┤
│ Title: [Complaint title]                        │
│ Status: [Badge]  Priority: [Badge]             │
│ Complaint Type: [Housekeeping/Maintenance]     │
│ Raised By: [Student Name] on [Date]            │
│ Department: [Department Name]                   │
│ Location: [Building, Floor, Room]              │
│ ├─ Description                                  │
│ │ [Full description text]                      │
│ │                                               │
│ ├─ Attachments                                  │
│ │ [Image 1 preview] [Image 2 preview]          │
│ │ [Video 1 thumbnail]                          │
│ │                                               │
│ ├─ Timeline                                     │
│ │ 2024-01-15 10:00 - Complaint Created         │
│ │ 2024-01-15 11:30 - Approved by HOD           │
│ │ 2024-01-15 12:00 - Staff Assigned            │
│ │ 2024-01-15 12:30 - Work Started              │
│ │ 2024-01-16 09:00 - Work Completed            │
│ │ 2024-01-16 10:00 - Feedback Submitted        │
│ │ 2024-01-16 10:30 - Complaint Closed          │
│ │                                               │
│ ├─ Current Assignment                          │
│ │ Staff: [Name] | Status: [IN_PROGRESS]       │
│ │ Work Notes: [Progress update]                │
│ │ [Update Progress] [Mark Done]                │
│ │                                               │
│ ├─ Feedback (if COMPLETED)                     │
│ │ Rating: ★★★★☆ (4/5)                         │
│ │ Comment: [Satisfaction comment]              │
│ │ Confirmed: ✓ Yes                             │
│ │                                               │
│ └─ Actions                                      │
│   [Edit] [Delete] [Assign] [Close] [More]     │
└─────────────────────────────────────────────────┘
```

#### **Approvals Page** (`/approvals`) - HOD View
```
┌─────────────────────────────────────────────────┐
│ PENDING APPROVALS (Maintenance Only)           │
├─────────────────────────────────────────────────┤
│ Filter: [All] [Pending] [Status...]             │
│                                                  │
│ Complaint #42                                   │
│ ├─ Title: Electrical Issue in Lab              │
│ ├─ Raised by: Student A on 2024-01-15          │
│ ├─ Location: Lab Complex, 2nd Floor, L201      │
│ ├─ Description: [truncated...]                 │
│ └─ [APPROVE] [REJECT with remarks]             │
│                                                  │
│ Complaint #45                                   │
│ ├─ Title: Plumbing Issue in Hostel             │
│ ├─ Raised by: Faculty B on 2024-01-15          │
│ ├─ Location: Hostel A, 3rd Floor               │
│ ├─ Description: [truncated...]                 │
│ └─ [APPROVE] [REJECT with remarks]             │
└─────────────────────────────────────────────────┘
```

#### **Assignments Page** (`/assign`) - Manager View
```
┌─────────────────────────────────────────────────┐
│ ASSIGN COMPLAINTS TO STAFF                      │
├─────────────────────────────────────────────────┤
│ Filter: Type [All/HK/Maint] Status [All...]     │
│ Sort: [Newest] [Priority] [Due Date]            │
│                                                  │
│ Complaint #42                                   │
│ ├─ Title: [Complaint title]                    │
│ ├─ Priority: [HIGH] | Status: [APPROVED]      │
│ ├─ Staff Assignment:                           │
│ │  [Select Staff Member ▼] | [ASSIGN]         │
│ │                                               │
│ └─ Work Notes: [Optional]                      │
│                                                  │
│ Complaint #45                                   │
│ ├─ Title: [Complaint title]                    │
│ ├─ Already Assigned: Staff C (IN_PROGRESS)    │
│ └─ [Reassign] [View Details]                  │
└─────────────────────────────────────────────────┘
```

#### **My Tasks Page** (`/tasks`) - Staff View
```
┌─────────────────────────────────────────────────┐
│ MY ASSIGNED TASKS                               │
├─────────────────────────────────────────────────┤
│ PENDING (1 task)                                │
│ ├─ Complaint #48: Water Leak in Library        │
│ │  Assigned: 2024-01-16 10:00                  │
│ │  Priority: [MEDIUM]                          │
│ │  [START WORK] [View Details]                 │
│ │                                               │
│ IN_PROGRESS (2 tasks)                          │
│ ├─ Complaint #42: Electrical Issue in Lab      │
│ │  Started: 2024-01-15 12:30                   │
│ │  [Progress: 60%] [MARK DONE]                 │
│ │  Work Notes: [Diagnostics in progress...]    │
│ │                                               │
│ ├─ Complaint #44: Cleaning in Corridor        │
│ │  Started: 2024-01-15 15:00                   │
│ │  [Progress: 80%] [MARK DONE]                 │
│ │                                               │
│ COMPLETED (0 tasks - archived after feedback)  │
└─────────────────────────────────────────────────┘
```

---

## 7. KEY TECHNICAL FEATURES

### 7.1 Authentication & Authorization

```python
# JWT-based authentication flow:
1. User submits credentials → POST /auth/login
2. Backend validates email/password
3. Generate JWT token with claims: {user_id, role, exp}
4. Return token to frontend
5. Frontend stores in localStorage
6. All subsequent requests include Authorization header
7. Backend validates token on each request
8. Extract user_id and role for authorization checks

# Authorization decorator example:
@router.post("/approve")
@require_roles("HOD")
async def approve_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only users with HOD role can access
    # Additional check: HOD of complaint's department only
```

---

### 7.2 File Upload & Attachment Handling

```
Upload Process:
  1. User selects media file on NewComplaintPage
  2. Submit form with FormData (multipart)
  3. POST /api/complaints with file data
  4. Backend:
     - Create complaint record first
     - Get complaint_id
     - Save file to: uploads/complaints/{complaint_id}/
     - Create complaint_attachment record
     - Return complaint_id to frontend
  5. Frontend redirects to detail page

File Serving:
  - Static mount: /api/uploads → backend/uploads/
  - Access files via GET /uploads/complaints/{id}/filename
  - Supports: images (jpg, png, gif), videos (mp4, mov, etc.)
  - File type inferred from MIME type

Storage Structure:
  backend/
  └─ uploads/
     └─ complaints/
        ├─ 42/
        │  ├─ photo_1.jpg
        │  ├─ photo_2.jpg
        │  └─ video_1.mp4
        ├─ 43/
        └─ 44/
```

---

### 7.3 Status History & Audit Trail

```python
# Every status change creates a history record:

def create_status_history(
    complaint_id: int,
    changed_by: int,           # user_id
    old_status: str,           # Previous status or null
    new_status: str,           # New status
    remarks: str,              # Reason for change
    session: Session
):
    history = StatusHistory(
        complaint_id=complaint_id,
        changed_by=changed_by,
        old_status=old_status,
        new_status=new_status,
        remarks=remarks,
        changed_at=datetime.now()
    )
    session.add(history)
    session.commit()

# Timeline display fetches and orders by changed_at DESC
```

---

### 7.4 Internationalization (i18n)

```
Supported Languages:
  - English (en.json)
  - Hindi (hi.json)
  - Marathi (mr.json)

Frontend Implementation:
  - i18next library for translations
  - Language toggle in Navbar
  - Persisted in localStorage
  - All UI text dynamically translated

Example translation keys:
  - "complaint.title"
  - "complaint.new"
  - "role.hod"
  - "status.approved"
  - "action.approve"
```

---

## 8. WORKFLOW RULES & CONSTRAINTS

### 8.1 Complaint Creation Rules

```
✓ Student or Faculty can raise
✓ Must select valid department, building, floor, room
✓ Title and description required
✓ Priority must be selected (LOW/MEDIUM/HIGH/EMERGENCY)
✓ Complaint type must be selected (HOUSEKEEPING/MAINTENANCE)
✓ Media files optional (images/videos only)

✗ Cannot create if not authenticated and active
✗ Cannot leave required fields empty
✗ Cannot select invalid department/location
```

---

### 8.2 Approval Rules (Maintenance Only)

```
✓ Only HOD of the department can approve
✓ Only maintenance type complaints require approval
✓ Can approve only SUBMITTED/PENDING approval_status
✓ Can optionally add remarks

✗ Housekeeping auto-approved (no HOD gate)
✗ Non-HOD users cannot approve
✗ Cannot approve other departments' complaints
✗ Cannot approve if already approved/rejected
```

---

### 8.3 Assignment Rules

```
✓ Only manager of complaint type can assign
  - HK_Manager for housekeeping
  - Maint_Manager for maintenance
✓ Staff member must have role = STAFF
✓ Staff member must have status = active
✓ Complaint must be APPROVED (or auto-approved for HK)
✓ No active assignment exists for complaint
✓ Can assign multiple times (sequentially)

✗ Cannot assign before approval (for maintenance)
✗ Cannot assign while active assignment in progress
✗ Cannot assign to non-staff users
✗ Cannot assign if complaint CLOSED/REJECTED
```

---

### 8.4 Work Progress Rules

```
✓ Only assigned staff member can update their assignment
✓ Or manager of the type can update any assignment
✓ Can mark IN_PROGRESS only from PENDING
✓ Can mark DONE only from IN_PROGRESS
✓ Can update work_notes at any time

✗ Cannot skip stages (IN_PROGRESS → COMPLETED directly)
✗ Cannot mark DONE if not assigned to user
✗ Cannot update assignment after marked DONE (blocked)
```

---

### 8.5 Closure Rules (CRITICAL)

```
BOTH conditions must be TRUE:

Condition 1: Assignment Status
  ✓ Latest assignment.assignment_status = DONE

Condition 2: Feedback Confirmation
  ✓ Feedback exists
  ✓ Feedback.confirmed = true

If either FALSE:
  ✗ Closure endpoint returns error
  ✗ Close button disabled in UI
  ✗ Error message: "Cannot close: assignment incomplete" or 
                    "Feedback confirmation required"

Who Can Close:
  ✓ Complaint raiser (Student/Faculty)
  ✓ HK_Manager (for housekeeping)
  ✓ Maint_Manager (for maintenance)
```

---

### 8.6 Editing Rules

```
✓ Can edit only own complaints
✓ Can edit only if status = SUBMITTED or APPROVED
✓ Can edit only if no active assignment exists
✓ Can edit: title, description, priority
✓ Cannot edit: type, department, location (once created)

✗ Cannot edit after assignment created
✗ Cannot edit if complaint CLOSED/COMPLETED
✗ Cannot edit others' complaints
```

---

### 8.7 Deletion Rules

```
✓ Can delete only own complaints
✓ Can delete only if status = SUBMITTED or APPROVED
✓ Can delete only if no assignments exist
✓ For maintenance: can delete only if approval_status = PENDING

✗ Cannot delete if assignment exists
✗ Cannot delete if COMPLETED/CLOSED/IN_PROGRESS
✗ Cannot delete others' complaints
✗ Cannot delete approved maintenance (HOD approval is final)
```

---

## 9. SYSTEM FLOW EXAMPLES

### 9.1 Example 1: Housekeeping Complaint (Fast-Track)

```
Timeline:
---------

Day 1 - 10:00 AM
  Student files complaint: "Broken fan in Lab 201"
  Type: HOUSEKEEPING
  
  System automatically:
  ├─ Creates complaint with ID #42
  ├─ Sets status = SUBMITTED
  ├─ Sets approval_status = APPROVED (auto)
  └─ Creates status history entry

  
Day 1 - 10:30 AM
  HK_Manager logs in, sees "New housekeeping complaint"
  ├─ Opens Assignments page
  ├─ Selects complaint #42
  ├─ Chooses Staff Member: Raj
  ├─ Clicks ASSIGN
  
  System:
  ├─ Creates assignment record
  ├─ Sets assignment_status = PENDING
  ├─ Updates complaint status = ASSIGNED
  └─ Sends notification to Raj

  
Day 1 - 11:00 AM
  Raj logs in, sees "New task assigned"
  ├─ Opens My Tasks page
  ├─ Sees complaint #42
  ├─ Clicks START WORK
  ├─ Updates assignment_status = IN_PROGRESS
  
  System:
  ├─ Updates complaint status = IN_PROGRESS
  └─ Starts tracking work time

  
Day 1 - 02:30 PM
  Raj completes work, updates:
  ├─ assignment_status = DONE
  ├─ work_notes = "Fan replaced successfully"
  
  System:
  ├─ Sets completion_date = now
  └─ Updates complaint status = COMPLETED

  
Day 1 - 03:00 PM
  Student receives notification: "Your complaint is resolved"
  ├─ Logs in
  ├─ Opens complaint #42
  ├─ Sees FEEDBACK FORM (available only now)
  ├─ Provides:
  │  ├─ Rating: 5 stars
  │  ├─ Comment: "Excellent service!"
  │  └─ CONFIRM: ✓ Yes
  
  System:
  ├─ Creates feedback record
  └─ feedback.confirmed = true

  
Day 1 - 03:15 PM
  Student or HK_Manager can now close
  ├─ Clicks CLOSE COMPLAINT
  
  System:
  ├─ Validates:
  │  ├─ ✓ assignment_status = DONE
  │  ├─ ✓ feedback.confirmed = true
  │  └─ ✓ Both conditions met
  ├─ Updates complaint status = CLOSED
  ├─ Sets closed_at = now
  └─ Creates final status history entry

FINAL STATUS: CLOSED
Timeline view shows complete journey with all actors
```

---

### 9.2 Example 2: Maintenance Complaint (With HOD Approval)

```
Timeline:
---------

Day 1 - 09:00 AM
  Faculty files complaint: "Electrical hazard in classroom"
  Type: MAINTENANCE
  
  System:
  ├─ Creates complaint ID #43
  ├─ Sets status = SUBMITTED
  ├─ Sets approval_status = PENDING (requires HOD)
  └─ Creates status history entry

  
Day 1 - 09:30 AM
  HOD logs in, sees "Pending approval in my queue"
  ├─ Opens Approvals page
  ├─ Sees complaint #43
  ├─ Reviews details, attachments
  ├─ Approves with remark: "Approved for urgent repair"
  
  System:
  ├─ Sets approval_status = APPROVED
  ├─ Sets approved_by = HOD_user_id
  ├─ Updates status = APPROVED
  ├─ Sets approval_date = now
  └─ Creates status history: "Approved by HOD"

  
Day 1 - 10:00 AM
  Maint_Manager logs in, sees "New maintenance ready for assignment"
  ├─ Opens Assignments page (only approved ones shown)
  ├─ Sees complaint #43
  ├─ Selects Staff Member: Vikram
  ├─ Clicks ASSIGN
  
  System:
  ├─ Creates assignment record
  ├─ Sets assignment_status = PENDING
  ├─ Updates complaint status = ASSIGNED
  └─ Sends notification to Vikram

  
Day 1 - 10:30 AM
  Vikram acknowledges task:
  ├─ Logs in, sees task assigned
  ├─ Clicks START WORK
  ├─ Updates assignment_status = IN_PROGRESS
  
  System:
  └─ Updates complaint status = IN_PROGRESS

  
Day 2 - 11:00 AM
  Vikram completes electrical repair:
  ├─ Updates assignment_status = DONE
  ├─ work_notes = "Electrical hazard fixed. Safety check passed."
  
  System:
  ├─ Sets completion_date = now
  └─ Updates complaint status = COMPLETED

  
Day 2 - 02:00 PM
  Faculty logs in, sees "Your complaint is resolved"
  ├─ Reviews work done by Vikram
  ├─ Submits feedback:
  │  ├─ Rating: 5 stars
  │  ├─ Comment: "Professional and quick fix"
  │  └─ CONFIRM: ✓ Yes
  
  System:
  └─ feedback.confirmed = true

  
Day 2 - 02:15 PM
  Faculty or Maint_Manager closes:
  ├─ Clicks CLOSE COMPLAINT
  
  System:
  ├─ Validates both conditions ✓
  ├─ Updates status = CLOSED
  └─ Timeline shows complete journey

FINAL STATUS: CLOSED
All officers involved see this in their respective history views
```

---

### 9.3 Example 3: Maintenance Rejection by HOD

```
Timeline:
---------

Day 1 - 09:00 AM
  Student files maintenance complaint: "Paint peeling in hallway"
  
  System:
  ├─ Creates complaint ID #44
  ├─ Sets status = SUBMITTED
  └─ Sets approval_status = PENDING

  
Day 1 - 10:00 AM
  HOD reviews complaint #44
  ├─ Decides: Not essential maintenance (cosmetic issue)
  ├─ Clicks REJECT
  ├─ Adds remark: "Cosmetic issue, defer to next quarter maintenance"
  
  System:
  ├─ Sets approval_status = REJECTED
  ├─ Updates status = CLOSED
  ├─ Sets closed_at = now
  └─ Creates status history: "Rejected by HOD - [remark]"

  
Day 1 - 10:30 AM
  Student receives notification: "Your complaint was not approved"
  ├─ Opens detail page
  ├─ Sees rejection reason in timeline
  ├─ Can see HOD's remark

FINAL STATUS: CLOSED (via rejection)
No assignment ever created
No staff member involved
Complaint ends at approval stage
```

---

## 10. SYSTEM STATISTICS & DASHBOARD

### 10.1 Role-Specific Dashboard Statistics

```
STUDENT/FACULTY Dashboard:
├─ Total Complaints: 15
├─ Pending (SUBMITTED/APPROVED): 2
├─ In Progress: 1
├─ Completed (awaiting feedback): 1
├─ Closed: 11
└─ By Type: Housekeeping (8), Maintenance (7)

HOD Dashboard:
├─ Total Complaints (their dept): 24
├─ Pending Approvals: 3 ← Action required
├─ Completed: 18
├─ Avg Approval Time: 2.4 hours
├─ Approval Rate: 92% (8 rejected)
└─ Workload by Type: Maintenance (24)

MANAGER Dashboard:
├─ Total Assignments: 42
├─ Pending (not started): 5
├─ In Progress: 8
├─ Completed: 29
├─ Avg Completion Time: 18 hours
├─ Staff Utilization: 85%
└─ Resolution Rate: 88%

STAFF Dashboard:
├─ My Open Tasks: 3
│  ├─ Pending: 1
│  └─ In Progress: 2
├─ Completed This Month: 15
├─ Avg Task Time: 4.5 hours
└─ Performance Rating: 4.8/5

ADMIN Dashboard:
├─ Total Users: 145
├─ Pending Approvals: 8 ← Action required
├─ Active Users: 137
├─ System Uptime: 99.8%
├─ Total Complaints Processed: 2,847
├─ Avg Resolution Time: 16.3 hours
└─ Satisfaction Score: 4.6/5
```

---

## 11. KEY INSIGHTS & DESIGN DECISIONS

### 11.1 Why Two-Status Model?

The system uses TWO status fields:
- **`status`**: Workflow progression (SUBMITTED → APPROVED → ASSIGNED → ... → CLOSED)
- **`approval_status`**: HOD gate (PENDING → APPROVED/REJECTED)

This design allows:
- Maintenance complaints to "wait" at HOD level while status remains SUBMITTED
- Housekeeping to bypass approval but still track submission
- Complete audit trail of approval decisions
- Different business rules for different complaint types

---

### 11.2 Assignment as Separate Entity

Rather than just assigning user_id on complaint, the system uses:
- **Separate ASSIGNMENTS table**
- Tracks: who, when, progress, notes, completion date
- Allows multiple assignments (sequentially) for same complaint
- Complete handoff history for audit trail
- Enables reassignment without losing original assignment context

---

### 11.3 Feedback as Closure Gate

Complaints don't auto-close after work is done.
Why?
- Ensures student satisfaction is confirmed
- Raiser has chance to inspect completed work
- Can request re-work if unsatisfactory
- `confirmed=true` is the explicit sign-off

---

### 11.4 Status History is Append-Only

Every change creates a history entry that is never deleted/updated.
Why?
- Complete audit trail for accountability
- Legal compliance (institutional records)
- Timeline visualization
- Dispute resolution (who did what when)

---

## 12. SECURITY CONSIDERATIONS

### 12.1 Authentication
- JWT tokens with expiration
- Bcrypt password hashing (not stored as plaintext)
- Token validated on every protected endpoint

### 12.2 Authorization
- Role-based access control (RBAC)
- Department-level scoping for HOD
- Resource-level ownership checks (can only edit own complaint)
- Endpoint-level role enforcement

### 12.3 Data Isolation
- Students see only own complaints
- Staff see only assigned complaints
- HOD sees only department complaints
- Admin has full access but isolated view

### 12.4 File Security
- File uploads stored outside web root
- File type validation (images/videos only)
- File size limits enforced
- Served via static mount with access control

---

## 13. FUTURE ENHANCEMENTS

1. **Real-time Notifications**: Replace polling with WebSockets
2. **Email Notifications**: Send emails on status changes
3. **SLA Management**: Track complaint resolution time vs SLA
4. **Escalation**: Auto-escalate if past SLA
5. **Reassignment**: Allow reassignment if staff member unavailable
6. **Categories**: Subcategories for complaint types
7. **Rating Migration**: Move to complaint rating (avg of feedbacks)
8. **Bulk Operations**: Bulk approve/assign/close
9. **Advanced Analytics**: Charts, trends, predictions
10. **Mobile App**: Native mobile application for field staff

---

## CONCLUSION

The VJTI Complaint Management System implements a comprehensive, role-based complaint management workflow with two distinct paths:

1. **Housekeeping (Fast-Track)**: Auto-approved → Manager assigns → Staff executes → Closed
2. **Maintenance (Gated)**: HOD approves → Manager assigns → Staff executes → Closed

The system ensures:
- ✅ Accountability through complete audit trails
- ✅ Proper authorization at each stage
- ✅ Sequential handoffs between different officers
- ✅ Quality gates (feedback confirmation before closure)
- ✅ Multi-language support
- ✅ File attachment support
- ✅ Real-time status tracking

All complaints flow through defined states with clear role responsibilities, creating a transparent and manageable process for campus facility management.

---

**Document Version**: 1.0  
**Created**: April 23, 2026  
**Prepared for**: Final Project Report
