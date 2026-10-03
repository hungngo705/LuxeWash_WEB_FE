#include <Arduino.h>
#include <ArduinoJson.h>
#include <Adafruit_PWMServoDriver.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Wire.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <WiFi.h>

#include "secrets.h"

// Backward-compatible defaults let an existing secrets.h compile during rollout.
#ifndef DEVICE_ID
#define DEVICE_ID "luxewash-branch-1"
#endif
#ifndef BACKEND_BASE_URL
#define BACKEND_BASE_URL "https://smartwash-be.onrender.com"
#endif
#ifndef BACKEND_TLS_INSECURE
#define BACKEND_TLS_INSECURE 1
#endif
#ifndef BACKEND_ROOT_CA
#define BACKEND_ROOT_CA ""
#endif

namespace Config {
constexpr uint8_t PCA9685_ADDRESS = 0x40;
constexpr uint8_t PCA9685_SDA_PIN = 21;
constexpr uint8_t PCA9685_SCL_PIN = 22;
constexpr uint16_t PCA9685_PWM_FREQUENCY_HZ = 50;

constexpr uint8_t ENTRY_REGULAR_SERVO_CHANNEL = 0;
constexpr uint8_t ENTRY_VIP_SERVO_CHANNEL = 1;
constexpr uint8_t EXIT_SERVO_CHANNEL = 2;

constexpr uint8_t ENTRY_REGULAR_SENSOR_PIN = 26;
constexpr uint8_t ENTRY_VIP_SENSOR_PIN = 25;
constexpr uint8_t EXIT_SENSOR_PIN = 27;

// These defaults preserve the previous ESP32Servo behavior: 0 degrees was
// approximately 500 us and 90 degrees was approximately 1450 us. Calibrate
// each gate independently if its mechanical endpoints are different.
constexpr uint16_t ENTRY_REGULAR_CLOSED_US = 500;
constexpr uint16_t ENTRY_REGULAR_OPEN_US = 1450;
constexpr uint16_t ENTRY_VIP_CLOSED_US = 500;
constexpr uint16_t ENTRY_VIP_OPEN_US = 1450;
constexpr uint16_t EXIT_CLOSED_US = 500;
constexpr uint16_t EXIT_OPEN_US = 1450;

// Most IR/proximity modules pull the signal LOW when a vehicle is present.
constexpr uint8_t SENSOR_ACTIVE_LEVEL = LOW;
// The three proximity sensors can produce short, non-contiguous LOW pulses
// when they operate together. Accumulate two LOW samples inside a short window
// instead of requiring one uninterrupted LOW period. Once occupied, only a
// long continuous clear period can release the state.
constexpr uint8_t SENSOR_ACTIVE_HITS_REQUIRED = 2;
constexpr unsigned long SENSOR_ACTIVE_HIT_WINDOW_MS = 50;
constexpr unsigned long SENSOR_CLEAR_DEBOUNCE_MS = 2500;
// Avoid starting multiple servos at exactly the same time. This limits the
// current spike on the shared 5 V supply when two commands arrive together.
constexpr unsigned long SERVO_START_INTERVAL_MS = 350;
constexpr unsigned long MIN_OPEN_MS = 1200;
constexpr unsigned long CLEAR_BEFORE_CLOSE_MS = 1500;
constexpr unsigned long AUTO_CLOSE_NO_VEHICLE_MS = 15000;
constexpr unsigned long WIFI_RECONNECT_MS = 10000;
constexpr unsigned long COMMAND_POLL_MS = 750;
constexpr unsigned long HEARTBEAT_MS = 5000;
constexpr char HOSTNAME[] = "luxewash-barrier";
}  // namespace Config

WebServer server(80);
Preferences preferences;
Adafruit_PWMServoDriver servoDriver(Config::PCA9685_ADDRESS);
bool servoDriverReady = false;
unsigned long lastServoMoveStartedAt = 0;

