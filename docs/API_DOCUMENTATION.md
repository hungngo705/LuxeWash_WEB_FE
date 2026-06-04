# Tài Liệu API AutoWashPro (Backend-Driven Architecture)

Tài liệu này hướng dẫn cách Frontend tích hợp với Backend API cho hệ thống đặt lịch chăm sóc xe.
Hệ thống hoạt động theo mô hình 1 Booking = 1 Xe, hỗ trợ đa chi nhánh và trả trước qua ví.

---

## I. TÀI LIỆU API LUỒNG VẬN HÀNH (1 BOOKING = 1 XE)

### Bước 1: Setup Nền tảng (Role: Admin)
*(Những API này thường nằm ở màn hình Admin Dashboard)*

#### 1. Tạo Chi nhánh
1. **Business Purpose**: Cho phép Admin tạo mới một chi nhánh vật lý trên hệ thống.
2. **Prerequisites**: Cần có quyền Admin.
3. **Request Payload**:
   - `POST /api/v1/admin/branches`
   - Header: `Authorization: Bearer <admin_token>`
   - Body: `CreateBranchDTO` (Tên chi nhánh, địa chỉ, số điện thoại, v.v.)
4. **Expected Response & Error Handling**: Trả về `201 Created` cùng thông tin chi nhánh vừa tạo (ID). `400` nếu dữ liệu không hợp lệ.
5. **Next Steps**: Lấy `BranchId` để tạo Lane, Services, và TimeSlot.
6. **Critical Warnings for FE**: Chi nhánh là cấu hình gốc, các dữ liệu khác sẽ reference tới ID này.

#### 2. Tạo Dịch vụ
1. **Business Purpose**: Thêm mới dịch vụ rửa/chăm sóc xe với cấu hình giá và chi nhánh áp dụng.
2. **Prerequisites**: Quyền Admin. Cần có `BranchId`.
3. **Request Payload**:
   - `POST /api/v1/admin/services`
   - Header: `Authorization: Bearer <admin_token>`
   - Body: `CreateOrUpdateServiceDTO`
4. **Expected Response**: `201 Created` và thông tin dịch vụ.
5. **Next Steps**: Khách hàng có thể chọn dịch vụ này trong giỏ hàng.
6. **Critical Warnings for FE**: Giá của dịch vụ có thể khác nhau tùy theo loại xe (VehicleTypeId).

#### 3. Tạo Khung giờ (TimeSlot)
1. **Business Purpose**: Tạo các khung giờ hoạt động cho chi nhánh.
2. **Prerequisites**: Quyền Admin (hoặc Staff có quyền). Cần có `BranchId`.
3. **Request Payload**:
   - `POST /api/v1/admin/time-slots`
   - Header: `Authorization: Bearer <admin_token>`
   - Body: `CreateTimeSlotDTO` (Bắt đầu, kết thúc, sức chứa/số slot).
4. **Expected Response**: `201 Created`.
5. **Next Steps**: Hiển thị các khung giờ này khi khách hàng check Available Slots.
6. **Critical Warnings for FE**: Mỗi khung giờ có giới hạn CapacityWeight.

#### 4. Tạo Quản lý (Manager)
1. **Business Purpose**: Tạo tài khoản cho người quản lý chi nhánh.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**:
   - `POST /api/v1/admin/employees`
   - Header: `Authorization: Bearer <admin_token>`
   - Body: `CreateEmployeeDTO` (Role = "Manager", BranchId, SDT, Password, ...)
4. **Expected Response**: `200 OK` (hoặc `201`) trả về Employee.
5. **Next Steps**: Cung cấp tài khoản cho Manager đăng nhập app.
6. **Critical Warnings for FE**: Account internal này kích hoạt ngay không cần OTP. Role phải map với enum hệ thống.

---

### Bước 2: Chuẩn bị Vận hành tại Trạm (Role: Manager)
*(Manager dùng app hoặc web quản lý tại trạm)*

#### 1. Tạo Làn (Lane)
1. **Business Purpose**: Tạo các làn phục vụ xe vật lý (VD: Làn bọt tuyết, Làn khô) cho chi nhánh.
2. **Prerequisites**: Quyền Admin/Manager.
3. **Request Payload**:
   - `POST /api/v1/admin/lanes`
   - Header: `Authorization: Bearer <token>`
   - Body: `CreateLaneDTO`
4. **Expected Response**: `201 Created` kèm `LaneId`.
5. **Next Steps**: Assign staff vào lane.
6. **Critical Warnings for FE**: Làn phải gắn với đúng `BranchId`.

#### 2. Lấy danh sách Nhân viên trong Chi nhánh
1. **Business Purpose**: Manager lấy danh sách Staff thuộc chi nhánh mình đang quản lý.
2. **Prerequisites**: Quyền Manager.
3. **Request Payload**:
   - `GET /api/v1/manager/staff`
   - Header: `Authorization: Bearer <manager_token>`
4. **Expected Response**: `200 OK` trả về danh sách Staff.
5. **Next Steps**: Hiển thị trên UI để chọn Staff xếp ca.
6. **Critical Warnings for FE**: API tự động lấy BranchId của Manager từ Token.

#### 3. Phân công Nhân viên đứng Làn
1. **Business Purpose**: Đầu ngày, Manager assign 1 Staff vào 1 Lane cụ thể.
2. **Prerequisites**: Quyền Manager. Cần `StaffId` và `LaneId`.
3. **Request Payload**:
   - `POST /api/v1/manager/lanes/assign-staff`
   - Header: `Authorization: Bearer <manager_token>`
   - Body: `AssignStaffToLaneDTO` (`StaffId`, `LaneId`, `AssignedDate`).
