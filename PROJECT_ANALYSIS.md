# VJTI College Complaint Management System - Comprehensive Analysis

## 1. PROJECT OVERVIEW

### System Purpose
The VJTI Complaint Management System is a production-style full-stack web application designed to manage campus facility complaints. It distinguishes between two complaint workflows:
- **Housekeeping**: Direct assignment by Housekeeping Manager (no HOD approval required)
- **Maintenance**: Requires HOD approval before Maintenance Manager assignment

### Technology Stack

**Backend:**
- Framework: FastAPI 0.115.6
- Database: PostgreSQL (via SQLAlchemy 2.0.36 ORM)
- Authentication: JWT (python-jose with cryptography)
- Password: bcrypt hashing
- API Server: Uvicorn
- Database Connection: psycopg2-binary

**Frontend:**
- Framework: React 18 (TypeScript + Vite)
- State Management: React Context (Authentication)
- Styling: Tailwind CSS
- HTTP Client: Axios
- Internationalization: i18next (English, Hindi, Marathi)
- UI Components: Custom components with Tailwind

**Deployment:**
- Database Container: PostgreSQL 16 Alpine (Docker)
- Backend: FastAPI (Uvicorn)
- Frontend: Vite dev server → production build

### API Architecture
- **Base Path**: `/api` (all routes)
- **Health Check**: `GET /health`
- **CORS Enabled**: localhost:5173, 127.0.0.1:5173
- **File Uploads**: Mounted at `/uploads` for serving complaint attachments
- **Pagination**: `X-Total-Count` header for list endpoints

---

## 2. USER ROLES & PERMISSIONS

### Role Definitions

| Role | Description | Permissions |
|------|-------------|------------|
| **Student** | Submits complaints, provides feedback | Raise complaints (both types), view own complaints, submit feedback, update own pending complaints |
| **Faculty** | Same as Student | Same as Student |
| **HOD** (Head of Department) | Approves/rejects maintenance complaints for their department | Approve/reject maintenance complaints for their dept, view dept complaints, no assignment authority |
| **HK_Manager** | Manages housekeeping workflow | Assign housekeeping complaints to staff, create assignments, view all complaints, update assignments |
| **Maint_Manager** | Manages maintenance workflow | Assign maintenance complaints (only after HOD approval) to staff, create/update assignments, view all complaints |
| **Staff** | Executes complaint work | Accept and execute assignments, mark assignments as Done/In Progress, view assigned complaints |
| **Admin** | System administration | Approve/reject user registrations, manage user status (pending→active→rejected), view user statistics |

### Authentication & Authorization
- **JWT-based**: Token contains `sub` (user_id) and `role` claims
- **Status Validation**: Users must be "active" (except for checking own status when "pending")
- **Role-based Access Control (RBAC)**: Implemented via `require_roles()` dependency decorator
- **Department Scoping**: HODs can only approve/view complaints for their department
- **User Verification Flow**: Registration → "pending" status → Admin approval → "active" status

---

## 3. COMPLAINT WORKFLOW LIFECYCLE

### Complete Status Transition Diagram

```
Creation Phase:
  Housekeeping: Submitted → Approved (auto-approved)
  Maintenance: Submitted → Submitted (pending HOD review)

Approval Phase (Maintenance Only):
  Submitted + Pending → [HOD Approve] → Approved
  Submitted + Pending → [HOD Reject] → Closed (ends workflow)

Assignment Phase:
  Approved → [Manager Assigns] → Assigned

Execution Phase:
  Assigned → [Staff Starts] → In Progress
  In Progress → [Staff Completes] → Completed

Resolution Phase:
  Completed → [Student/Manager Closes] → Closed (requires feedback confirmed + assignment Done)
```

### Detailed State Transitions

#### 1. **Complaint Creation** (Route: `POST /api/complaints`)
- **Who**: Student or Faculty only
- **Input**: Title, description, complaint type, priority, department, location (building/floor/room), optional media files
- **Logic**:
  - Housekeeping: Automatically set `approval_status = APPROVED` and `status = SUBMITTED`
  - Maintenance: Set `approval_status = PENDING` and `status = SUBMITTED`
  - Location auto-created if doesn't exist (scoped to department/building/floor)
  - Attachments saved to `uploads/complaints/{complaint_id}/`
  - Status history entry created with remarks "Complaint created"

**Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L92-L135) - `create_complaint()`

#### 2. **Complaint Editing** (Route: `PATCH /api/complaints/{complaint_id}`)
- **Who**: Raiser only (if complaint owner)
- **Allowed When**: Status = `SUBMITTED` or `APPROVED` AND no active assignment
- **Fields Editable**: Title, description, priority
- **Restrictions**: Cannot edit after assignment is active

**Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L231-L252)

#### 3. **HOD Approval** (Route: `POST /api/complaints/{complaint_id}/approve`)
- **Who**: HOD of the complaint's department only
- **Prerequisites**: 
  - Complaint type = `MAINTENANCE`
  - `approval_status = PENDING`