uint16_t pulseUsToPcaTicks(uint16_t pulseUs) {
  const uint32_t numerator =
      static_cast<uint32_t>(pulseUs) * Config::PCA9685_PWM_FREQUENCY_HZ * 4096UL;
  const uint32_t roundedTicks = (numerator + 500000UL) / 1000000UL;
  return static_cast<uint16_t>(constrain(roundedTicks, 1UL, 4095UL));
}

bool initializeServoDriver() {
  Wire.begin(Config::PCA9685_SDA_PIN, Config::PCA9685_SCL_PIN);
  Wire.setClock(100000);
  if (!servoDriver.begin()) {
    Serial.println("PCA9685 not detected at I2C address 0x40.");
    return false;
  }
  servoDriver.setPWMFreq(Config::PCA9685_PWM_FREQUENCY_HZ);
  delay(10);
  Serial.println("PCA9685 servo driver ready at I2C address 0x40.");
  return true;
}

enum class GateState { Closed, OpenWaitingForVehicle, OpenVehiclePassing };

class BarrierGate {
 public:
  BarrierGate(const char* id, uint8_t servoChannel, uint8_t sensorPin,
              uint16_t closedPulseUs, uint16_t openPulseUs,
              const char* preferenceKey)
      : id_(id),
        servoChannel_(servoChannel),
        sensorPin_(sensorPin),
        closedPulseUs_(closedPulseUs),
        openPulseUs_(openPulseUs),
        preferenceKey_(preferenceKey) {}

  void begin() {
    pinMode(sensorPin_, INPUT_PULLUP);
    rawSensorBlocked_ = readRawSensor();
    sensorBlocked_ = rawSensorBlocked_;
    sensorChangedAt_ = millis();
    lastRawActiveAt_ = rawSensorBlocked_ ? sensorChangedAt_ : 0;
    state_ = GateState::Closed;
    lastCommandId_ = preferences.getString(preferenceKey_, "");
    if (!moveServo(closedPulseUs_)) {
      Serial.printf("Unable to initialize servo channel %u for %s.\n",
                    servoChannel_, id_);
    }
  }

  bool update() {
    const bool previousSensorBlocked = sensorBlocked_;
    const GateState previousState = state_;
    updateSensor();
    if (state_ != GateState::Closed) {
      const unsigned long now = millis();
      if (sensorBlocked_) {
        vehicleSeen_ = true;
        clearSince_ = 0;
        state_ = GateState::OpenVehiclePassing;
      } else if (vehicleSeen_) {
        if (clearSince_ == 0) clearSince_ = now;
        if (now - openedAt_ >= Config::MIN_OPEN_MS &&
            now - clearSince_ >= Config::CLEAR_BEFORE_CLOSE_MS) {
          close(false);
        }
      } else if (now - openedAt_ >= Config::AUTO_CLOSE_NO_VEHICLE_MS) {
        close(false);
      }
    }
    return previousSensorBlocked != sensorBlocked_ || previousState != state_;
  }

  bool open(const String& commandId, bool& duplicate) {
    duplicate = commandId.length() > 0 && commandId == lastCommandId_;
    if (duplicate) return true;

    if (!moveServo(openPulseUs_)) return false;
    state_ = GateState::OpenWaitingForVehicle;
    openedAt_ = millis();
    clearSince_ = 0;
    vehicleSeen_ = sensorBlocked_;
    if (vehicleSeen_) state_ = GateState::OpenVehiclePassing;

    if (commandId.length() > 0) {
      lastCommandId_ = commandId;
      preferences.putString(preferenceKey_, lastCommandId_);
    }
    return true;
  }

  bool close(bool force) {
    if (sensorBlocked_ && !force) return false;
    if (!moveServo(closedPulseUs_)) return false;
    state_ = GateState::Closed;
    vehicleSeen_ = false;
    clearSince_ = 0;
    return true;
  }

  const char* id() const { return id_; }
  uint8_t sensorPin() const { return sensorPin_; }
  bool rawSensorBlocked() const { return rawSensorBlocked_; }
  bool sensorBlocked() const { return sensorBlocked_; }
  unsigned long sensorStableForMs() const {
    return millis() - sensorChangedAt_;
  }
  uint8_t activeHitCount() const { return activeHitCount_; }
  bool isOpen() const { return state_ != GateState::Closed; }
  const String& lastCommandId() const { return lastCommandId_; }