4. **Expected Response**: `200 OK` thông báo thành công.
5. **Next Steps**: Staff khi login sẽ thấy các Booking đẩy vào Lane của mình.
6. **Critical Warnings for FE**: Staff phải chưa được assign vào lane khác trong cùng ca/ngày đó.

---

### Bước 3: Khách hàng Đặt lịch (Role: Customer / FE App)

#### 1. Khách xem Khung giờ rảnh
1. **Business Purpose**: Trả về danh sách khung giờ trống trong ngày dựa trên giỏ hàng (sức chứa).
2. **Prerequisites**: Giỏ hàng (danh sách xe, dịch vụ) phải được chọn trước. Khách phải đăng nhập.
3. **Request Payload**:
   - `POST /api/v1/bookings/available-slots`
   - Header: `Authorization: Bearer <customer_token>`
   - Body: `CheckAvailableSlotsRequestDTO` (`targetDate`, `bookingVehicles`).
4. **Expected Response**: `200 OK` danh sách Slot kèm cờ `isAvailable` (true/false) và `reason`.
5. **Next Steps**: UI disable các khung giờ false, cho phép chọn true.
6. **Critical Warnings for FE**: Luôn phụ thuộc cờ `isAvailable` của BE. Phải gọi lại API khi thay đổi giỏ hàng.

#### 2. Khách kiểm tra sức chứa (trước thanh toán)
1. **Business Purpose**: Xác nhận lần cuối cùng xem Slot đã chọn còn trống hay không trước khi gọi API tạo booking (để chặn tranh chấp chỗ).
2. **Prerequisites**: Đã chọn Slot.
3. **Request Payload**:
   - `POST /api/v1/bookings/check-compatibility`
   - Header: `Authorization: Bearer <customer_token>`
   - Body: `CheckCompatibilityRequestDTO` (giống lúc check slot).
4. **Expected Response**: `200 OK`. `400` nếu đã đầy.
5. **Next Steps**: Gọi tạo Booking.
6. **Critical Warnings for FE**: Dùng để validate phòng hờ concurrency.

#### 3. Khách chốt Đặt lịch (Tạo Booking)
1. **Business Purpose**: Chốt lịch hẹn, trừ tiền ví tự động.
2. **Prerequisites**: Có đủ số dư trong Ví, đã qua các bước check Slot.
3. **Request Payload**:
   - `POST /api/v1/bookings`
   - Header: `Authorization: Bearer <customer_token>`
   - Body: `CreateBookingDTO` (`BranchId`, `SlotId`, `bookingVehicles` (có `LicensePlate`, `ServiceId`, v.v.), `VoucherCodes`, `usePointDiscount`).
4. **Expected Response**: `201 Created` kèm số tiền cuối cùng và số dư còn lại. `400` nếu thiếu tiền.
5. **Next Steps**: Chuyển hướng sang màn hình thành công, hiển thị BookingID.
6. **Critical Warnings for FE**: Transaction tạo booking và trừ ví là đồng bộ (Atomic). API tự tính lại giá cuối cùng, không tin tưởng `Price` từ UI.

#### 4. Khách vãng lai (Quản lý/Staff tạo giùm)
1. **Business Purpose**: Tiếp nhận xe đến thẳng trạm mà không hẹn trước, ưu tiên xử lý check-in ngay.
2. **Prerequisites**: Quyền Staff/Manager/Admin.
3. **Request Payload**:
   - `POST /api/v1/bookings/walk-in`
   - Header: `Authorization: Bearer <staff_token>`
   - Body: `CreateWalkInBookingDTO` (như trên nhưng bỏ qua bước chọn slot tương lai).
4. **Expected Response**: `201 Created`.
5. **Next Steps**: Chuyển trạng thái xe vào Check-in/Lane luôn.
6. **Critical Warnings for FE**: FE truyền thẳng các dịch vụ cần làm.

---

### Bước 4: Điều phối xe khi khách tới trạm (Role: Manager)

#### 1. Lấy danh sách xe chuẩn bị vào / đang ở trạm
1. **Business Purpose**: Manager xem list Booking đang Pending/CheckedIn/Processing tại chi nhánh.
2. **Prerequisites**: Quyền Manager.
3. **Request Payload**:
   - `GET /api/v1/manager/bookings` (Theo Controller route, API là `GET /api/v1/manager/bookings`)
   - Header: `Authorization: Bearer <manager_token>`
4. **Expected Response**: `200 OK` List xe chờ.
5. **Next Steps**: Manager scan biển số hoặc click vào list để điều xe.
6. **Critical Warnings for FE**: API tự lọc theo Branch của Manager.

#### 2. Check-in và Điều xe vào Làn
1. **Business Purpose**: Xác nhận xe đã đến trạm và đưa vào Lane.
2. **Prerequisites**: Quyền Manager.
3. **Request Payload**:
   - `POST /api/v1/manager/bookings/{bookingId}/checkin-assign`
   - Header: `Authorization: Bearer <manager_token>`
   - Body: `AssignBookingToLaneDTO` (`LaneId`).