- **Action**:
  - Set `approval_status = APPROVED`
  - Set `approved_by = hod.user_id`
  - Set `approval_date = now()`
  - Status: `SUBMITTED` → `APPROVED`
  - Create status history entry

**Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L310-L338)

#### 4. **HOD Rejection** (Route: `POST /api/complaints/{complaint_id}/reject`)
- **Who**: HOD of the complaint's department only
- **Prerequisites**: Same as approval
- **Action**:
  - Set `approval_status = REJECTED`
  - Status: `SUBMITTED` → `CLOSED` (complaint ends here)
  - Set `closed_at = now()`
  - Create status history entry

**Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L341-L363)

#### 5. **Assignment Creation** (Route: `POST /api/assignments`)
- **Who**: 
  - HK_Manager for Housekeeping complaints
  - Maint_Manager for Maintenance complaints (only if approved)
- **Prerequisites**:
  - Complaint status ∈ {SUBMITTED, APPROVED, ASSIGNED, IN_PROGRESS}
  - No active (PENDING or IN_PROGRESS) assignment exists
  - For Maintenance: `approval_status = APPROVED`
  - Assigned staff member must have `role = STAFF`
- **Action**:
  - Create Assignment with `assignment_status = PENDING`
  - If complaint status was SUBMITTED/APPROVED: status → `ASSIGNED`
  - Create status history entry with remarks "Staff assigned"