  const char* stateName() const {
    switch (state_) {
      case GateState::OpenWaitingForVehicle:
        return "open_waiting_for_vehicle";
      case GateState::OpenVehiclePassing:
        return "open_vehicle_passing";
      default:
        return "closed";
    }
  }

 private:
  bool readRawSensor() const {
    return digitalRead(sensorPin_) == Config::SENSOR_ACTIVE_LEVEL;
  }

  void updateSensor() {
    const bool raw = readRawSensor();
    const unsigned long now = millis();
    if (raw != rawSensorBlocked_) {
      rawSensorBlocked_ = raw;
      sensorChangedAt_ = now;
    }

    if (raw) {
      lastRawActiveAt_ = now;
      if (sensorBlocked_) {
        activeHitCount_ = 0;
        activeWindowStartedAt_ = 0;
        return;
      }

      if (activeWindowStartedAt_ == 0 ||
          now - activeWindowStartedAt_ >
              Config::SENSOR_ACTIVE_HIT_WINDOW_MS) {
        activeWindowStartedAt_ = now;
        activeHitCount_ = 1;
      } else if (activeHitCount_ < Config::SENSOR_ACTIVE_HITS_REQUIRED) {
        activeHitCount_++;
      }

      if (activeHitCount_ >= Config::SENSOR_ACTIVE_HITS_REQUIRED) {
        sensorBlocked_ = true;
        activeHitCount_ = 0;
        activeWindowStartedAt_ = 0;
      }
      return;
    }

    if (!sensorBlocked_) {
      if (activeWindowStartedAt_ != 0 &&
          now - activeWindowStartedAt_ >
              Config::SENSOR_ACTIVE_HIT_WINDOW_MS) {
        activeHitCount_ = 0;
        activeWindowStartedAt_ = 0;
      }
      return;
    }

    if (now - lastRawActiveAt_ >= Config::SENSOR_CLEAR_DEBOUNCE_MS) {
      sensorBlocked_ = false;
      activeHitCount_ = 0;
      activeWindowStartedAt_ = 0;
    }
  }

  bool moveServo(uint16_t pulseUs) {
    if (!servoDriverReady) return false;
    const unsigned long elapsed = millis() - lastServoMoveStartedAt;
    if (lastServoMoveStartedAt != 0 &&
        elapsed < Config::SERVO_START_INTERVAL_MS) {
      delay(Config::SERVO_START_INTERVAL_MS - elapsed);
    }
    servoDriver.setPWM(servoChannel_, 0, pulseUsToPcaTicks(pulseUs));
    lastServoMoveStartedAt = millis();
    return true;
  }

  const char* id_;
  uint8_t servoChannel_;
  uint8_t sensorPin_;
  uint16_t closedPulseUs_;
  uint16_t openPulseUs_;
  const char* preferenceKey_;
  GateState state_ = GateState::Closed;
  bool rawSensorBlocked_ = false;
  bool sensorBlocked_ = false;
  bool vehicleSeen_ = false;
  unsigned long sensorChangedAt_ = 0;
  unsigned long lastRawActiveAt_ = 0;
  unsigned long activeWindowStartedAt_ = 0;
  uint8_t activeHitCount_ = 0;
  unsigned long openedAt_ = 0;
  unsigned long clearSince_ = 0;
  String lastCommandId_;
};

BarrierGate entryRegularGate(
    "entryRegular", Config::ENTRY_REGULAR_SERVO_CHANNEL,
    Config::ENTRY_REGULAR_SENSOR_PIN, Config::ENTRY_REGULAR_CLOSED_US,
    Config::ENTRY_REGULAR_OPEN_US, "entryRegularCmd");
BarrierGate entryVipGate(
    "entryVip", Config::ENTRY_VIP_SERVO_CHANNEL,
    Config::ENTRY_VIP_SENSOR_PIN, Config::ENTRY_VIP_CLOSED_US,
    Config::ENTRY_VIP_OPEN_US, "entryVipCmd");