4. **Expected Response**: `200 OK` đổi Status thành `CheckedIn`.
5. **Next Steps**: Xe xuất hiện trên màn hình của Staff đang phụ trách Lane đó.
6. **Critical Warnings for FE**: Bắt buộc phải có xe đến vật lý.

---

### Bước 5: Nhân viên Rửa xe (Role: Staff)

#### 1. Staff xem danh sách xe cần rửa
1. **Business Purpose**: Staff xem các xe đang ở Lane của mình (CheckedIn) hoặc đang làm dở (Processing).
2. **Prerequisites**: Quyền Staff, đã được Manager phân công Lane.
3. **Request Payload**:
   - `GET /api/v1/operation-staff/tasks`
   - Header: `Authorization: Bearer <staff_token>`
4. **Expected Response**: `200 OK` List Booking.
5. **Next Steps**: Staff chọn xe để bắt đầu.
6. **Critical Warnings for FE**: Lấy dữ liệu theo `StaffId` ngầm.

#### 2. Staff bắt đầu rửa xe
1. **Business Purpose**: Chuyển status Booking sang "Đang xử lý".
2. **Prerequisites**: Xe đang CheckedIn.
3. **Request Payload**:
   - `PUT /api/v1/operation-staff/bookings/{bookingId}/status`
   - Header: `Authorization: Bearer <staff_token>`
   - Body: `UpdateBookingStatusDTO` (`Status`: "Processing")
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Khách hàng có thể theo dõi tiến độ qua App.
6. **Critical Warnings for FE**: Lưu lại vết Staff nào thao tác.

#### 3. Staff rửa xong
1. **Business Purpose**: Chuyển status Booking sang "Hoàn thành". Tính loyalty point và gửi mail.
2. **Prerequisites**: Xe đang Processing.
3. **Request Payload**:
   - `PUT /api/v1/operation-staff/bookings/{bookingId}/status`
   - Header: `Authorization: Bearer <staff_token>`
   - Body: `UpdateBookingStatusDTO` (`Status`: "Completed")
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Xe rời trạm.
6. **Critical Warnings for FE**: Quá trình này sẽ gọi ngầm IWalletService.AwardCompletionPointsAsync để thưởng điểm.

---

### Các API bổ trợ khác trong luồng

#### 1. Ghi nhận tình trạng xe (Phụ phí)
1. **Business Purpose**: Đánh giá độ dơ của xe để báo thêm phụ phí nếu cần.
2. **Prerequisites**: Quyền Staff/Manager.
3. **Request Payload**:
   - `PUT /api/v1/bookings/{bookingId}/condition`
   - Header: `Authorization: Bearer <token>`
   - Body: `UpdateVehicleConditionDTO` (Tình trạng bẩn).
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Cập nhật giá booking nếu có phụ phí.
6. **Critical Warnings for FE**: Phải thỏa thuận trước với khách.

#### 2. Hủy lịch (Khách tự hủy)
1. **Business Purpose**: Khách tự hủy lịch trước giờ hẹn.
2. **Prerequisites**: Booking Status là Pending.
3. **Request Payload**:
   - `PUT /api/v1/bookings/{bookingId}/cancel`
   - Header: `Authorization: Bearer <customer_token>`
4. **Expected Response**: `200 OK`. Hoàn tiền/Hoàn điểm theo logic.
5. **Next Steps**: Cập nhật list booking.
6. **Critical Warnings for FE**: Việc hoàn cọc (nếu có) tùy thuộc rule thời gian hệ thống.

#### 3. Báo vắng mặt (No-show)
1. **Business Purpose**: Khách không tới (Manager/Staff đánh dấu).
2. **Prerequisites**: Quyền Admin/Staff/Manager.
3. **Request Payload**:
   - `PUT /api/v1/admin/bookings/{id}/no-show`
   - Header: `Authorization: Bearer <staff_token>`
4. **Expected Response**: `200 OK`. Tiền cọc không được hoàn lại.
5. **Next Steps**: Cập nhật Slot khả dụng cho khách khác nếu còn thời gian.
6. **Critical Warnings for FE**: Chỉ thực hiện khi đã quá giờ hẹn lâu.

---

## II. GIẢI THÍCH CÁC CƠ CHẾ HOẠT ĐỘNG (MECHANISMS)

### 1. Cơ chế Thanh toán (Payment & Wallet)
Hệ thống sử dụng mô hình **Trả trước qua Ví (Prepay/Deposit Model)**.
- Khi khách hàng đăng ký tài khoản, hệ thống tự động tạo 1 Ví (Wallet) đi kèm.
- **Top-up (Nạp tiền)**: Khách nạp tiền qua cổng thanh toán trung gian (PayOS). API `POST /api/v1/wallets/top-up` tạo link thanh toán. Sau khi khách quét mã QR và chuyển khoản thành công, PayOS sẽ gọi Webhook (`POST /api/v1/wallets/top-up/callback`) về hệ thống. Backend cập nhật số dư ví.
- **Polling phía FE**: Vì Webhook là bất đồng bộ, Frontend sau khi mở link thanh toán cần thực hiện Polling (gọi `GET /api/v1/wallets/me` liên tục mỗi 3-5 giây) để kiểm tra xem số dư đã thay đổi chưa để thông báo nạp thành công.
- **Trừ tiền tự động**: Khi gọi API tạo Booking, hệ thống thực hiện Atomic Transaction: Tính tổng tiền dịch vụ -> Áp dụng Voucher/Điểm -> Trừ thẳng số tiền cuối cùng vào Ví (Nếu số dư >= FinalAmount) -> Tạo Booking. Không có khái niệm nợ hay thanh toán tiền mặt tại trạm.

