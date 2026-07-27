# Backend note: lane operations and customer lane display

Reviewed against backend commit `336310a` on 2026-07-22. No backend source file was modified while implementing the web frontend.

## 1. Make payment rules consistent for every check-in path (P0)

`BookingService.UpdateBookingStatusAsync` rejects an unpaid booking before `CheckedIn`, but these paths currently do not apply the same rule:

- `OperationStaffService.CheckInBookingAsync`: assigns a lane first and changes the booking to `CheckedIn` without checking payment.
- `ManagerService.ConfirmCheckInAndAssignLaneAsync`: changes `Pending` to `CheckedIn` and assigns the selected lane without checking payment.

Requested behavior:

1. For `FinalAmount > 0`, verify a completed booking payment before assigning/reserving a lane or changing the status to `CheckedIn`.
2. Reuse one shared payment predicate for Camera, Staff, Manager, and automated-wash endpoints.
3. Return a stable error code such as `BOOKING_PAYMENT_REQUIRED`; do not require the frontend to parse a localized message.
4. Add integration tests proving an unpaid booking cannot reserve a lane through any endpoint.

The web now blocks known unpaid records defensively, but backend enforcement is still required because clients can call the endpoints directly.

## 2. Validate a Manager's manual lane assignment (P0)

`ManagerService.ConfirmCheckInAndAssignLaneAsync` currently checks only that the lane belongs to the branch. It should also verify:

- lane is active;
- lane is compatible with personal/business booking type;
- lane is actually available and is not already reserved by another active booking/wash log;
- assignment and booking status change run in a serializable transaction;
- a checked-in booking that already has another lane cannot silently be moved unless an explicit reassignment action is used.

Return stable error codes such as `LANE_UNAVAILABLE`, `LANE_INACTIVE`, and `LANE_TYPE_MISMATCH` so the Manager web can display a precise recovery action.

## 3. Make automatic queue promotion atomic (P0)

`LaneSchedulerService.AssignNextVehicleInQueueAsync` reads all waiting bookings, sorts them, and updates the selected row without a transaction. Two lanes completing at nearly the same time can select the same booking.

Requested behavior:

- select and assign the next booking inside a serializable transaction (or use a database row-lock/atomic update strategy);
- re-check `ProcessingLaneId == null` when committing;
- retry a bounded number of times on serialization/deadlock conflicts;
- add a concurrency integration test with two simultaneous lane completions.

## 4. Do not project an overdue checked-in vehicle from its appointment time (P1)

`LaneSchedulerService.GetLaneProjectedFreeTimesAsync` currently uses `ProcessingStartTime ?? ScheduledTime`. For a late vehicle that has just checked in but not started, an old `ScheduledTime` can make its lane appear already free.

Use an operational timestamp for active occupancy, for example:

`ProcessingStartTime ?? CheckInTime/UpdatedAt ?? UtcNow`

Then add the wash-duration estimate. This prevents another booking from being assigned to the same lane while the late vehicle is physically present.

## 5. Realtime transport for a display running on another device (P1)

The current web implementation uses `BroadcastChannel` plus `localStorage`. This is correct for a second monitor/window connected to the same LPR workstation, but it cannot cross devices.

For a TV/tablet/mini-PC running separately, provide a branch-scoped SignalR or SSE channel plus a latest-state endpoint:

- `GET /api/v1/operations/branches/{branchId}/lane-display/latest`
- realtime topic such as `branch:{branchId}:lane-display`

Suggested event contract:

```json
{
  "eventId": "uuid",
  "branchId": 1,
  "occurredAt": "2026-07-22T16:30:00Z",
  "type": "Reading|Assigned|WaitingForLane|PaymentRequired|AssistanceRequired|Error",
  "bookingId": 123,
  "licensePlate": "30F33333",
  "laneId": 2,
  "laneName": "Làn 2",
  "displayUntil": "2026-07-22T16:30:20Z"
}
```

Requirements:

- authenticate the display and scope it to one branch;
- never include customer name, phone, payment amount, or technical exception details;
- publish after the database transaction commits;
- retain the latest event briefly so a reconnecting display can recover;
- use `eventId` for deduplication and a heartbeat/connection status for offline indication.

