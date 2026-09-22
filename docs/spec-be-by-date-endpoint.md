# Spec gửi BE — Thêm endpoint cho Manager xem booking theo ngày

> Người gửi: FE team
> Ngày: 2026-09-06
> Mức độ: BLOCKER (Manager không xem được sổ ngày → lỗi 403)

---

## 1. Bối cảnh

Trang `/manager/bookings` ở FE gồm 2 phần:
- **Lịch tuần (grid)**: gọi `GET /manager/bookings` → hoạt động bình thường (chỉ Manager).
- **Sổ ngày (panel)**: khi Manager click vào 1 ngày trên grid → gọi `GET /admin/bookings?targetDate=YYYY-MM-DDT00:00:00Z` → **BE trả 403**.

User đã xác nhận qua DevTools Network: response status = **403, body rỗng**.

## 2. Nguyên nhân (FE đã đọc source BE)

Trong file `d:\Project SU26\BE\SmartWash-BE\API\Controllers\Staff\StaffBookingsController.cs` (dòng 12):

```csharp
[Route("api/v1/admin/bookings")]
[ApiController]
[Authorize(Roles = "Admin,Staff")]
public class StaffBookingsController : ControllerBase
```

Dù URL prefix là `/admin/bookings`, attribute `[Authorize(Roles = "Admin,Staff")]` chỉ cho phép **Admin** và **Staff**. Manager không có quyền → 403.

Logic filter ngày bên trong (`b.ScheduledTime.Date == targetDate.Date`) đã đúng, không cần sửa.

## 3. Yêu cầu BE

### 3.1. Phương án được chọn: Thêm endpoint mới cho Manager

Thêm endpoint trong controller `ManagerController.cs` (hoặc tạo file mới `ManagerBookingsController.cs` nếu tách riêng):

```csharp
[HttpGet("bookings/by-date")]
[Authorize(Roles = "Manager")]
public async Task<IActionResult> GetBookingsByDate([FromQuery] DateTime targetDate)
{
    // Lấy BranchId từ JWT claim
    var branchIdClaim = User.FindFirst("BranchId")?.Value;
    if (string.IsNullOrEmpty(branchIdClaim) || !int.TryParse(branchIdClaim, out int branchId))
    {
        throw new AutoWashPro.BLL.Exceptions.UnauthorizedException(
            "Branch information (BranchId) not found in token.", "BRANCH_REQUIRED");
    }

    var result = await _managerService.GetBookingsByDateInBranchAsync(targetDate, branchId);
    return Ok(new { statusCode = 200, message = "Success", data = result });
}
```

**Logic service tương ứng (template):**

```csharp
public async Task<List<AdminBookingResponseDTO>> GetBookingsByDateInBranchAsync(
    DateTime targetDate, int branchId)
{
    var bookings = await _context.Bookings
        .Where(b => b.BranchId == branchId && b.ScheduledTime.Date == targetDate.Date)
        .Include(b => b.AppliedVoucher)
        .Include(b => b.BookingMaterialUsages).ThenInclude(u => u.Material)
        .OrderBy(b => b.ScheduledTime)
        .Select(b => new AdminBookingResponseDTO
        {
            BookingId = b.BookingId,
            UserId = b.UserId,
            LicensePlate = b.LicensePlate ?? "",
            CustomerName = b.BusinessProfile != null
                ? b.BusinessProfile.CompanyName
                : b.User != null && b.User.CustomerProfile != null
                    ? b.User.CustomerProfile.FullName
                    : null,
            CustomerPhone = b.User != null ? b.User.PhoneNumber : null,
            BookingType = b.BookingType,
            BusinessProfileId = b.BusinessProfileId,
            FleetVehicleId = b.FleetVehicleId,
            ServiceNames = b.BookingDetails.Select(d => d.Service.ServiceName ?? "").ToList(),
            ScheduledTime = b.ScheduledTime,
            Status = b.Status ?? "",
            OriginalPrice = b.OriginalPrice,
            PointsUsed = b.PointsUsed,
            PointDiscountAmount = b.PointDiscountAmount,
            AppliedVoucherId = b.AppliedVoucherId,
            AppliedVoucherCode = b.AppliedVoucher != null ? b.AppliedVoucher.Code : string.Empty,
            VoucherDiscountAmount = b.VoucherDiscountAmount,
            FinalAmount = b.FinalAmount,
            ProcessingStartTime = b.ProcessingStartTime,
            CompletedTime = b.CompletedTime,
            ActualDurationMinutes = b.ActualDurationMinutes,
            ProcessingLaneId = b.ProcessingLaneId,
            ProcessingLaneName = b.ProcessingLane != null ? b.ProcessingLane.Name : null,
            CheckInImageUrl = b.CheckInImageUrl,
            CheckOutImageUrl = b.CheckOutImageUrl,
            MaterialUsages = b.BookingMaterialUsages.Select(u => new BookingMaterialUsageDTO
            {
                MaterialId = u.MaterialId,
                MaterialName = u.Material.Name,
                QuantityUsed = u.QuantityUsed,
                Unit = u.Material.Unit,
                CostAmount = u.CostAmount,
                UsageType = u.UsageType
            }).ToList()
        })
        .ToListAsync();

    // (Optional) Hydrate payment status / details giống GetAllBookingsByDateAsync hiện tại
    var bookingIds = bookings.Select(b => b.BookingId).ToList();
    // ... copy phần hydrate từ GetAllBookingsByDateAsync hiện tại

    return bookings;
}
```