### 2. Cơ chế Email (Background Task)
Email notification (Gửi mail xác nhận đặt lịch, đổi quà, v.v.) hoạt động theo cơ chế **Fire-and-Forget**.
- Ví dụ API `POST /api/v1/bookings/{bookingId}/trigger-email` hoặc tự động gọi lúc tạo Booking.
- Logic gửi email được bọc trong `Task.Run()` kết hợp với Dependency Injection Scope mới (using scope).
- Nhờ vậy, API Controller không bị block bởi tốc độ mạng của SMTP Server. Nó trả về `201 Created` hoặc `202 Accepted` cho Frontend ngay lập tức. Email sẽ được gửi ngầm.

### 3. Cơ chế Khung giờ (Time Slots)
- Admin sẽ khai báo cấu hình khung giờ cho từng Chi nhánh (`POST /api/v1/admin/time-slots`).
- Mỗi TimeSlot không quy định cụ thể là mấy chiếc xe, mà quy định **Sức chứa (Capacity/Max Slot Weight)**.
- Mỗi Vehicle Type và Service sẽ có `BaseWeight` riêng.
- Khi khách lấy danh sách khung giờ (`POST /api/v1/bookings/available-slots`), Backend sẽ lấy Sức chứa tối đa của Slot trừ đi Tổng Weight của các xe đã chốt trong Slot đó. Nếu phần dư còn đủ cho tổng Weight của Giỏ hàng hiện tại của khách -> Khung giờ đó mới `IsAvailable = true`.

### 4. Cơ chế Phân bổ Nhân viên (Staff Allocation)
- Nhân viên khi được tạo (`AdminEmployeesController`) sẽ gắn cứng với 1 `BranchId`.
- Manager của Branch đó lấy list Staff.
- Đầu ca làm việc, Manager gắn (Assign) `StaffId` vào `LaneId` (Ví dụ: Nhân viên Nguyễn Văn A phụ trách Làn Bọt Tuyết số 1).
- Khi có xe Check-in, Manager điều phối xe đẩy thẳng vào Làn số 1.
- Màn hình Tablet của nhân viên Nguyễn Văn A (API `GET /api/v1/operation-staff/tasks`) sẽ ngầm hiểu Token của A đang đứng ở Làn 1, tự động fetch các xe đang nằm trong Làn 1 để A bấm "Processing".

---

## III. DANH SÁCH TOÀN BỘ CÁC API KHÁC TRONG HỆ THỐNG

### 1. AIChatbotController
#### `POST /api/v1/ai/chat`
1. **Business Purpose**: Cho phép khách hàng chat với AI để được tư vấn (VD: Chọn loại rửa xe nào).
2. **Prerequisites**: Quyền Customer, rate limited.
3. **Request Payload**: `AIChatRequestDTO` chứa `Message`.
4. **Expected Response**: AI reply dạng text.
5. **Next Steps**: Hiển thị trên UI Chat.
6. **Critical Warnings for FE**: API có áp dụng Rate Limiting.

#### `GET /api/v1/ai/recommendation`
1. **Business Purpose**: Gợi ý dịch vụ chăm sóc xe thông minh dựa trên lịch sử xe.
2. **Prerequisites**: Quyền Customer.
3. **Request Payload**: Không.
4. **Expected Response**: Dữ liệu gợi ý.
5. **Next Steps**: Hiển thị banner/popup gợi ý.
6. **Critical Warnings for FE**: Phải handle trường hợp data trả về rỗng nếu user chưa có lịch sử.

### 2. AdminBranchesController
#### `GET /api/v1/admin/branches`
1. **Business Purpose**: Lấy danh sách tất cả các chi nhánh.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Không.
4. **Expected Response**: Mảng `BranchDTO`.
5. **Next Steps**: Load vào Dropdown.
6. **Critical Warnings for FE**: Chỉ Admin dùng API này, FE khách hàng có thể gọi API ở nhánh khác nếu public.

#### `GET /api/v1/admin/branches/{id}`
1. **Business Purpose**: Chi tiết 1 chi nhánh.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `id` trên URL.
4. **Expected Response**: `BranchDTO`.
5. **Next Steps**: Hiển thị form edit.
6. **Critical Warnings for FE**: Kiểm tra kỹ 404 Not Found.

#### `PUT /api/v1/admin/branches/{id}`
1. **Business Purpose**: Cập nhật thông tin chi nhánh.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `UpdateBranchDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Reload list.
6. **Critical Warnings for FE**: Không làm thay đổi ID nhánh.

### 3. AdminEmployeesController
#### `PUT /api/v1/admin/employees/{id}/transfer`
1. **Business Purpose**: Chuyển nhân sự từ chi nhánh này sang chi nhánh khác.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `TransferEmployeeDTO` (`NewBranchId`).
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Cập nhật UI.
6. **Critical Warnings for FE**: Cần check cẩn thận để không gán sai BranchId.

### 4. AdminLanesController
#### `GET /api/v1/admin/lanes`
1. **Business Purpose**: Lấy danh sách các Làn (Có thể filter theo Branch).
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `?branchId=` (Optional).
4. **Expected Response**: Array of Lane.
5. **Next Steps**: Render UI.
6. **Critical Warnings for FE**: Các làn có tính trạng thái (đang hoạt động/bảo trì).

#### `GET /api/v1/admin/lanes/{id}`
1. **Business Purpose**: Xem chi tiết 1 làn.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Path param `id`.
4. **Expected Response**: Detail.
5. **Next Steps**: Bật form update.
6. **Critical Warnings for FE**: Data trả về có reference tới Branch.

#### `PUT /api/v1/admin/lanes/{id}`
1. **Business Purpose**: Sửa đổi thông tin/trạng thái làn.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `UpdateLaneDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Refetch danh sách.
6. **Critical Warnings for FE**: Thận trọng không đổi nhánh nếu đang có người dùng.

