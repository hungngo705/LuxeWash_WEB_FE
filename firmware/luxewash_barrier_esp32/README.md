# LuxeWash ESP32 Barrier Controller

## Phần cứng

| Cổng | Servo | Sensor |
|---|---:|---:|
| Cổng vào làn thường | GPIO 18 | GPIO 26 |
| Cổng vào làn VIP | GPIO 25 | GPIO 32 |
| Cổng ra | GPIO 23 | GPIO 27 |

- Servo dùng nguồn 5V riêng và nối chung GND với ESP32.
- Không cấp nguồn servo từ chân 3V3 của ESP32.
- Mỗi dây tín hiệu servo đi qua điện trở 220Ω.
- Mắc tụ lọc song song giữa 5V và GND, đúng cực; đặt gần servo hoặc điểm chia nguồn.
- Sensor đang được cấp 3V3 và xuất mức LOW khi phát hiện xe.

## REST API

| Cổng | Mở | Đóng |
|---|---|---|
| Làn thường | `POST /api/barriers/entry-regular/open` | `POST /api/barriers/entry-regular/close` |
| Làn VIP | `POST /api/barriers/entry-vip/open` | `POST /api/barriers/entry-vip/close` |
| Cổng ra | `POST /api/barriers/exit/open` | `POST /api/barriers/exit/close` |

`GET /health` trả trạng thái của `entryRegular`, `entryVip` và `exit`.
Các endpoint `/api/barriers/entry/...` cũ vẫn được giữ và trỏ vào làn thường.

## Nạp firmware

1. Cài board `esp32 by Espressif Systems`.
2. Cài thư viện `ESP32Servo` và `ArduinoJson`.
3. Tạo `secrets.h` từ `secrets.example.h`, sau đó điền Wi-Fi, backend HTTPS, device ID và device key.
4. Chọn board ESP32, đúng cổng COM và Upload.
5. Serial Monitor dùng tốc độ `115200 baud`.
6. Cấu hình dashboard dùng IP hiển thị trên Serial Monitor hoặc `http://luxewash-barrier.local`.

Nếu sensor xuất HIGH khi có xe, đổi `SENSOR_ACTIVE_LEVEL` từ `LOW` thành `HIGH`.
Có thể hiệu chỉnh tay barie bằng `CLOSED_ANGLE` và `OPEN_ANGLE`.

## Cơ chế an toàn

- Mỗi `commandId` chỉ được thực thi một lần, kể cả sau khi ESP32 restart.
- Ba cổng hoạt động và đọc sensor độc lập.
- Lệnh khởi động servo được giãn tối thiểu 350ms để giảm dòng khởi động đồng thời.
- Servo giữ PWM khi barie mở để tay barie không tự tụt; chỉ ngắt PWM sau khi đóng ổn định.
- Barie tự đóng sau khi xe đi qua và sensor trống liên tục 1,5 giây.
- Nếu không có xe đi qua, barie tự đóng sau 15 giây.
- ESP32 từ chối đóng nếu sensor vẫn phát hiện xe, trừ lệnh đóng cưỡng bức.
- ESP32 chủ động poll backend HTTPS để nhận lệnh và gửi ACK/heartbeat; frontend không gọi trực tiếp ESP32.
- Backend phải cấu hình `BarrierDevice__DeviceId`, `BarrierDevice__DeviceKey` và `BarrierDevice__BranchId` trùng với thiết bị.
- HTTPS chạy trong FreeRTOS task riêng; vòng đọc sensor/điều khiển servo không bị chặn bởi TLS hoặc độ trễ backend.
- Kết nối TLS được tái sử dụng giữa các request khi server hỗ trợ keep-alive.
- Ngoài heartbeat định kỳ 5 giây, thiết bị gửi heartbeat ngay khi sensor hoặc trạng thái barie thay đổi.
