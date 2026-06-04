# Backend TODO: Manager CRUD Endpoints

## Required Endpoints for Manager Role

### 1. `/api/v1/manager/lanes`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/manager/lanes` | List lanes in branch | OK |
| POST | `/api/v1/manager/lanes` | Create lane | OK |
| PUT | `/api/v1/manager/lanes/{laneId}` | Update lane (name, isActive) | **TODO** |
| DELETE | `/api/v1/manager/lanes/{laneId}` | Delete lane | **TODO** |

### 2. `/api/v1/manager/timeslots`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/manager/timeslots` | List time slots in branch | OK |
| POST | `/api/v1/manager/timeslots` | Create time slot | OK |
| PUT | `/api/v1/manager/timeslots/{slotId}` | Update time slot | **TODO** |
| DELETE | `/api/v1/manager/timeslots/{slotId}` | Delete time slot | **TODO** |

### 3. `/api/v1/manager/staff`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/manager/staff` | List staff in branch | OK |
| DELETE | `/api/v1/manager/staff/{userId}` | Deactivate staff | **TODO** |

## Notes

- All endpoints are auto-scoped to Manager's branchId from token (no branchId param needed)
- Manager cannot access other branches
- Admin has separate endpoints: `/api/v1/admin/lanes`, `/api/v1/admin/time-slots`
- Staff role can access: `/api/v1/admin/time-slots` (read/create/update/delete)