### 5. AdminServicesController
#### `GET /api/v1/admin/services`
1. **Business Purpose**: Lấy toàn bộ dịch vụ để quản lý.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Optional `?branchId=`.
4. **Expected Response**: Danh sách dịch vụ.
5. **Next Steps**: Show bảng quản trị.
6. **Critical Warnings for FE**: Có thể trả về cả các service đang inactive.

#### `PUT /api/v1/admin/services/{id}`
1. **Business Purpose**: Cập nhật nội dung dịch vụ.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `CreateOrUpdateServiceDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Refresh UI.
6. **Critical Warnings for FE**: Dữ liệu cập nhật sẽ ảnh hưởng tới các booking tương lai, không đổi booking quá khứ.

#### `DELETE /api/v1/admin/services/{id}`
1. **Business Purpose**: Xóa mềm dịch vụ (Toggle Status).
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: URL id.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Hiển thị trạng thái "Ngừng HĐ".
6. **Critical Warnings for FE**: Không xóa hard-delete để tránh lỗi DB (Soft Delete pattern).

### 6. AdminUserController
#### `GET /api/v1/admin/users`
1. **Business Purpose**: Lấy danh sách Khách hàng phân trang.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Params `page`, `pageSize`, `keyword`, `status`.
4. **Expected Response**: Paged data.
5. **Next Steps**: Render DataGrid.
6. **Critical Warnings for FE**: Chú ý filter param.

#### `GET /api/v1/admin/users/{id}`
1. **Business Purpose**: Lấy chi tiết user (lịch sử rửa, xe, ví).
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Param `id`.
4. **Expected Response**: User Detail Profile.
5. **Next Steps**: Show profile.
6. **Critical Warnings for FE**: Thông tin nhạy cảm.

#### `PUT /api/v1/admin/users/{id}/status`
1. **Business Purpose**: Khóa / Mở khóa tài khoản khách hàng.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `UpdateUserStatusDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Reload User List.
6. **Critical Warnings for FE**: User bị khóa sẽ không login/đặt xe được nữa.

### 7. AdminVehicleController
#### `GET /api/v1/admin/vehicles/other-types`
1. **Business Purpose**: Lấy danh sách các xe đăng ký loại "Khác" chờ admin duyệt.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Không.
4. **Expected Response**: List Pending Vehicles.
5. **Next Steps**: Hiển thị bảng chờ duyệt.
6. **Critical Warnings for FE**: Dữ liệu nằm trong UserNote.

#### `PUT /api/v1/admin/vehicles/{licensePlate}/type`
1. **Business Purpose**: Update cứng type ID cho 1 biển số xe.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `UpdateVehicleTypeAdminDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Refresh UI.
6. **Critical Warnings for FE**: Encode URL param nếu biển số có ký tự lạ.

#### `POST /api/v1/admin/vehicles/{licensePlate}/approve-new-type`
1. **Business Purpose**: Duyệt yêu cầu "Loại xe khác" -> Tạo Type mới trong DB -> Gắn Type vào xe.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `ApproveVehicleTypeRequestDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Xóa xe khỏi list chờ duyệt.
6. **Critical Warnings for FE**: Hành động tạo danh mục mới, yêu cầu nhập chính xác.

#### `POST /api/v1/admin/vehicles/{licensePlate}/reject-new-type`
1. **Business Purpose**: Từ chối xe tự do, xóa xe đó khỏi hệ thống.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Path param `licensePlate`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Remove row trên UI.
6. **Critical Warnings for FE**: Xe sẽ bị xoá mềm (IsDeleted = true) bắt khách tạo lại.

### 8. AdminVehicleTypeController
#### `POST /api/v1/admin/vehicle-types`
1. **Business Purpose**: Tạo phân loại xe mới (4 chỗ, 7 chỗ, SUV, ...).
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `CreateVehicleTypeDTO`.
4. **Expected Response**: `201 Created`.
5. **Next Steps**: Service và Price mapping mới.
6. **Critical Warnings for FE**: Khi tạo type mới cần setup giá cho các dịch vụ theo type đó.

