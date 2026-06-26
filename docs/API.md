# API Documentation — Daycare Routine Tracker

**Base URL:** `http://localhost:5000/api`  
**Authentication:** Bearer token (JWT) — include `Authorization: Bearer <access_token>` header on all protected routes.

---

## Authentication

### POST `/auth/login`
Login with email and password.

**Request:**
```json
{ "email": "admin@intellitots.com", "password": "Admin@123" }
```
**Response `200`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "abc123...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": { "id": "uuid", "email": "...", "full_name": "...", "role": "admin" }
  }
}
```

### POST `/auth/refresh`
Rotate refresh token and get new access token.

**Request:** `{ "refresh_token": "abc123..." }`  
**Response `200`:** Same shape as login response.

### POST `/auth/logout`
Revoke refresh token.

**Request:** `{ "refresh_token": "abc123..." }`

### GET `/auth/me` 🔒
Get current authenticated user.

### PUT `/auth/change-password` 🔒
Change current user's password.

**Request:** `{ "current_password": "...", "new_password": "NewPass@1" }`

---

## Children

### GET `/children` 🔒
List children with optional filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default 1) |
| `limit` | int | Per page (default 20, max 100) |
| `search` | string | Search by name |
| `classroom_id` | uuid | Filter by classroom |
| `admission_status` | string | `enrolled\|enquiry\|applied\|waitlisted\|withdrawn` |
| `is_active` | boolean | Filter active/inactive |

**Response:** Paginated list with `data[]` and `pagination{}`.

### POST `/children` 🔒 (teacher+)
Create a new child record.

**Request:**
```json
{
  "full_name": "Aryan Gupta",
  "date_of_birth": "2023-03-15",
  "gender": "male",
  "classroom_id": "uuid",
  "primary_parent_id": "uuid",
  "admission_status": "enrolled",
  "dietary_restrictions": "No nuts",
  "medical_notes": "..."
}
```

### GET `/children/:id` 🔒
Get full child profile with allergies and parents.

### PUT `/children/:id` 🔒 (teacher+)
Update child record. All fields optional.

### DELETE `/children/:id` 🔒 (admin/head)
Soft delete child.

### GET `/children/:id/routines` 🔒
Paginated routine history for a child.

### POST `/children/:id/allergies` 🔒 (teacher+)
**Request:** `{ "allergen": "Peanuts", "severity": "severe", "notes": "..." }`

### DELETE `/children/:id/allergies/:allergyId` 🔒 (teacher+)

---

## Routines

### GET `/routines` 🔒
List routine entries.

**Query params:** `date`, `start_date`, `end_date`, `child_id`, `classroom_id`, `is_complete`, `page`, `limit`

### POST `/routines` 🔒 (teacher+)
Create or upsert routine entry (one per child per day).

**Request:**
```json
{
  "child_id": "uuid",
  "date": "2026-06-15",
  "overall_mood": "happy",
  "general_notes": "Had a great morning"
}
```

### GET `/routines/:id` 🔒
Full routine with all sub-logs (meals, naps, diapers, activities, moods).

### PUT `/routines/:id` 🔒 (teacher+)
**Request:** `{ "overall_mood": "calm", "general_notes": "...", "is_complete": true }`

### POST `/routines/bulk-summary` 🔒 (teacher+)
Generate AI summaries for all complete routines on a date.
**Request:** `{ "date": "2026-06-15", "classroom_id": "uuid (optional)" }`

### Sub-logs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/routines/meals` | Log a meal |
| PUT | `/routines/meals/:id` | Update meal |
| DELETE | `/routines/meals/:id` | Delete meal |
| POST | `/routines/naps` | Log nap |
| DELETE | `/routines/naps/:id` | Delete nap |
| POST | `/routines/diapers` | Log diaper change |
| DELETE | `/routines/diapers/:id` | Delete diaper log |
| POST | `/routines/activities` | Log activity |
| DELETE | `/routines/activities/:id` | Delete activity |
| POST | `/routines/moods` | Log mood check-in |

**Meal request:**
```json
{
  "routine_id": "uuid",
  "meal_type": "breakfast",
  "food_items": "Idli, sambar",
  "amount_eaten": "most",
  "time_served": "2026-06-15T08:30:00Z"
}
```

**Nap request:**
```json
{
  "routine_id": "uuid",
  "start_time": "2026-06-15T13:00:00Z",
  "end_time": "2026-06-15T14:30:00Z",
  "sleep_quality": "good"
}
```

**Diaper request:**
```json
{
  "routine_id": "uuid",
  "change_time": "2026-06-15T10:15:00Z",
  "diaper_type": "wet"
}
```

**Activity request:**
```json
{
  "routine_id": "uuid",
  "activity_type": "art",
  "activity_name": "Finger Painting",
  "start_time": "2026-06-15T09:00:00Z",
  "end_time": "2026-06-15T09:45:00Z",
  "description": "Used primary colours"
}
```

---

## Staff

### GET `/staff` 🔒
List all staff members.

### GET `/staff/:id` 🔒
Get staff member details.

### GET `/staff/attendance` 🔒
List attendance records.

**Query params:** `date`, `week_start`, `status`, `staff_id`, `page`, `limit`