BarrierGate exitGate(
    "exit", Config::EXIT_SERVO_CHANNEL, Config::EXIT_SENSOR_PIN,
    Config::EXIT_CLOSED_US, Config::EXIT_OPEN_US, "exitCmd");
unsigned long lastWifiReconnectAt = 0;

struct BackendCommandMessage {
  char commandId[64];
  char barrierId[32];
  char action[12];
};

struct BackendAckMessage {
  char commandId[64];
  char status[16];
  char details[128];
};

// Arduino's sketch preprocessor cannot reliably place generated prototypes
// for functions that use custom classes/structs. Declare them explicitly
// after the related types so the generated C++ remains valid.
void fillGateStatus(JsonObject target, const BarrierGate& gate);
void handleOpen(BarrierGate& gate);
void handleClose(BarrierGate& gate);
BarrierGate* gateFromBarrierId(const String& barrierId);
bool postCommandAck(WiFiClientSecure& client, const BackendAckMessage& ack);

QueueHandle_t backendCommandQueue = nullptr;
QueueHandle_t backendAckQueue = nullptr;
TaskHandle_t backendTaskHandle = nullptr;
SemaphoreHandle_t gateStateMutex = nullptr;

void requestImmediateHeartbeat() {
  if (backendTaskHandle != nullptr) xTaskNotifyGive(backendTaskHandle);
}

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type,X-Device-Key");
  server.sendHeader("Access-Control-Max-Age", "600");
}

void sendJson(int statusCode, const JsonDocument& document) {
  String body;
  serializeJson(document, body);
  addCorsHeaders();
  server.send(statusCode, "application/json", body);
}

void sendMessage(int statusCode, const char* message) {
  StaticJsonDocument<192> response;
  response["ok"] = statusCode >= 200 && statusCode < 300;
  response["message"] = message;
  sendJson(statusCode, response);
}

bool isAuthorized() {
  if (String(DEVICE_API_KEY).length() < 8) return false;
  return server.hasHeader("X-Device-Key") &&
         server.header("X-Device-Key") == DEVICE_API_KEY;
}

void fillGateStatus(JsonObject target, const BarrierGate& gate) {
  target["id"] = gate.id();
  target["state"] = gate.stateName();
  target["isOpen"] = gate.isOpen();
  target["sensorPin"] = gate.sensorPin();
  target["rawPinLevel"] = gate.rawSensorBlocked() ? LOW : HIGH;
  target["rawSensorBlocked"] = gate.rawSensorBlocked();
  target["sensorBlocked"] = gate.sensorBlocked();
  target["sensorStableForMs"] = gate.sensorStableForMs();
  target["activeHitCount"] = gate.activeHitCount();
  target["lastCommandId"] = gate.lastCommandId();
}

void sendStatus(int statusCode = 200, bool duplicate = false) {
  StaticJsonDocument<1536> response;
  response["ok"] = true;
  response["duplicate"] = duplicate;
  response["device"] = Config::HOSTNAME;
  response["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  response["servoDriverReady"] = servoDriverReady;
  response["ip"] = WiFi.localIP().toString();
  response["uptimeMs"] = millis();
  JsonObject gates = response.createNestedObject("gates");
  fillGateStatus(gates.createNestedObject("entryRegular"), entryRegularGate);
  fillGateStatus(gates.createNestedObject("entryVip"), entryVipGate);
  fillGateStatus(gates.createNestedObject("exit"), exitGate);
  sendJson(statusCode, response);
}

bool parseBody(StaticJsonDocument<384>& body) {
  if (!server.hasArg("plain") || server.arg("plain").isEmpty()) return true;
  const DeserializationError error = deserializeJson(body, server.arg("plain"));
  if (error) {
    sendMessage(400, "Invalid JSON body.");
    return false;
  }
  return true;
}

void handleOpen(BarrierGate& gate) {
  if (!isAuthorized()) {
    sendMessage(401, "Invalid device key.");
    return;
  }
  StaticJsonDocument<384> body;
  if (!parseBody(body)) return;
  const String commandId = body["commandId"] | "";
  if (commandId.isEmpty()) {
    sendMessage(400, "commandId is required.");
    return;
  }
  bool duplicate = false;
  bool opened = false;
  if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
    opened = gate.open(commandId, duplicate);
    xSemaphoreGive(gateStateMutex);
  }
  if (!opened) {
    sendMessage(503, "PCA9685 servo driver is unavailable.");
    return;
  }
  requestImmediateHeartbeat();
  sendStatus(duplicate ? 200 : 202, duplicate);
}

