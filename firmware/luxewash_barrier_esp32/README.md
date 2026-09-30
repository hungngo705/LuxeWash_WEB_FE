# LuxeWash ESP32 Barrier Controller

## Phần cứng

Ba servo được điều khiển qua PCA9685, không nối tín hiệu PWM trực tiếp vào
ESP32.

| Cổng | Sensor ESP32 | Servo PCA9685 |
|---|---:|---:|
| Cổng vào làn thường | GPIO 26 | Channel 0 |
| Cổng vào làn VIP | GPIO 25 | Channel 1 |
| Cổng ra | GPIO 27 | Channel 2 |

| ESP32 | PCA9685 |
|---|---|
| GPIO 21 | SDA |
| GPIO 22 | SCL |
| 3V3 | VCC |
| GND | GND |

- Địa chỉ I2C mặc định của PCA9685 là `0x40`, tần số servo là `50 Hz`.
- Chân `V+` của PCA9685 dùng nguồn servo 5V riêng; không nối `V+` vào 3V3.
- Âm nguồn servo, GND PCA9685 và GND ESP32 phải nối chung.
- Nên mắc tụ 1000-2200 uF giữa `V+` và GND gần PCA9685, đúng cực.
- Đường cấp nguồn servo phải đủ tiết diện và nguồn phải chịu được tổng dòng
  khởi động/stall của ba servo.
- Ba sensor được cấp 3V3, dùng chung GND và xuất mức LOW khi phát hiện xe.

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
2. Cài các thư viện `ArduinoJson`, `Adafruit PWM Servo Driver Library` và
   dependency `Adafruit BusIO`.
3. Tạo `secrets.h` từ `secrets.example.h`, sau đó điền Wi-Fi, backend HTTPS, device ID và device key.
4. Chọn board ESP32, đúng cổng COM và Upload.
5. Serial Monitor dùng tốc độ `115200 baud`.
6. Cấu hình dashboard dùng IP hiển thị trên Serial Monitor hoặc `http://luxewash-barrier.local`.

Nếu sensor xuất HIGH khi có xe, đổi `SENSOR_ACTIVE_LEVEL` từ `LOW` thành `HIGH`.
Hiệu chỉnh từng tay barie bằng các cặp hằng số `*_CLOSED_US` và `*_OPEN_US`.
Tăng/giảm pulse từng bước nhỏ và tránh ép servo vào giới hạn cơ khí.

## Cơ chế an toàn

- Mỗi `commandId` chỉ được thực thi một lần, kể cả sau khi ESP32 restart.
- Ba cổng hoạt động và đọc sensor độc lập.
- Lệnh khởi động servo được giãn tối thiểu 350ms để giảm dòng khởi động đồng thời.
- PCA9685 giữ PWM để tay barie không tự tụt ở cả trạng thái mở và đóng.
- Nếu PCA9685 không được phát hiện khi khởi động, REST API trả 503 và lệnh từ backend được ACK thất bại thay vì báo mở thành công giả.
- Barie tự đóng sau khi xe đi qua và sensor trống liên tục 1,5 giây.
- Nếu không có xe đi qua, barie tự đóng sau 15 giây.
- ESP32 từ chối đóng nếu sensor vẫn phát hiện xe, trừ lệnh đóng cưỡng bức.
- ESP32 chủ động poll backend HTTPS để nhận lệnh và gửi ACK/heartbeat; frontend không gọi trực tiếp ESP32.
- Backend phải cấu hình `BarrierDevice__DeviceId`, `BarrierDevice__DeviceKey` và `BarrierDevice__BranchId` trùng với thiết bị.
- HTTPS chạy trong FreeRTOS task riêng; vòng đọc sensor/điều khiển servo không bị chặn bởi TLS hoặc độ trễ backend.
- Kết nối TLS được tái sử dụng giữa các request khi server hỗ trợ keep-alive.
- Ngoài heartbeat định kỳ 5 giây, thiết bị gửi heartbeat ngay khi sensor hoặc trạng thái barie thay đổi.