#### `PUT /api/v1/admin/vehicle-types/{id}`
1. **Business Purpose**: Cập nhật type xe.
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: `CreateVehicleTypeDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Cập nhật dropdown.
6. **Critical Warnings for FE**: Có thể ảnh hưởng base weight đặt chỗ.

#### `DELETE /api/v1/admin/vehicle-types/{id}`
1. **Business Purpose**: Xóa Type (Soft delete).
2. **Prerequisites**: Quyền Admin.
3. **Request Payload**: Param `id`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Xóa khỏi list UI.
6. **Critical Warnings for FE**: Sẽ không cho xoá cứng nếu đang có xe thuộc type này.

#### `GET /api/v1/admin/vehicle-types`
1. **Business Purpose**: Danh sách category xe.
2. **Prerequisites**: Cho phép Anonymous (để public app dùng).
3. **Request Payload**: None.
4. **Expected Response**: Array of Type.
5. **Next Steps**: Map vào Dropdown Add Xe.
6. **Critical Warnings for FE**: FE filter cẩn thận nếu cần.

### 9. AdminVouchersController
#### `GET /api/v1/admin/vouchers`
1. **Business Purpose**: Get danh sách voucher toàn hệ thống.
2. **Prerequisites**: Admin.
3. **Request Payload**: Không.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Hiển thị bảng điều khiển.
6. **Critical Warnings for FE**: Có voucher vật lý và voucher discount.

#### `POST /api/v1/admin/vouchers`
1. **Business Purpose**: Tạo mới mã Voucher hoặc Happy Hour.
2. **Prerequisites**: Admin.
3. **Request Payload**: `CreateOrUpdateVoucherDTO`.
4. **Expected Response**: `201 Created`.
5. **Next Steps**: Thông báo Campaign.
6. **Critical Warnings for FE**: Happy Hour là một loại DiscountVoucher kèm theo TimeRange.

#### `PUT /api/v1/admin/vouchers/{id}`
1. **Business Purpose**: Sửa Voucher.
2. **Prerequisites**: Admin.
3. **Request Payload**: `CreateOrUpdateVoucherDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: List UI cập nhật.
6. **Critical Warnings for FE**: Chú ý ValidTime.

#### `DELETE /api/v1/admin/vouchers/{id}`
1. **Business Purpose**: Xóa / Ngưng Voucher.
2. **Prerequisites**: Admin.
3. **Request Payload**: Param `id`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Vouchers không còn khả dụng cho user.
6. **Critical Warnings for FE**: API này thực tế có thể là đổi cờ trạng thái inactive.

### 10. AuthController
#### `POST /api/v1/auth/register`
1. **Business Purpose**: Đăng ký khách hàng mới.
2. **Prerequisites**: None.
3. **Request Payload**: `RegisterDTO` (Phone, Pass, Name, v.v.).
4. **Expected Response**: `201 Created` và Token, Wallet được tự động tạo.
5. **Next Steps**: Login tự động.
6. **Critical Warnings for FE**: Bắt validate format Phone/Email chặt.

#### `POST /api/v1/auth/login`
1. **Business Purpose**: Xác thực đăng nhập.
2. **Prerequisites**: Account hợp lệ.
3. **Request Payload**: `LoginDTO` (Phone/Email, Password).
4. **Expected Response**: JWT Token.
5. **Next Steps**: Lưu token ở Storage, đính kèm vào Header các Request sau.
6. **Critical Warnings for FE**: Cả internal staff và khách hàng đều xài chung route này, phân quyền bằng Claim trong JWT.

#### `POST /api/v1/auth/refresh-token`
1. **Business Purpose**: Làm mới JWT hết hạn.
2. **Prerequisites**: Refresh Token cũ.
3. **Request Payload**: `RefreshTokenDTO`.
4. **Expected Response**: Cặp Token mới.
5. **Next Steps**: Replace Token storage.
6. **Critical Warnings for FE**: Implement HTTP Interceptor bắt mã lỗi 401 để tự gọi API này.