void handleClose(BarrierGate& gate) {
  if (!isAuthorized()) {
    sendMessage(401, "Invalid device key.");
    return;
  }
  StaticJsonDocument<384> body;
  if (!parseBody(body)) return;
  if (!servoDriverReady) {
    sendMessage(503, "PCA9685 servo driver is unavailable.");
    return;
  }
  const bool force = body["force"] | false;
  bool closed = false;
  if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
    closed = gate.close(force);
    xSemaphoreGive(gateStateMutex);
  }
  if (!closed) {
    sendMessage(409, "Sensor is blocked; refusing to close the barrier.");
    return;
  }
  requestImmediateHeartbeat();
  sendStatus();
}

void handleOptions() {
  addCorsHeaders();
  server.send(204, "text/plain", "");
}

void configureHttpServer() {
  const char* headerKeys[] = {"X-Device-Key", "Origin"};
  server.collectHeaders(headerKeys, 2);

  server.on("/health", HTTP_GET, []() { sendStatus(); });
  server.on("/api/status", HTTP_GET, []() {
    if (!isAuthorized()) {
      sendMessage(401, "Invalid device key.");
      return;
    }
    sendStatus();
  });
  server.on("/api/barriers/entry-regular/open", HTTP_POST,
            []() { handleOpen(entryRegularGate); });
  server.on("/api/barriers/entry-regular/close", HTTP_POST,
            []() { handleClose(entryRegularGate); });
  server.on("/api/barriers/entry-vip/open", HTTP_POST,
            []() { handleOpen(entryVipGate); });
  server.on("/api/barriers/entry-vip/close", HTTP_POST,
            []() { handleClose(entryVipGate); });
  // Legacy aliases keep older frontend builds mapped to the regular entry.
  server.on("/api/barriers/entry/open", HTTP_POST,
            []() { handleOpen(entryRegularGate); });
  server.on("/api/barriers/entry/close", HTTP_POST,
            []() { handleClose(entryRegularGate); });
  server.on("/api/barriers/exit/open", HTTP_POST, []() { handleOpen(exitGate); });
  server.on("/api/barriers/exit/close", HTTP_POST, []() { handleClose(exitGate); });

  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry-regular/open", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry-regular/close", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry-vip/open", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry-vip/close", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry/open", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/entry/close", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/exit/open", HTTP_OPTIONS, handleOptions);
  server.on("/api/barriers/exit/close", HTTP_OPTIONS, handleOptions);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      handleOptions();
      return;
    }
    sendMessage(404, "Route not found.");
  });
  server.begin();
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(Config::HOSTNAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("ESP32 ready at http://%s or http://%s.local\n",
                  WiFi.localIP().toString().c_str(), Config::HOSTNAME);
    if (!MDNS.begin(Config::HOSTNAME)) Serial.println("mDNS could not start.");
  } else {
    Serial.println("Wi-Fi unavailable. The ESP32 will keep retrying.");
  }
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  const unsigned long now = millis();
  if (now - lastWifiReconnectAt < Config::WIFI_RECONNECT_MS) return;
  lastWifiReconnectAt = now;
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void configureSecureClient(WiFiClientSecure& client) {
#if BACKEND_TLS_INSECURE
  // Development fallback. Configure a root CA in production when possible.
  client.setInsecure();
#else
  client.setCACert(BACKEND_ROOT_CA);
#endif
}