**Code Reference**: [assignment_service.py](backend/app/services/assignment_service.py#L19-L68)

#### 6. **Assignment Progress Update** (Route: `PATCH /api/assignments/{assignment_id}`)
- **Who**: 
  - Staff member (can only update own assignments)
  - HK_Manager or Maint_Manager (can update any assignment for their type)
- **Actions**:
  - Mark as `IN_PROGRESS`: Complaint status ASSIGNED → `IN_PROGRESS`
  - Mark as `DONE`: Complaint status → `COMPLETED`, set `completion_date`
  - Update work notes
- **Status History**: Created for each state change

**Code Reference**: [assignment_service.py](backend/app/services/assignment_service.py#L71-L127)

#### 7. **Feedback Submission** (Route: `POST /api/feedback`)
- **Who**: Raiser (Student/Faculty) only
- **Prerequisites**: 
  - Complaint status = `COMPLETED`
  - No existing feedback for this complaint (unique constraint)
- **Input**: Rating (1-5), comment, confirmed flag
- **Important**: `confirmed = true` is REQUIRED to close the complaint

**Code Reference**: [feedback_service.py](backend/app/services/feedback_service.py#L15-L44)

#### 8. **Complaint Closure** (Route: `POST /api/complaints/{complaint_id}/status-update` with `new_status = CLOSED`)
- **Who**: Raiser, HK_Manager, or Maint_Manager
- **Prerequisites** (must ALL be true):
  - Latest assignment status = `DONE`
  - Feedback exists AND `feedback.confirmed = true`
- **Action**:
  - Status: `COMPLETED` → `CLOSED`
  - Set `closed_at = now()`
  - Create status history entry

**Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L366-L444)

### Complaint Deletion
- **Who**: Raiser only
- **Allowed When**: 
  - Status ∈ {SUBMITTED, APPROVED}
  - No assignments exist
  - For Maintenance: approval_status = PENDING (not yet approved)
- **Action**: Cascade delete status history + complaint
- **Code Reference**: [complaint_service.py](backend/app/services/complaint_service.py#L255-L273)

---

## 4. KEY DATABASE MODELS

### Model Diagram and Structure

```
USER ━━━━ DEPARTMENT (HOD relationship)
  ┃       ┃
  ┗━━━━━┳━┛
       ┃
    COMPLAINT ┬━━━ LOCATION
       ┃      ┃
       ┃      ├─── COMPLAINT_ATTACHMENT
       ┃      ├─── STATUS_HISTORY
       ┃      ├─── ASSIGNMENT ━━━ USER (Staff)
       ┃      └─── FEEDBACK
       ┃
      [raised_by, approved_by] ──→ USER
```

### 4.1 Complaint Model

**Table**: `complaints`

| Column | Type | Key | Purpose |
|--------|------|-----|---------|
| `complaint_id` | INTEGER | PK | Unique identifier |
| `title` | VARCHAR(255) | | Complaint subject |
| `description` | TEXT | | Detailed description |
| `complaint_type` | ENUM(ComplaintType) | | HOUSEKEEPING or MAINTENANCE |
| `priority` | ENUM(Priority) | | LOW, MEDIUM, HIGH, EMERGENCY |
| `status` | ENUM(ComplaintStatus) | | SUBMITTED, APPROVED, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED |
| `approval_status` | ENUM(ApprovalStatus) | | PENDING, APPROVED, REJECTED (only for Maintenance) |
| `created_at` | TIMESTAMP | | Creation time |
| `updated_at` | TIMESTAMP | | Last modification time |
| `closed_at` | TIMESTAMP (nullable) | | When marked CLOSED |
| `location_id` | INTEGER | FK | Links to locations table |
| `raised_by` | INTEGER | FK | Student/Faculty who raised it |
| `department_id` | INTEGER | FK | Department being complained about |
| `approved_by` | INTEGER (nullable) | FK | HOD who approved (maintenance only) |
| `approval_date` | TIMESTAMP (nullable) | | When approved/rejected |

**Key Constraints**:
- Housekeeping: approval_status auto-set to APPROVED at creation
- Maintenance: approval_status starts as PENDING, HOD must explicitly approve/reject
- Closing requires feedback.confirmed = true AND latest_assignment.status = DONE

**File**: [backend/app/models/complaint.py](backend/app/models/complaint.py)

### 4.2 User Model

**Table**: `users`

| Column | Type | Key | Purpose |
|--------|------|-----|---------|
| `user_id` | INTEGER | PK | |
| `name` | VARCHAR(255) | | Full name |
| `email` | VARCHAR(255) | UNIQUE | Login identifier |
| `phone` | VARCHAR(32) (nullable) | | Contact number |
| `password_hash` | VARCHAR(255) | | Bcrypt hash |
| `role` | ENUM(UserRole) | | STUDENT, FACULTY, HOD, HK_MANAGER, MAINT_MANAGER, STAFF, ADMIN |
| `department_id` | INTEGER (nullable) | FK | Department affiliation |
| `designation` | VARCHAR(128) (nullable) | | Job title (for staff/HOD) |
| `student_reg_no` | VARCHAR(64) (nullable) | | Registration number (students only) |
| `year_of_study` | VARCHAR(32) (nullable) | | Current year (students only) |
| `created_at` | TIMESTAMP | | Registration time |
| `status` | VARCHAR(32) | | "pending" (awaiting admin approval), "active", "rejected" |

**Key Relationships**:
- HOD: department.hod_id → users.user_id (circular, resolved via use_alter)
- Department Members: Multiple staff/HOD per department
- Complaints: User raises complaints, HODs approve maintenance, Staff executes assignments

**File**: [backend/app/models/user.py](backend/app/models/user.py)

### 4.3 Status History Model

**Table**: `status_histories`

| Column | Type | Purpose |
|--------|------|---------|
| `history_id` | INTEGER PK | |
| `complaint_id` | INTEGER FK | Audit trail per complaint |
| `changed_by` | INTEGER FK | User who made the change |
| `old_status` | VARCHAR(64) (nullable) | Previous status (null for creation) |
| `new_status` | VARCHAR(64) | New status |
| `remarks` | TEXT (nullable) | Reason for change (HOD approval reason, etc.) |
| `changed_at` | TIMESTAMP | When the change occurred |

**Purpose**: Complete audit trail for Timeline UI, tracks all status transitions

**File**: [backend/app/models/status_history.py](backend/app/models/status_history.py)

### 4.4 Assignment Model

**Table**: `assignments`

| Column | Type | Purpose |
|--------|------|---------|
| `assignment_id` | INTEGER PK | |
| `complaint_id` | INTEGER FK | Links to complaint (one complaint, multiple assignments possible sequentially) |
| `assigned_to` | INTEGER FK | Staff member user_id |
| `assigned_by` | INTEGER FK | Manager (HK/Maint) who created assignment |
| `assigned_date` | TIMESTAMP | When assignment was created |
| `completion_date` | TIMESTAMP (nullable) | When staff marked as DONE |
| `work_notes` | TEXT (nullable) | Work description/progress notes |
| `assignment_status` | ENUM(AssignmentStatus) | PENDING, IN_PROGRESS, DONE, CANCELLED |

**Key Rules**:
- Only ONE active assignment per complaint (PENDING or IN_PROGRESS)
- When assignment_status → DONE: complaint.status → COMPLETED
- Completion date auto-set when marked DONE if not provided

**File**: [backend/app/models/assignment.py](backend/app/models/assignment.py)

### 4.5 Feedback Model

**Table**: `feedbacks`

| Column | Type | Purpose |
|--------|------|---------|
| `feedback_id` | INTEGER PK | |
| `complaint_id` | INTEGER FK UNIQUE | One feedback per complaint (enforced) |
| `rating` | INTEGER | 1-5 rating |
| `feedback_comment` | TEXT | User's satisfaction comment |
| `confirmed` | BOOLEAN | **GATES COMPLAINT CLOSURE** - must be TRUE to close |
| `feedback_date` | TIMESTAMP | When submitted |

**Critical Rule**: Complaint can only be CLOSED if feedback.confirmed = true

**File**: [backend/app/models/feedback.py](backend/app/models/feedback.py)

### 4.6 Department Model

**Table**: `departments`

| Column | Type | Purpose |
|--------|------|---------|
| `department_id` | INTEGER PK | |
| `department_name` | VARCHAR(255) | E.g., "Computer Science", "Civil" |
| `building_name` | VARCHAR(128) (nullable) | E.g., "Main Block" |
| `hod_id` | INTEGER (nullable) FK | HOD's user_id (circular with users.department_id) |
| `contact_email` | VARCHAR(255) (nullable) | Department email |
| `created_at` | TIMESTAMP | |

**Key Relationship**: One HOD per department, HOD must have status="active" to approve

**File**: [backend/app/models/department.py](backend/app/models/department.py)

### 4.7 Location Model

**Table**: `locations`

| Column | Type | Purpose |
|--------|------|---------|
| `location_id` | INTEGER PK | |
| `building_name` | VARCHAR(128) | E.g., "Library", "Lab Complex" |
| `floor_number` | VARCHAR(32) | E.g., "Ground", "1", "Terrace" |
| `room_number` | VARCHAR(64) | Specific room/wing identifier |
| `department_id` | INTEGER FK | Which department area |
| `location_type` | VARCHAR(64) | E.g., "User specified", "Administrative" |

**Auto-creation**: When creating complaint, if location doesn't exist for (department, building, floor, room), it's created

**File**: [backend/app/models/location.py](backend/app/models/location.py)

### 4.8 Complaint Attachment Model

**Table**: `complaint_attachments`

| Column | Type | Purpose |
|--------|------|---------|
| `attachment_id` | INTEGER PK | |
| `complaint_id` | INTEGER FK | |
| `file_name` | VARCHAR(255) | Original filename |
| `file_path` | VARCHAR(512) | Server path: `complaints/{complaint_id}/filename` |
| `file_type` | VARCHAR(32) | "image", "video", "document" (inferred from MIME type) |
| `mime_type` | VARCHAR(64) | e.g., "image/jpeg", "video/mp4" |
| `file_size` | INTEGER | Bytes |
| `uploaded_at` | TIMESTAMP | |

**File Location**: `backend/uploads/complaints/{complaint_id}/`

**API Serving**: `GET /uploads/complaints/{complaint_id}/filename`

**File**: [backend/app/models/complaint_attachment.py](backend/app/models/complaint_attachment.py)

---

## 5. BACKEND SERVICES ARCHITECTURE

Services encapsulate business logic and are called by routes. They enforce all workflow rules.

### 5.1 Complaint Service

**File**: [backend/app/services/complaint_service.py](backend/app/services/complaint_service.py)

#### Key Functions

| Function | Purpose | Authorization |
|----------|---------|-----------------|
| `create_complaint()` | Creates new complaint | Student/Faculty |
| `list_complaints()` | Role-aware complaint listing | Role-based filtering |
| `get_complaint_detail()` | Fetch with auth checks | Raiser/HOD/Staff/Manager |
| `update_complaint()` | Edit pending complaints | Raiser only |
| `delete_complaint()` | Cascade delete | Raiser only (strict rules) |
| `approve_complaint()` | HOD approves maintenance | HOD of department |
| `reject_complaint()` | HOD rejects → closes | HOD of department |
| `apply_status_update()` | Manual status transitions | Role-specific (enforces rules) |

#### Core Business Logic

**Housekeeping vs Maintenance**:
```python
if complaint_type == HOUSEKEEPING:
    approval_status = APPROVED  # Auto-approved
else:  # MAINTENANCE
    approval_status = PENDING   # Requires HOD action
```

**Status Update Validation** (from `apply_status_update()`):
- CLOSED: Requires assignment DONE + feedback confirmed
- COMPLETED: Requires assignment DONE
- IN_PROGRESS: Staff only, must be assigned to them
- APPROVED/ASSIGNED/SUBMITTED: Blocked via endpoints (use specific endpoints)

**List Filtering** (role-aware):
- Student/Faculty: Only their own complaints
- HOD: Only their department's complaints
- Staff: Only complaints they're assigned to
- HK_Manager/Maint_Manager: See all (operational oversight)

### 5.2 Assignment Service

**File**: [backend/app/services/assignment_service.py](backend/app/services/assignment_service.py)

#### Key Functions

| Function | Purpose |
|----------|---------|
| `create_assignment()` | Manager assigns complaint to staff |
| `update_assignment()` | Staff marks progress/completion |
| `active_open_assignment()` | Check if assignment in-flight |

#### Assignment Workflow Logic

**Creation**:
```python
Validate: 
  - Only HK_Manager for Housekeeping
  - Only Maint_Manager for Maintenance (and must be HOD-approved)
  - No active assignment exists for this complaint
  - Assignee must be Staff role

Create: assignment_status = PENDING
If complaint.status in [SUBMITTED, APPROVED]:
  complaint.status = ASSIGNED
```

**Progress Update**:
```python
Staff marks IN_PROGRESS:
  assignment.assignment_status = IN_PROGRESS
  complaint.status = IN_PROGRESS (if was ASSIGNED)

Staff marks DONE:
  assignment.assignment_status = DONE
  assignment.completion_date = now()
  complaint.status = COMPLETED
  (Still not CLOSED until feedback confirmed)
```

### 5.3 Feedback Service

**File**: [backend/app/services/feedback_service.py](backend/app/services/feedback_service.py)

**Key Function**: `create_feedback()`

**Rules**:
- Only Student/Faculty who raised complaint can submit
- Can only submit when complaint.status == COMPLETED
- One feedback per complaint (UNIQUE constraint enforced)
- `confirmed` field must be True to later allow closing
- Rating: 1-5 (Pydantic validation)

### 5.4 History Service

**File**: [backend/app/services/history_service.py](backend/app/services/history_service.py)

**Functions**:
- `append_status_history()`: Append-only logging of all status changes
- `touch_complaint_timestamp()`: Update complaint.updated_at

**Purpose**: Audit trail for Timeline UI component

### 5.5 Dashboard Service

**File**: [backend/app/services/dashboard_service.py](backend/app/services/dashboard_service.py)

**Function**: `get_dashboard_stats()`

**Returns**: Role-specific statistics:
- All: Total complaints, by_status, by_type
- HOD: Pending maintenance approvals for their dept
- Staff: Open assignments assigned to them
- Student/Faculty: Their open complaints (not CLOSED)

### 5.6 Auth Service

**File**: [backend/app/services/auth_service.py](backend/app/services/auth_service.py)

**Functions**:
- `register_user()`: Create user with "pending" status
- `authenticate()`: Verify credentials, return JWT token

**Rules**:
- Email must be unique
- Passwords bcrypt-hashed
- Department name looked up in DB
- Staff designations auto-filled if not provided
- New users start in "pending" status (awaiting Admin approval)

---

## 6. FRONTEND PAGES & WORKFLOW MAPPING

### Page-to-Workflow Mapping

| Page | URL | Role(s) | Purpose | API Calls |
|------|-----|---------|---------|-----------|
| **Login** | `/login` | All | Authentication | POST /auth/login |
| **Signup** | `/signup` | All | Registration | POST /auth/register |
| **Dashboard** | `/dashboard` | All | Role-specific overview | GET /dashboard/stats |
| **Landing** | `/` | Unauthenticated | Info page | - |
| **New Complaint** | `/complaints/new` | Student/Faculty | File complaint | POST /complaints, POST /uploads |
| **Complaints List** | `/complaints` | All | Browse complaints | GET /complaints |
| **Complaint Detail** | `/complaints/{id}` | All (auth-checked) | View + Actions | GET /complaints/{id}, PATCH, POST /status-update |
| **Approvals** | `/approvals` | HOD | Maintenance approval queue | GET /complaints (filtered) |
| **Assignments** | `/assign` | HK_Manager, Maint_Manager | Assignment workbench | GET /complaints, POST /assignments |
| **My Tasks** | `/tasks` | Staff | Active assignments | GET /assignments (filtered) |
| **Admin Dashboard** | `/admin` | Admin | User management | GET /admin/users, POST /admin/users/{id}/approve |
| **About/Contact** | `/about`, `/contact` | All | Info pages | - |

### 6.1 Complaint Creation Flow (NewComplaintPage)

**File**: [frontend/src/pages/NewComplaintPage.tsx](frontend/src/pages/NewComplaintPage.tsx)

**Form Fields**:
- Department (dropdown)
- Building (preset options + "Other" for custom)
- Floor (preset options + "Other" for custom)
- Room/Wing detail (text, optional)
- Title (text)
- Description (textarea)
- Complaint type (Housekeeping / Maintenance)
- Priority (Low / Medium / High / Emergency)
- Media files (image/video attachments, optional)

**Submission Logic**:
1. Validate all required fields filled
2. POST to `/api/complaints` with FormData (for file upload)
3. Auto-create location if needed
4. Save attachments to `/uploads/complaints/{complaint_id}/`
5. Redirect to detail page: `/complaints/{complaint_id}`

### 6.2 Complaint Detail Page (ComplaintDetailPage)

**File**: [frontend/src/pages/ComplaintDetailPage.tsx](frontend/src/pages/ComplaintDetailPage.tsx)

**Displays**:
- Title, description, location
- Status badges (type, priority, status, approval_status)
- Attachments (images/videos with preview)
- Status timeline (from status_history)
- Assignments list (sorted by date descending)
- Feedback (if submitted)

**Role-Specific Actions**:
- **Raiser**: 
  - Edit (if SUBMITTED/APPROVED and no active assignment)
  - Delete (if SUBMITTED/APPROVED and no assignments)
  - Submit feedback (if COMPLETED)
  - Close (if assignment DONE + feedback confirmed + is raiser/manager)
- **HOD**: 
  - Approve/reject (if maintenance + approval_status PENDING + is HOD for dept)
- **HK_Manager/Maint_Manager**: 
  - Assign to staff (modal to select staff)
  - Update assignments
  - Close (if rules met)
- **Staff**: 
  - Update own assignment status (IN_PROGRESS, DONE)

**Auto-refresh**: Polls detail every 20 seconds for real-time updates

### 6.3 Approvals Page (ApprovalsPage)

**File**: [frontend/src/pages/ApprovalsPage.tsx](frontend/src/pages/ApprovalsPage.tsx)

**Filters Applied**:
- `complaint_type = "Maintenance"`
- `status = "Submitted"`
- `approval_status = "Pending"` (client-side filter)

**Purpose**: HOD queue - shows maintenance complaints awaiting HOD approval for their department

**Actions Available**: Approve/Reject (via buttons on each ComplaintCard)

### 6.4 Assignments Page (AssignPage)

**File**: [frontend/src/pages/AssignPage.tsx](frontend/src/pages/AssignPage.tsx)

**For HK_Manager**:
- Shows Housekeeping complaints with status ∈ [Approved, Assigned, In Progress]
- Can assign to Staff

**For Maint_Manager**:
- Shows Maintenance complaints with:
  - `approval_status = "Approved"` (HOD must have approved)
  - status ∈ [Approved, Assigned, In Progress]

**Click Action**: Opens modal to select staff member from roster

### 6.5 Tasks Page (TasksPage)

**For Staff**: Shows only complaints assigned to them

**Actions**:
- Update assignment status (Pending → In Progress → Done)
- Add/update work notes
- View complaint details and attachments

---

## 7. OFFICER ASSIGNMENT & ESCALATION

### 7.1 Assignment Process

**Type 1: Housekeeping**
1. Student/Faculty files Housekeeping complaint
2. Status: SUBMITTED, approval_status: APPROVED (auto)
3. HK_Manager views complaint
4. HK_Manager creates Assignment → complaint status: ASSIGNED
5. Staff assigned (can be any Staff user)
6. Staff marks In Progress → complaint status: IN_PROGRESS
7. Staff marks Done → complaint status: COMPLETED

**Type 2: Maintenance**
1. Student/Faculty files Maintenance complaint
2. Status: SUBMITTED, approval_status: PENDING
3. HOD receives notification (ApprovalPage)
4. HOD approves → status: APPROVED, approval_status: APPROVED
5. Maint_Manager views complaint
6. Maint_Manager creates Assignment → complaint status: ASSIGNED
7. Staff assigned
8. Staff marks In Progress → complaint status: IN_PROGRESS
9. Staff marks Done → complaint status: COMPLETED

### 7.2 Re-assignment

**Mechanism**:
- If first assignment is marked CANCELLED or times out, new assignment can be created
- Active assignment (PENDING or IN_PROGRESS) blocks new assignment creation
- Multiple sequential assignments possible (new ones have newer assignment_id)

**Code**: [assignment_service.py - line 49](backend/app/services/assignment_service.py#L49)
```python
if active_open_assignment(db, c.complaint_id) is not None:
    raise HTTPException(status_code=400, detail="An open assignment already exists...")
```

### 7.3 Staff Routing Logic

**No Auto-Routing**: System does NOT auto-assign staff
- Manager manually selects Staff from dropdown
- No round-robin or load-balancing built-in

**Future Escalation (Not Implemented)**:
- Could be added via assignment re-attempts
- Could track completion times per staff
- Could route similar complaints to same staff

---

## 8. NOTIFICATIONS & STATUS UPDATES

### 8.1 Notification Mechanism

**Current Implementation**: **No built-in notifications**

System provides status tracking via:
1. **Status History Timeline**: All changes recorded with timestamps + actor
2. **Role-based Dashboards**: Each role sees relevant metrics
3. **Polling**: Frontend polls detail page every 20 seconds for updates

### 8.2 Status History Tracking

**Every Change Recorded**:
```
Complaint creation:
  - changed_by: raiser
  - old_status: NULL
  - new_status: "Submitted"
  - remarks: "Complaint created"

HOD approval:
  - changed_by: hod_id
  - old_status: "Submitted"
  - new_status: "Approved"
  - remarks: (optional HOD remarks)

Staff progress:
  - changed_by: staff_id
  - old_status: "Assigned"
  - new_status: "In Progress"
  - remarks: "Work started"
```

**Timeline UI**: [components/Timeline.tsx](frontend/src/components/Timeline.tsx)
- Displays chronological history
- Shows who made change, when, with remarks
- Collapsible for longer timelines

### 8.3 Role-Specific Dashboard Indicators

**Student/Faculty Dashboard**:
- Count of open complaints (status != CLOSED)
- Quick link to Complaints list

**HOD Dashboard**:
- Count of pending maintenance approvals (approval_status = PENDING)
- Quick link to Approvals queue

**Staff Dashboard**:
- Count of open assignments (PENDING + IN_PROGRESS)
- Quick link to Tasks

**Admin Dashboard**:
- Counts by user status (pending, active, rejected)
- Links to user management

### 8.4 Potential Notification Enhancements

**Not Currently Implemented** (suggested improvements):
1. **Email Notifications**: On approval/assignment/closure
2. **SMS Alerts**: For high-priority complaints
3. **In-App Bell/Toast**: Real-time notifications
4. **Webhooks**: For external system integration
5. **Complaint Status Subscriptions**: User can subscribe to updates

---

## TECHNICAL IMPLEMENTATION DETAILS

### Backend API Endpoints

```
Authentication:
  POST   /api/auth/login          - JWT token
  POST   /api/auth/register       - Create pending user
  
Complaints:
  POST   /api/complaints          - Create (multipart with files)
  GET    /api/complaints          - List (filtered, paginated)
  GET    /api/complaints/{id}     - Detail (auth-checked)
  PATCH  /api/complaints/{id}     - Update (raiser only)
  DELETE /api/complaints/{id}     - Delete (strict rules)
  POST   /api/complaints/{id}/approve     - HOD approval
  POST   /api/complaints/{id}/reject      - HOD rejection
  POST   /api/complaints/{id}/status-update - Status change
  
Assignments:
  POST   /api/assignments         - Create assignment
  PATCH  /api/assignments/{id}    - Update progress
  
Feedback:
  POST   /api/feedback            - Submit feedback
  
Dashboard:
  GET    /api/dashboard/stats     - Role-aware metrics
  
Users:
  GET    /api/users/me            - Current user
  GET    /api/users               - List users (manager/HOD)
  
Admin:
  GET    /api/admin/users         - All users (admin)
  GET    /api/admin/stats         - Admin stats
  POST   /api/admin/users/{id}/approve   - Approve user
  POST   /api/admin/users/{id}/reject    - Reject user
  
Departments:
  GET    /api/departments         - List departments
  
Locations:
  GET    /api/locations           - List locations (by dept)
  
Files:
  GET    /uploads/complaints/{complaint_id}/* - Serve attachments
```

### Database Dependencies

**Foreign Key Relationships**:
- Complaints → Location, User (raiser), Department, User (approver)
- Assignments → Complaint, User (assignee/assigner)
- StatusHistory → Complaint, User
- Feedback → Complaint
- ComplaintAttachment → Complaint

**Circular Reference (Handled)**:
- Department.hod_id → User.user_id
- User.department_id → Department.department_id
- Resolved using SQLAlchemy `use_alter=True`

### File Upload Handling

**Location**: `backend/uploads/complaints/{complaint_id}/`

**Processing**:
1. Multipart form submission from frontend
2. Save file to disk via [file_service.py](backend/app/services/file_service.py)
3. Detect MIME type → file_type (image/video/document)
4. Create ComplaintAttachment record
5. Return URL: `/uploads/complaints/{complaint_id}/filename`

**Validation**:
- File size limits (not specified, add if needed)
- Allowed MIME types (images, videos)

### Security

**Authentication**:
- JWT tokens with `sub` (user_id) + `role` claims
- 30-minute expiration (configurable)
- Refresh tokens: Not implemented (would need refresh endpoint)

**Authorization**:
- Role-based decorators via `require_roles(UserRole.X)`
- Resource-level checks (e.g., can only view/edit own complaints)
- Department scoping for HOD (can only approve own dept)

**Password Security**:
- Bcrypt hashing (via `get_password_hash()`)
- Salt automatically handled by bcrypt

**Input Validation**:
- Pydantic models enforce type + length constraints
- Email format validation
- Status/enum values validated against allowed values

---

## KEY FILES REFERENCE

### Backend Models
- [complaint.py](backend/app/models/complaint.py) - Complaint + enums
- [user.py](backend/app/models/user.py) - User roles + relationships
- [assignment.py](backend/app/models/assignment.py) - Staff assignments
- [status_history.py](backend/app/models/status_history.py) - Audit trail
- [feedback.py](backend/app/models/feedback.py) - Resolution feedback
- [department.py](backend/app/models/department.py) - Department + HOD
- [location.py](backend/app/models/location.py) - Complaint locations
- [complaint_attachment.py](backend/app/models/complaint_attachment.py) - File uploads

### Backend Services
- [complaint_service.py](backend/app/services/complaint_service.py) - Core workflow
- [assignment_service.py](backend/app/services/assignment_service.py) - Assignment logic
- [feedback_service.py](backend/app/services/feedback_service.py) - Feedback submission
- [history_service.py](backend/app/services/history_service.py) - Audit logging
- [auth_service.py](backend/app/services/auth_service.py) - Authentication
- [dashboard_service.py](backend/app/services/dashboard_service.py) - Metrics

### Backend Routes
- [complaints.py](backend/app/routes/complaints.py) - Complaint endpoints
- [assignments.py](backend/app/routes/assignments.py) - Assignment endpoints
- [auth.py](backend/app/routes/auth.py) - Auth endpoints
- [users.py](backend/app/routes/users.py) - User endpoints
- [admin.py](backend/app/routes/admin.py) - Admin endpoints

### Frontend Pages
- [NewComplaintPage.tsx](frontend/src/pages/NewComplaintPage.tsx)
- [ComplaintDetailPage.tsx](frontend/src/pages/ComplaintDetailPage.tsx)
- [ApprovalsPage.tsx](frontend/src/pages/ApprovalsPage.tsx)
- [AssignPage.tsx](frontend/src/pages/AssignPage.tsx)
- [TasksPage.tsx](frontend/src/pages/TasksPage.tsx)
- [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx)

### Configuration
- [config.py](backend/app/core/config.py) - Settings
- [security.py](backend/app/core/security.py) - JWT + password utils
- [deps.py](backend/app/core/deps.py) - Auth dependencies + RBAC
- [docker-compose.yml](docker-compose.yml) - Database setup

---

## SUMMARY: COMPLAINT WORKFLOW SEQUENCE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HOUSEKEEPING COMPLAINT FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│  STUDENT                    HK_MANAGER           STAFF              USER │
│    │                             │                 │                 │   │
│    ├──File Complaint──────→      │                 │                 │   │
│    │ (status: SUBMITTED,         │                 │                 │   │
│    │  approval_status:           │                 │                 │   │
│    │  APPROVED [auto])           │                 │                 │   │
│    │                             │                 │                 │   │
│    │  [Optional: Upload Files]   │                 │                 │   │
│    │  ↓ to /uploads/complaints/  │                 │                 │   │
│    │                             │                 │                 │   │
│    │                ├─View Queue  │                 │                 │   │
│    │                │ (status:    │                 │                 │   │
│    │                │  SUBMITTED) │                 │                 │   │
│    │                │             │                 │                 │   │
│    │                ├─Create Assignment──→          │                 │   │
│    │                │  (status: ASSIGNED)           │                 │   │
│    │                │                       ├─See Assignment          │   │
│    │                │                       │                        │   │
│    │                │                       ├─Mark IN_PROGRESS       │   │
│    │                │                       │ (status: IN_PROGRESS)   │   │
│    │                │                       │                        │   │
│    │                │                       ├─Mark DONE              │   │
│    │                │                       │ (status: COMPLETED)    │   │
│    │                │                       │                        │   │
│    ├─Submit Feedback─────────────────────→ │                        │   │
│    │ (rating, comment, confirmed=true)     │                        │   │
│    │                                       │                        │   │
│    ├─Close Complaint (status: CLOSED)      │                        │   │
│    │ [Requires: assignment DONE +          │                        │   │
│    │  feedback confirmed]                  │                        │   │
│    │                                       │                        │   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    MAINTENANCE COMPLAINT FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│  STUDENT        HOD              MAINT_MANAGER    STAFF            USER  │
│    │             │                    │            │               │    │
│    ├─File        │                    │            │               │    │
│    │ Complaint   │                    │            │               │    │
│    │ (status:    │                    │            │               │    │
│    │  SUBMITTED, │                    │            │               │    │
│    │ approval:   │                    │            │               │    │
│    │ PENDING)    │                    │            │               │    │
│    │             │                    │            │               │    │
│    │             ├─Queue Waiting      │            │               │    │
│    │             │ (approvals page)   │            │               │    │
│    │             │                    │            │               │    │
│    │             ├─APPROVE ────→      │            │               │    │
│    │             │ (or REJECT→CLOSED) │            │               │    │
│    │             │                    │            │               │    │
│    │             │            ├─View Approved     │               │    │
│    │             │            │ Complaints       │               │    │
│    │             │            │                  │               │    │
│    │             │            ├─Assign to Staff──→               │    │
│    │             │            │                  ├─Mark Progress│    │
│    │             │            │                  │              │    │
│    │             │            │                  ├─Mark DONE    │    │
│    │             │            │                  │              │    │
│    ├──Submit Feedback──────────────────────────→ │              │    │
│    │             │            │                  │              │    │
│    ├──Close──────────────────────────────────────→ │              │    │
│    │ [Requires: assignment DONE + feedback]      │              │    │
│    │                                              │              │    │
└─────────────────────────────────────────────────────────────────────────┘

KEY RULES:
═════════════════════════════════════════════════════════════════════════
1. Housekeeping: APPROVED immediately → HK_Manager can assign anytime
2. Maintenance: PENDING until HOD acts → Only Maint_Manager assigns if APPROVED
3. Only ONE active assignment per complaint (PENDING or IN_PROGRESS)
4. Assignment DONE → complaint status COMPLETED (not CLOSED yet)
5. CLOSED requires: assignment DONE + feedback.confirmed = true
6. Staff can mark themselves IN_PROGRESS or DONE
7. All status changes logged in StatusHistory (audit trail)
```

---

## CONCLUSION

The VJTI CMS implements a sophisticated, role-based complaint management system with clear separation between housekeeping (direct assignment) and maintenance (HOD approval required) workflows. The system prioritizes:

1. **Workflow Transparency**: Complete audit trail via StatusHistory
2. **Role-Based Access**: Strict RBAC with department scoping
3. **Quality Assurance**: Feedback gates final closure
4. **Scalability**: Can handle multiple concurrent assignments
5. **Usability**: Role-specific dashboards and queues

The architecture cleanly separates concerns (models/services/routes), making it maintainable and extensible for future features like notifications, analytics, or advanced routing algorithms.