#### `POST /api/v1/auth/change-password`
1. **Business Purpose**: User tự đổi password.
2. **Prerequisites**: Bắt buộc đăng nhập.
3. **Request Payload**: `ChangePasswordDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Sign out bắt login lại (Tuỳ FE policy).
6. **Critical Warnings for FE**: Phải gửi token.

### 11. BookingsController (Các API khác)
#### `GET /api/v1/bookings/me`
1. **Business Purpose**: Lấy lịch sử Booking của User.
2. **Prerequisites**: Quyền Customer.
3. **Request Payload**: Không.
4. **Expected Response**: List Booking history.
5. **Next Steps**: Render UI History.
6. **Critical Warnings for FE**: Dùng UserID từ claim ngầm.

#### `GET /api/v1/bookings/{id}`
1. **Business Purpose**: Chi tiết một Booking của khách.
2. **Prerequisites**: Booking phải thuộc về Khách (Check ownership).
3. **Request Payload**: `id`.
4. **Expected Response**: Booking detail kèm xe, giá.
5. **Next Steps**: Render Tracking/Bill.
6. **Critical Warnings for FE**: Không xem được của người khác.

### 12. CarModelsController
#### `GET /api/v1/carmodels` (Route Base)
1. **Business Purpose**: Lấy danh sách Dòng xe (Vios, Camry, C200...).
2. **Prerequisites**: Anonymous.
3. **Request Payload**: Không.
4. **Expected Response**: Array CarModels.
5. **Next Steps**: Dropdown cho User khi Add Xe.
6. **Critical Warnings for FE**: Có tuỳ chọn Text "Khác" nhập tay.

#### `POST /api/v1/carmodels`
1. **Business Purpose**: Thêm dòng xe mới.
2. **Prerequisites**: Admin.
3. **Request Payload**: `CreateCarModelDTO`.
4. **Expected Response**: `201`.
5. **Next Steps**: Load UI.
6. **Critical Warnings for FE**: Tạo Data Map cho Vehicle.

#### `PUT /api/v1/carmodels/{id}` & `DELETE`
1. **Business Purpose**: Sửa/Xóa mềm dòng xe.
2. **Prerequisites**: Admin.
3. **Request Payload**: Params & Body.
4. **Expected Response**: `200`.
5. **Next Steps**: Update UI.
6. **Critical Warnings for FE**: Soft delete để không hỏng dữ liệu xe cũ.

### 13. ServicesController
#### `GET /api/v1/services`
1. **Business Purpose**: Lấy dịch vụ (Public cho khách hàng).
2. **Prerequisites**: Anonymous.
3. **Request Payload**: `?branchId=`.
4. **Expected Response**: List Dịch vụ Active.
5. **Next Steps**: Render Menu Booking.
6. **Critical Warnings for FE**: Khác với AdminServices, cái này chỉ lọc Active.

#### `GET /api/v1/services/{id}`
1. **Business Purpose**: Detail dịch vụ.
2. **Prerequisites**: Anonymous.
3. **Request Payload**: `id`.
4. **Expected Response**: Detail.
5. **Next Steps**: Show Popup Info.
6. **Critical Warnings for FE**: Kèm bảng giá theo từng loại xe.

### 14. StaffBookingsController (Admin/Staff view tổng)
#### `GET /api/v1/admin/bookings`
1. **Business Purpose**: Lấy Booking ngày đó (Quản lý/Admin).
2. **Prerequisites**: Admin/Staff.
3. **Request Payload**: `?targetDate=`.
4. **Expected Response**: List.
5. **Next Steps**: Render Dashboard biểu đồ.
6. **Critical Warnings for FE**: Format ISO.

#### `PUT /api/v1/admin/bookings/status-by-license-plate`
1. **Business Purpose**: Quét biển số Checkin. (Đã document ở Luồng chính mục 2).

#### `GET /api/v1/admin/bookings/by-license-plate/{licensePlate}`
1. **Business Purpose**: Tìm xe hiện tại ở trạm bằng biển số.
2. **Prerequisites**: Staff/Admin.
3. **Request Payload**: `licensePlate`.
4. **Expected Response**: Booking object.
5. **Next Steps**: Show Detail Checkin.
6. **Critical Warnings for FE**: Normalize license plate on BE.

#### `PUT /api/v1/admin/bookings/{detailId}/report-mismatch`
1. **Business Purpose**: Báo cáo xe thực tế lớn hơn xe khách đăng ký.
2. **Prerequisites**: Staff/Admin.
3. **Request Payload**: `detailId`, Query `condition`, Query `actualTypeId`.
4. **Expected Response**: `200`.
5. **Next Steps**: Charge thêm tiền.
6. **Critical Warnings for FE**: Thu phí ngay lúc đó hoặc update bill.

#### `POST /api/v1/admin/bookings/force-cancel`
1. **Business Purpose**: Hủy diện rộng các booking do sự cố bão lũ/mất điện.
2. **Prerequisites**: Admin/Manager.
3. **Request Payload**: `ForceCancelRequestDTO`.
4. **Expected Response**: `200 OK`.
5. **Next Steps**: Hoàn tiền và báo mail hàng loạt.
6. **Critical Warnings for FE**: Hành động nhạy cảm, cần Dialog Confirm gắt gao.

### 15. StaffVouchersController
#### `POST /api/v1/staff/vouchers/consume`
1. **Business Purpose**: Đổi quà tặng hiện vật cho khách bằng VoucherCode.
2. **Prerequisites**: Staff/Manager/Admin.
3. **Request Payload**: `ConsumeVoucherRequestDTO` (Mã voucher, UserId khách).
4. **Expected Response**: `200`.
5. **Next Steps**: Đánh dấu IsUsed = true. Giao quà cho khách.
6. **Critical Warnings for FE**: Staff quét mã QR của user để fetch payload.

### 16. TierController
#### `GET /api/v1/tiers`
1. **Business Purpose**: Xem cấu trúc Hạng (Bạc, Vàng, Kim Cương).
2. **Prerequisites**: Public.
3. **Request Payload**: Không.
4. **Expected Response**: Array Tier config.
5. **Next Steps**: Render UI chính sách thành viên.
6. **Critical Warnings for FE**: Dùng MinAccumulatedPoints để tính rank.

#### `POST /api/v1/tiers` & `PUT /api/v1/tiers/{id}`
1. **Business Purpose**: Thêm sửa chính sách Hạng.
2. **Prerequisites**: Admin.
3. **Request Payload**: `CreateTierDTO` / `UpdateTierDTO`.
4. **Expected Response**: `201` / `200`.
5. **Next Steps**: Cập nhật logic điểm.
6. **Critical Warnings for FE**: Hạng thay đổi sẽ ảnh hưởng quyền lợi người dùng (cẩn thận khi chỉnh sửa).

### 17. TimeSlotsController (Phần còn lại)
#### `GET /api/v1/admin/time-slots`
1. **Business Purpose**: Lấy khung giờ gốc của chi nhánh.
2. **Prerequisites**: Admin/Staff.
3. **Request Payload**: `?branchId=`.
4. **Expected Response**: List TimeSlots tĩnh.
5. **Next Steps**: Show grid quản lý.
6. **Critical Warnings for FE**: Đây là khung giờ MASTER, không phải Available Slots có tính động (sức chứa realtime).

#### `PUT` & `DELETE /api/v1/admin/time-slots/{id}`
1. **Business Purpose**: Sửa khung giờ, ngưng khung giờ.
2. **Prerequisites**: Admin.
3. **Request Payload**: `UpdateTimeSlotDTO` hoặc Path params.
4. **Expected Response**: `200`.
5. **Next Steps**: Cập nhật Config.
6. **Critical Warnings for FE**: Tránh xóa khung giờ đang có người hẹn.

### 18. TransactionController
#### `GET /api/v1/transactions`
1. **Business Purpose**: Lịch sử nạp/trừ tiền Ví.
2. **Prerequisites**: Customer logged in.
3. **Request Payload**: Không.
4. **Expected Response**: Array of Transactions.
5. **Next Steps**: Render màn hình Lịch sử Ví.
6. **Critical Warnings for FE**: Fetch qua User ID token.

#### `GET /api/v1/points/history`
1. **Business Purpose**: Lịch sử tích/tiêu điểm CRM.
2. **Prerequisites**: Customer logged in.
3. **Request Payload**: Không.
4. **Expected Response**: Array of Point Histories.
5. **Next Steps**: UI Lịch sử Loyalty.
6. **Critical Warnings for FE**: Điểm hoạt động theo logic FIFO hết hạn.

### 19. UserController
#### `GET /api/v1/users/me`
1. **Business Purpose**: Lấy Profile Customer.
2. **Prerequisites**: Customer auth.
3. **Request Payload**: Không.
4. **Expected Response**: DTO Profile, Tier, Point, Wallet Balance.
5. **Next Steps**: Load trang My Profile.
6. **Critical Warnings for FE**: DateOfBirth trả về Date thuần không UTC offset.

#### `PUT /api/v1/users/me`
1. **Business Purpose**: Cập nhật cá nhân.
2. **Prerequisites**: Customer auth.
3. **Request Payload**: `UpdateUserProfileDTO`.
4. **Expected Response**: `200`.
5. **Next Steps**: Reload Profile.
6. **Critical Warnings for FE**: DateOfBirth chỉ được update 1 lần để chống Spam sinh nhật.

### 20. VehicleController
#### `GET /api/v1/vehicles`
1. **Business Purpose**: Lấy danh sách Garage Xe của tôi.
2. **Prerequisites**: Customer Auth.
3. **Request Payload**: Không.
4. **Expected Response**: List Vehicles (không gồm xoá mềm).
5. **Next Steps**: Show List My Cars.
6. **Critical Warnings for FE**: Backend tự chặn soft-delete.

#### `POST /api/v1/vehicles` & `PUT` & `DELETE`
1. **Business Purpose**: CRUD xe cá nhân.
2. **Prerequisites**: Customer Auth.
3. **Request Payload**: `CreateVehicleDTO` `UpdateVehicleDTO` dạng FromForm.
4. **Expected Response**: `201` / `200`.
5. **Next Steps**: Manage garage.
6. **Critical Warnings for FE**: Form data cần map CarModelId, CarModel (Nullable hybrid input).

#### `GET /api/v1/vehicles/recognize/{licensePlate}`
1. **Business Purpose**: Nhận diện xe có trong hệ thống qua Biển số (Staff gõ vào).
2. **Prerequisites**: Admin/Staff.
3. **Request Payload**: URL `licensePlate`.
4. **Expected Response**: Data Xe.
5. **Next Steps**: Hiển thị checkin popup.
6. **Critical Warnings for FE**: Normalize biển số trước search.

### 21. VehicleDetectionController
#### `POST /api/v1/detect-plate` & `detect-dual-plate`
1. **Business Purpose**: Tích hợp AI OCR đọc biển số từ Ảnh Upload/Camera (Hardware box / Mobile App).
2. **Prerequisites**: Token có quyền, RequestSize limit (10MB-20MB).
3. **Request Payload**: Multipart `IFormFile` image.
4. **Expected Response**: Plate Text (vd "29A12345"), Confidence score.
5. **Next Steps**: Fill tự động vào input box Biển số xe.
6. **Critical Warnings for FE**: Truyền theo định dạng FormData, gọi Camera API từ thiết bị để bắt luồng ảnh.

### 22. VoucherController (Cho Customer)
#### `GET /api/v1/vouchers/me`
1. **Business Purpose**: Lấy danh sách Voucher của Khách hàng đó.
2. **Prerequisites**: Customer auth.
3. **Request Payload**: Không.
4. **Expected Response**: List Vouchers.
5. **Next Steps**: Render Kho Voucher.
6. **Critical Warnings for FE**: API trả về tất cả voucher kể cả chưa đủ điều kiện (Tier). FE tự disable UI mờ đi.

#### `POST /api/v1/vouchers/redeem`
1. **Business Purpose**: Khách bỏ Loyalty Points ra để mua/đổi lấy 1 Voucher.
2. **Prerequisites**: Customer Auth.
3. **Request Payload**: `RedeemVoucherRequestDTO`.
4. **Expected Response**: `200`. Trừ Point.
5. **Next Steps**: Update UI.
6. **Critical Warnings for FE**: Giao dịch trừ điểm, cộng mã voucher vào kho.

### 23. WalletController
#### `GET /api/v1/wallets/me`
1. **Business Purpose**: Lấy số dư ví (Balance).
2. **Prerequisites**: Customer.
3. **Request Payload**: None.
4. **Expected Response**: Data ví.
5. **Next Steps**: Hiện số dư.
6. **Critical Warnings for FE**: Gọi API này liên tục lúc chờ Nạp tiền Webhook.

#### `POST /api/v1/wallets/top-up` & `top-up/callback`
(Đã giải thích ở phần Cơ chế Thanh toán). Callback là webhook do PayOS gọi.