### 3.2. Bổ sung DTO (bắt buộc)

Thêm field `BranchId` (nullable int) vào `AdminBookingResponseDTO` để FE có thể audit/filter/log:

```csharp
public class AdminBookingResponseDTO : BookingResponseDTO
{
    public int? BranchId { get; set; }   // <-- THÊM
    public string? BranchName { get; set; }   // <-- THÊM (optional)
    public int? UserId { get; set; }
    // ... các field hiện có
}
```

Và update query để populate:
```csharp
BranchId = b.BranchId,
BranchName = b.Branch != null ? b.Branch.Name : null,
```

### 3.3. Yêu cầu kỹ thuật

| # | Yêu cầu | Lý do |
|---|---|---|
| 1 | Filter `BranchId == claim` ở BLL (không phải controller) | Tránh leak booking chi nhánh khác |
| 2 | Trả về **mọi status** (Pending/CheckedIn/Processing/Completed/Cancelled/NoShow) | Sổ ngày cần xem toàn bộ, không chỉ active |
| 3 | Bao gồm cả **walk-in booking** (cùng bảng `Bookings`) | Sổ ngày cần thấy walk-in |
| 4 | Giữ nguyên format `targetDate` input: ISO datetime (`YYYY-MM-DDT00:00:00Z` từ FE) | FE không cần đổi |
| 5 | Hydrate payment status + booking details giống `GetAllBookingsByDateAsync` hiện tại | Đảm bảo FE render đầy đủ thông tin |

## 4. Endpoint FE sẽ gọi sau khi BE xong

```
GET /api/v1/manager/bookings/by-date?targetDate=2026-08-28T00:00:00Z
Headers:
  Authorization: Bearer <jwt-manager>
```

Response shape (giống `/admin/bookings?targetDate=`):

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "bookingId": 123,
      "branchId": 7,
      "branchName": "Chi nhánh Quận 1",
      "licensePlate": "51H-12345",
      "customerName": "Nguyen Van A",
      "serviceNames": ["Rửa ngoài", "Hút bụi"],
      "scheduledTime": "2026-08-28T08:00:00",
      "status": "Pending",
      "finalAmount": 150000,
      "details": [ ... ],
      "materialUsages": [ ... ]
    }
  ]
}
```

## 5. Những gì KHÔNG cần BE làm

- Không sửa logic lọc ngày (`ScheduledTime.Date == targetDate.Date`) — đã đúng.
- Không sửa `AdminBookingResponseDTO` các field hiện có — chỉ thêm `BranchId` / `BranchName`.
- Không sửa `[Authorize(Roles = "Admin,Staff")]` ở `StaffBookingsController.cs` — Admin/Staff page vẫn dùng endpoint đó.

## 6. Acceptance criteria

- [ ] Manager login → gọi `GET /api/v1/manager/bookings/by-date?targetDate=...` → 200, body chứa booking đúng ngày đúng chi nhánh.
- [ ] Manager không thấy booking của chi nhánh khác.
- [ ] Response chứa field `branchId` và `branchName`.
- [ ] Walk-in booking trong cùng chi nhánh được trả về.
- [ ] Admin/Staff endpoint cũ `/admin/bookings?targetDate=` vẫn hoạt động bình thường.

## 7. Sau khi BE deploy, FE sẽ:

1. Thêm helper `fetchBookingsByDateForRole(targetDate)` trong `src/api/admin.bookings.api.js` — tự route theo role:
   - Role `Manager` → gọi `/manager/bookings/by-date?targetDate=...`.
   - Role khác → gọi `/admin/bookings?targetDate=...`.
2. Đổi `ManagerBookingsPage.jsx` dùng helper mới.
3. Verify với ngày 28/08/2026 (ngày user báo lỗi), ngày hôm nay, ngày quá khứ khác.
