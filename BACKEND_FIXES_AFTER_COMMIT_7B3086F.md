# Backend fixes after commit `7b3086f`

## Phạm vi

- AI và các API AI chạy local là thiết kế chính thức do server không đủ RAM.
- Không cần sửa việc frontend gọi AI local.
- Các lỗi dưới đây nằm trong logic backend của lane allocation, reconciliation và smart license-plate lookup.

## 1. Sửa xác định khách VIP

**File:** `BLL/Services/Operations/LaneAdmissionCoordinator.cs`

**Các vị trí liên quan:** `BuildCompatibleLaneQuery`, `CheckInAtEntryGateAsync`, `InternalAdmitNextWaitingVehicleAsync`.

Không dùng `Tier.MinAccumulatedPoints` để xác định VIP.

Thống nhất điều kiện VIP:

```csharp
var isVip =
    profile != null &&
    (
        profile.TotalPoint >= 5000 ||
        string.Equals(profile.Tier?.TierName, "Gold", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(profile.Tier?.TierName, "Platinum", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(profile.Tier?.TierName, "Diamond", StringComparison.OrdinalIgnoreCase)
    );
```

Áp dụng cùng một điều kiện tại:

- Check-in cổng.
- Chọn xe tiếp theo trong hàng đợi.
- Kiểm tra khách VIP sắp đến trong 30 phút.
- Các API kiểm tra slot VIP trong `BookingService`.

## 2. Sửa thứ tự cấp phát buồng rửa

**File:** `BLL/Services/Operations/LaneAdmissionCoordinator.cs`

Hiện tại `BuildCompatibleLaneQuery(..., isVip)` chưa sử dụng `isVip` và chỉ sắp xếp theo tên làn.

Sửa thứ tự chọn buồng như sau:

### Xe VIP

1. Chọn buồng trống có `IsVipLane == true`.
2. Nếu không có, chọn buồng thường trống `IsVipLane == false`.
3. Nếu không còn buồng trống, giữ xe ở trạng thái `CheckedIn`, `ProcessingLaneId = null`.

### Xe thường

1. Chọn buồng thường trống `IsVipLane == false`.
2. Nếu không có buồng thường trống, mới xét buồng VIP trống.
3. Chỉ cấp buồng VIP cho xe thường khi:
   - Không có xe VIP đang đợi: `Status == "CheckedIn"` và `ProcessingLaneId == null`.
   - Không có booking VIP `Pending` hoặc `Confirmed` có `ScheduledTime` từ thời điểm hiện tại đến 30 phút tiếp theo.
4. Nếu cần giữ buồng VIP, xe thường tiếp tục chờ trước barie; không mở barie và không tạo lệnh `OPEN`.

Không được chặn xe thường khỏi buồng thường chỉ vì đang có khách VIP chờ.

## 3. Ưu tiên VIP khi buồng vừa trống

**File:** `BLL/Services/Operations/LaneAdmissionCoordinator.cs`

**Method:** `InternalAdmitNextWaitingVehicleAsync`

Hiện tại hàng đợi đang lấy theo `ScheduledTime` thuần túy.

Sửa lựa chọn xe tiếp theo:

1. Lấy các booking đang chờ:
   - `Status == "CheckedIn"`.
   - `ProcessingLaneId == null`.
   - Đúng `BranchId`.
   - Tương thích với loại lane/business hiện tại.
2. Tính `IsVip` cho từng booking theo điều kiện chung.
3. Ưu tiên `IsVip == true`.
4. Trong cùng nhóm VIP hoặc thường, lấy xe chờ lâu nhất.
5. Chỉ khi chọn được xe hợp lệ mới:
   - Tạo `LaneOccupancy`.
   - Đặt `ProcessingLaneId`.
   - Chuyển trạng thái sang `Processing`.
   - Tạo barrier command `OPEN`.
   - Gửi lane-display event.

## 4. Không xóa nhầm occupancy của xe Fleet

**File:** `BLL/Services/Operations/OperationsMonitoringService.cs`

**Method:** `RunReconciliationCheckAsync`

Logic hiện tại xóa occupancy khi `BookingId == null`. Điều này sai vì Fleet Walk-in sử dụng `FleetWashLogId` và có thể không có `BookingId`.

Sửa theo ba nhánh:

```csharp
if (occupancy.BookingId.HasValue)
{
    // Kiểm tra Booking.
}
else if (occupancy.FleetWashLogId.HasValue)
{
    // Kiểm tra FleetWashLog.
}
else
{
    // Chỉ trường hợp cả hai ID đều null mới xác định stale ngay.
}
```

Với occupancy theo booking, chỉ xóa khi:

- Booking không tồn tại.
- Booking ở trạng thái kết thúc: `Completed`, `Cancelled`, `NoShow`.
- Booking không còn `Processing`.
- `booking.ProcessingLaneId != occupancy.LaneId`, bao gồm cả trường hợp `ProcessingLaneId == null`.

Với occupancy theo Fleet, chỉ xóa khi:

- `FleetWashLog` không tồn tại.
- Fleet log ở trạng thái kết thúc: `Completed` hoặc `Cancelled`.
- Fleet log không còn `Processing`.
- `fleetLog.LaneId != occupancy.LaneId`, bao gồm cả trường hợp `LaneId == null`.

Sau khi xóa stale occupancy mới được gọi `AdmitNextWaitingVehicleAsync`.

## 5. Sửa smart lookup cho booking đang hoạt động

**File:** `BLL/Services/Bookings/BookingService.cs`

**Method:** API lookup biển số được gọi bởi:

```http
GET /api/v1/admin/bookings/by-license-plate/{licensePlate}
```

Booking `CheckedIn` hoặc `Processing` không được giới hạn bằng:

```csharp
b.ScheduledTime.Date == todayInVN
```

Sửa thứ tự lookup:

1. Tìm booking đang hoạt động theo `BranchId + normalized license plate`:
   - `Status == "Processing"` hoặc `Status == "CheckedIn"`.
   - Không giới hạn ngày đặt lịch.
   - Ưu tiên `Processing`, sau đó booking mới nhất.
2. Nếu không có active booking, tìm booking `Pending/Confirmed` đúng ngày hoặc trong khoảng thời gian check-in hợp lệ.
3. Chỉ khi không có booking phù hợp mới trả `CustomerType = "WalkIn"`.

Response của active booking phải có:

```json
{
  "customerType": "PreBooked",
  "customerTierName": "Silver",
  "customerTierPoints": 700,
  "isVip": false,
  "data": {
    "bookingId": 319,
    "status": "Processing",
    "processingLaneId": 4,
    "processingLaneName": "Test Lane MCP"
  }
}
```

## 6. Đồng bộ điều kiện VIP trong BookingService

**File:** `BLL/Services/Bookings/BookingService.cs`

Thay các vị trí đang dùng:

```csharp
profile.Tier.MinAccumulatedPoints >= 5000
```

bằng:

```csharp
profile.TotalPoint >= 5000
```

Vẫn giữ điều kiện hạng `Gold`, `Platinum`, `Diamond`.

Áp dụng cho:

- Gợi ý/kiểm tra time slot VIP.
- Validate booking compatibility.
- Smart license-plate response.
- Mọi logic backend quyết định quyền VIP.

## 7. Rebuild và chỉ chạy một backend instance

Sau khi sửa:

1. Dừng toàn bộ process API đang chạy.
2. Clean và rebuild solution.
3. Chạy một API instance duy nhất.
4. Xác nhận `API/bin/Debug/net8.0/BLL.dll` có thời gian build mới.

Hiện môi trường local đang có hai API process và API đang load `BLL.dll` cũ, nên commit mới chưa được phản ánh đầy đủ trong response runtime.

## Tiêu chí xác nhận

- Fleet Walk-in đang `Processing` không bị reconciliation xóa occupancy.
- Reconciliation xử lý được trường hợp `ProcessingLaneId/LaneId == null` hoặc khác occupancy.
- Xe VIP ưu tiên buồng VIP, sau đó mới dùng buồng thường.
- Xe thường ưu tiên buồng thường.
- Xe thường chỉ dùng buồng VIP khi không có VIP đang chờ hoặc sắp đến trong 30 phút.
- Khi buồng trống và có cả VIP lẫn xe thường chờ, VIP được chọn trước.
- Booking active từ ngày trước vẫn được smart lookup trả về `PreBooked`.
- Biển số `30F33333` đang `Processing` phải trả booking hiện tại, không trả `WalkIn`.
- Response smart lookup có đủ `customerTierName`, `customerTierPoints`, `isVip`.
- Backend local chỉ chạy một API instance sau khi rebuild.
