# Backend fixes sau khi test môi trường deploy

## 1. Dọn `LaneOccupancy` cũ trước khi cấp làn

**File:** `BLL/Services/Operations/OperationsMonitoringService.cs`  
**Method:** `RunReconciliationCheckAsync`

- Xóa `LaneOccupancy` khi:
  - `BookingId` không còn tồn tại.
  - Booking đã `Completed`, `Cancelled` hoặc `NoShow`.
  - Booking không còn `Processing`.
  - `Booking.ProcessingLaneId` khác `LaneOccupancy.LaneId`.
- Sau khi xóa occupancy, gọi `AdmitNextWaitingVehicleAsync()` cho làn vừa được giải phóng.
- Chạy reconciliation tự động bằng `BackgroundService` theo chu kỳ, không phụ thuộc gọi API thủ công.
- Dọn dữ liệu deploy hiện tại:
  - Làn 1: booking `#40`, biển số `30A-888.88`.
  - Làn 4: booking `#316`, biển số `88B70278`.

## 2. Không trả xe đang check-in thành `WalkIn`

**File:** `BLL/Services/Bookings/BookingService.cs`  
**Method:** `LookupLicensePlateAsync`

- Query booking hiện chỉ lấy `Pending` và `Confirmed`.
- Bổ sung `CheckedIn` và `Processing`.
- Ưu tiên trả booking đang hoạt động trước khi chuyển sang nhánh `WalkIn`.
- Xe `30F33333`, booking `#319` đang `CheckedIn` phải trả `CustomerType = "PreBooked"` hoặc loại active-booking tương đương, không trả `WalkIn`.

## 3. Trả thông tin VIP trong lookup biển số

**File:** `BLL/Services/Bookings/BookingService.cs`  
**Method:** `LookupLicensePlateAsync`

Trong response của cả `PreBooked` và khách đã đăng ký nhưng chưa có booking, bổ sung:

```json
{
  "customerTierName": "Gold",
  "customerTierPoints": 5000,
  "isVip": true
}
```

`isVip = true` khi:

- `CustomerProfile.TotalPoint >= 5000`, hoặc
- Tier là `Gold`, `Platinum` hoặc `Diamond`.

## 4. Đồng bộ `IsVipLane` qua API làn

**Files:**

- `BLL/DTOs/Lane/LaneDTO.cs`
- `BLL/DTOs/Lane/CreateLaneDTO.cs`
- `BLL/DTOs/Lane/UpdateLaneDTO.cs`
- `BLL/Services/LaneService.cs`
- `BLL/Services/HR/ManagerService.cs`

- Thêm field `IsVipLane`.
- Map field này khi GET, tạo và cập nhật làn.
- `GET /api/v1/admin/lanes` và `GET /api/v1/manager/lanes` phải trả `isVipLane`.