void addDeviceHeaders(HTTPClient& http) {
  http.addHeader("Accept", "application/json");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
}

BarrierGate* gateFromBarrierId(const String& barrierId) {
  if (barrierId == "ENTRY_REGULAR_GATE" || barrierId == "ENTRY_GATE") {
    return &entryRegularGate;
  }
  if (barrierId == "ENTRY_VIP_GATE") return &entryVipGate;
  if (barrierId == "EXIT_GATE") return &exitGate;
  return nullptr;
}

bool postCommandAck(WiFiClientSecure& client,
                    const BackendAckMessage& ack) {
  HTTPClient http;
  const String url = String(BACKEND_BASE_URL) +
                     "/api/v1/barrier/device/commands/" + ack.commandId +
                     "/ack";
  if (!http.begin(client, url)) return false;
  http.setReuse(true);
  http.setTimeout(5000);
  addDeviceHeaders(http);

  StaticJsonDocument<384> body;
  body["status"] = ack.status;
  body["details"] = ack.details;
  String payload;
  serializeJson(body, payload);
  const int statusCode = http.POST(payload);
  http.end();
  return statusCode >= 200 && statusCode < 300;
}

void pollBackendCommand(WiFiClientSecure& client) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  const String url =
      String(BACKEND_BASE_URL) + "/api/v1/barrier/device/commands/next";
  if (!http.begin(client, url)) return;
  http.setReuse(true);
  http.setTimeout(5000);
  addDeviceHeaders(http);
  const int statusCode = http.GET();
  if (statusCode == 204) {
    http.end();
    return;
  }
  if (statusCode != 200) {
    Serial.printf("Command poll failed: HTTP %d\n", statusCode);
    http.end();
    return;
  }

  const String payload = http.getString();
  http.end();
  StaticJsonDocument<768> command;
  if (deserializeJson(command, payload)) {
    Serial.println("Invalid command JSON from backend.");
    return;
  }

  const String commandId = command["commandId"] | "";
  const String barrierId = command["barrierId"] | "";
  String action = command["action"] | "OPEN";
  action.toUpperCase();
  if (commandId.isEmpty()) return;

  BackendCommandMessage queued{};
  strlcpy(queued.commandId, commandId.c_str(), sizeof(queued.commandId));
  strlcpy(queued.barrierId, barrierId.c_str(), sizeof(queued.barrierId));
  strlcpy(queued.action, action.c_str(), sizeof(queued.action));
  if (xQueueSend(backendCommandQueue, &queued, 0) != pdTRUE) {
    Serial.println("Backend command queue is full.");
  }
}