### POST `/staff/attendance` 🔒 (admin/head)
Log or upsert attendance record.
```json
{
  "staff_id": "uuid",
  "date": "2026-06-15",
  "status": "present",
  "shift": "full_day",
  "clock_in": "2026-06-15T08:00:00Z"
}
```

### POST `/staff/attendance/clock-in` 🔒 (teacher+)
```json
{ "staff_id": "uuid", "shift": "full_day" }
```

### POST `/staff/attendance/clock-out` 🔒 (teacher+)
```json
{ "staff_id": "uuid" }
```

### PUT `/staff/attendance/:id` 🔒 (admin/head)

---

## Duty Roster

### GET `/roster` 🔒
Get weekly roster. Returns by-date grouped assignments.

**Query params:** `week_start` (YYYY-MM-DD Monday), `classroom_id`, `staff_id`

**Response:**
```json
{
  "week_start": "2026-06-08",
  "week_end": "2026-06-14",
  "week_dates": ["2026-06-08", ...],
  "assignments": {
    "2026-06-08": [
      {
        "id": "uuid", "staff_id": "uuid", "staff_name": "Anjali Mehta",
        "classroom_name": "Sunflower Room", "shift": "full_day",
        "start_time": "08:00", "end_time": "16:00", "is_lead": true
      }
    ]
  }
}
```

### POST `/roster` 🔒 (admin/head)
```json
{
  "staff_id": "uuid", "classroom_id": "uuid",
  "date": "2026-06-15", "shift": "full_day",
  "start_time": "08:00", "end_time": "16:00", "is_lead": false
}
```

### DELETE `/roster/:id` 🔒 (admin/head)

---

## Tasks

### GET `/tasks` 🔒
List tasks. Teachers see only their own tasks.

**Query params:** `assigned_to`, `status`, `priority`, `classroom_id`, `due_date`, `overdue` (boolean), `page`, `limit`

### POST `/tasks` 🔒 (admin/head)
```json
{
  "title": "Prepare June curriculum",
  "description": "...",
  "assigned_to": "user_uuid",
  "classroom_id": "uuid",
  "due_date": "2026-06-20",
  "priority": "high",
  "category": "planning"
}
```

### GET `/tasks/:id` 🔒
Full task with comments.

### PUT `/tasks/:id` 🔒 (admin/head)
### PUT `/tasks/:id/status` 🔒 (teacher+)
```json
{ "status": "completed", "notes": "Done on time" }
```
### DELETE `/tasks/:id` 🔒 (admin/head)

### POST `/tasks/:id/comments` 🔒 (teacher+)
```json
{ "comment": "Started working on this" }
```

---

## Dashboard

### GET `/dashboard/kpis` 🔒 (admin/head)
Centre-level KPI aggregates for today + trends.

**Response includes:**
- `today.children` — total, present, attendance_rate
- `today.staff` — total, present
- `today.routines` — completed, total, completion_rate
- `today.tasks` — pending, in_progress, completed_today
- `trends.attendance_7d[]` — daily attendance for last 7 days
- `trends.mood_distribution_7d[]` — mood counts
- `classrooms[]` — per-classroom stats

### GET `/dashboard/classroom/:id` 🔒
Per-classroom today stats + 7-day trends.

### GET `/dashboard/attendance` 🔒
**Query:** `date`, `classroom_id`

### GET `/dashboard/routines` 🔒
**Query:** `date`, `classroom_id`

---

## Notifications

### POST `/notifications/send-daily` 🔒 (admin/head)
Generate summaries and send to parents.

```json
{
  "date": "2026-06-15",
  "classroom_id": "uuid (optional)",
  "child_ids": ["uuid", "..."] ,
  "channels": ["email", "whatsapp"]
}
```

**Response:**
```json
{
  "data": {
    "sent": 5, "failed": 1, "skipped": 2,
    "details": [{ "child": "Aryan", "status": "sent", "channels": ["email:sent"] }]
  }
}
```

### GET `/notifications/history` 🔒
**Query:** `child_id`, `status`, `channel`, `page`, `limit`

---

## Classrooms

### GET `/classrooms` 🔒 — List all classrooms
### POST `/classrooms` 🔒 (admin/head) — Create classroom
### GET `/classrooms/:id` 🔒 — Classroom with enrolled children
### PUT `/classrooms/:id` 🔒 (admin/head) — Update classroom

---

## Parents

### GET `/parents` 🔒 — List parents
### POST `/parents` 🔒 (teacher+) — Create parent record
### GET `/parents/:id` 🔒 — Parent with linked children
### PUT `/parents/:id` 🔒 (teacher+) — Update parent

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100, "page": 1, "limit": 20,
    "total_pages": 5, "has_next": true, "has_prev": false
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [{ "field": "email", "message": "must be a valid email" }]
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |

## Role Permissions Summary

| Role | Access |
|------|--------|
| `admin` | Full access to everything |
| `centre_head` | All except user management |
| `teacher` | Own tasks, read children/routines, log routines/attendance |
| `parent` | Read-only own child data (future portal) |

🔒 = Requires authentication  
(admin/head) = Requires admin or centre_head role  
(teacher+) = Requires teacher, centre_head, or admin role