void sendBackendHeartbeat(WiFiClientSecure& client) {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<1536> body;
  body["ipAddress"] = WiFi.localIP().toString();
  body["wifiRssi"] = WiFi.RSSI();
  body["uptimeMs"] = millis();
  body["servoDriverReady"] = servoDriverReady;
  JsonObject gates = body.createNestedObject("gates");
  if (xSemaphoreTake(gateStateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
    fillGateStatus(gates.createNestedObject("entryRegular"), entryRegularGate);
    fillGateStatus(gates.createNestedObject("entryVip"), entryVipGate);
    fillGateStatus(gates.createNestedObject("exit"), exitGate);
    xSemaphoreGive(gateStateMutex);
  } else {
    return;
  }
  String payload;
  serializeJson(body, payload);

  HTTPClient http;
  const String url =
      String(BACKEND_BASE_URL) + "/api/v1/barrier/device/heartbeat";
  if (!http.begin(client, url)) return;
  http.setReuse(true);
  http.setTimeout(5000);
  addDeviceHeaders(http);
  const int statusCode = http.POST(payload);
  if (statusCode < 200 || statusCode >= 300) {
    Serial.printf("Heartbeat failed: HTTP %d\n", statusCode);
  }
  http.end();
}

void backendNetworkTask(void* parameter) {
  WiFiClientSecure client;
  configureSecureClient(client);
  unsigned long lastCommandPollAt = 0;
  unsigned long lastHeartbeatAt = 0;

  for (;;) {
    maintainWifi();
    if (WiFi.status() == WL_CONNECTED) {
      BackendAckMessage ack{};
      if (xQueueReceive(backendAckQueue, &ack, 0) == pdTRUE &&
          !postCommandAck(client, ack)) {
        Serial.printf("ACK failed for command %s\n", ack.commandId);
      }

      const unsigned long now = millis();
      if (now - lastCommandPollAt >= Config::COMMAND_POLL_MS) {
        pollBackendCommand(client);
        lastCommandPollAt = millis();
      }

      const bool immediateHeartbeat = ulTaskNotifyTake(pdTRUE, 0) > 0;
      if (immediateHeartbeat || now - lastHeartbeatAt >= Config::HEARTBEAT_MS) {
        lastHeartbeatAt = millis();
        sendBackendHeartbeat(client);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(25));
  }
}

void processBackendCommands() {
  BackendCommandMessage command{};
  while (xQueueReceive(backendCommandQueue, &command, 0) == pdTRUE) {
    BarrierGate* gate = gateFromBarrierId(String(command.barrierId));
    bool completed = false;
    bool duplicate = false;
    String details;

    if (!servoDriverReady) {
      details = "PCA9685 servo driver is unavailable.";
    } else if (gate == nullptr) {
      details = "Unsupported barrierId: " + String(command.barrierId);
    } else if (strcmp(command.action, "OPEN") == 0) {
      if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
        completed = gate->open(String(command.commandId), duplicate);
        xSemaphoreGive(gateStateMutex);
      }
      details = !completed ? "PCA9685 servo command failed."
                           : duplicate ? "Duplicate command already applied."
                                       : "Barrier opened.";
    } else if (strcmp(command.action, "CLOSE") == 0) {
      if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
        completed = gate->close(false);
        xSemaphoreGive(gateStateMutex);
      }
      details = completed ? "Barrier closed."
                          : "Sensor blocked or PCA9685 command failed.";
    } else {
      details = "Unsupported action: " + String(command.action);
    }

    BackendAckMessage ack{};
    strlcpy(ack.commandId, command.commandId, sizeof(ack.commandId));
    strlcpy(ack.status, completed ? "Completed" : "Failed",
            sizeof(ack.status));
    strlcpy(ack.details, details.c_str(), sizeof(ack.details));
    if (xQueueSend(backendAckQueue, &ack, 0) != pdTRUE) {
      Serial.println("Backend ACK queue is full.");
    }
    requestImmediateHeartbeat();
  }
}

void setup() {
  Serial.begin(115200);
  gateStateMutex = xSemaphoreCreateMutex();
  backendCommandQueue = xQueueCreate(8, sizeof(BackendCommandMessage));
  backendAckQueue = xQueueCreate(8, sizeof(BackendAckMessage));
  if (gateStateMutex == nullptr || backendCommandQueue == nullptr ||
      backendAckQueue == nullptr) {
    Serial.println("Unable to allocate backend synchronization primitives.");
    while (true) delay(1000);
  }
  servoDriverReady = initializeServoDriver();
  preferences.begin("luxewash", false);
  entryRegularGate.begin();
  entryVipGate.begin();
  exitGate.begin();
  connectWifi();
  configureHttpServer();
  const BaseType_t taskCreated = xTaskCreatePinnedToCore(
      backendNetworkTask, "barrier-backend", 12288, nullptr, 1,
      &backendTaskHandle, 0);
  if (taskCreated != pdPASS) {
    backendTaskHandle = nullptr;
    Serial.println("Unable to start backend network task.");
  } else {
    requestImmediateHeartbeat();
  }
}

void loop() {
  server.handleClient();
  processBackendCommands();
  bool stateChanged = false;
  if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
    stateChanged = entryRegularGate.update();
    stateChanged = entryVipGate.update() || stateChanged;
    stateChanged = exitGate.update() || stateChanged;
    xSemaphoreGive(gateStateMutex);
  }
  if (stateChanged) requestImmediateHeartbeat();
  delay(2);
}
