#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <Preferences.h>
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
constexpr uint8_t ENTRY_REGULAR_SERVO_PIN = 19;
constexpr uint8_t ENTRY_VIP_SERVO_PIN = 25;
constexpr uint8_t EXIT_SERVO_PIN = 23;
constexpr uint8_t ENTRY_REGULAR_SENSOR_PIN = 26;
constexpr uint8_t ENTRY_VIP_SENSOR_PIN = 32;
constexpr uint8_t EXIT_SENSOR_PIN = 27;

constexpr int CLOSED_ANGLE = 0;
constexpr int OPEN_ANGLE = 90;
constexpr int SERVO_MIN_US = 500;
constexpr int SERVO_MAX_US = 2400;

// Most IR/proximity modules pull the signal LOW when a vehicle is present.
constexpr uint8_t SENSOR_ACTIVE_LEVEL = LOW;
// Detect a vehicle quickly, but require a longer stable clear signal so noisy
// proximity sensors do not flicker between occupied/empty on the dashboard.
constexpr unsigned long ENTRY_SENSOR_ACTIVE_DEBOUNCE_MS = 120;
constexpr unsigned long ENTRY_SENSOR_CLEAR_DEBOUNCE_MS = 650;
// GPIO 27 can emit brief pulses on some IR/proximity modules. Latch those
// pulses quickly and keep the occupied state long enough for the UI poll.
constexpr unsigned long EXIT_SENSOR_ACTIVE_DEBOUNCE_MS = 15;
constexpr unsigned long EXIT_SENSOR_CLEAR_DEBOUNCE_MS = 1200;
// Keep PWM active while a barrier is open so the servo holds the arm in place.
// After closing, release the servo to reduce heat and electrical noise.
constexpr unsigned long SERVO_SIGNAL_HOLD_MS = 800;
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
unsigned long lastServoMoveStartedAt = 0;

enum class GateState { Closed, OpenWaitingForVehicle, OpenVehiclePassing };

class BarrierGate {
 public:
  BarrierGate(const char* id, uint8_t servoPin, uint8_t sensorPin,
              const char* preferenceKey, unsigned long activeDebounceMs,
              unsigned long clearDebounceMs)
      : id_(id),
        servoPin_(servoPin),
        sensorPin_(sensorPin),
        preferenceKey_(preferenceKey),
        activeDebounceMs_(activeDebounceMs),
        clearDebounceMs_(clearDebounceMs) {}

  void begin() {
    pinMode(sensorPin_, INPUT_PULLUP);
    rawSensorBlocked_ = readRawSensor();
    sensorBlocked_ = rawSensorBlocked_;
    sensorChangedAt_ = millis();
    state_ = GateState::Closed;
    moveServo(Config::CLOSED_ANGLE);
    lastCommandId_ = preferences.getString(preferenceKey_, "");
    servo_.setPeriodHertz(50);
    servo_.attach(servoPin_, Config::SERVO_MIN_US, Config::SERVO_MAX_US);
  }

  bool update() {
    const bool previousSensorBlocked = sensorBlocked_;
    const GateState previousState = state_;
    updateSensor();
    releaseServoSignalWhenSettled();
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

    moveServo(Config::OPEN_ANGLE);
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
    moveServo(Config::CLOSED_ANGLE);
    state_ = GateState::Closed;
    vehicleSeen_ = false;
    clearSince_ = 0;
    return true;
  }

  const char* id() const { return id_; }
  bool sensorBlocked() const { return sensorBlocked_; }
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
    const unsigned long requiredStableMs =
        rawSensorBlocked_ ? activeDebounceMs_ : clearDebounceMs_;
    if (rawSensorBlocked_ != sensorBlocked_ &&
        now - sensorChangedAt_ >= requiredStableMs) {
      sensorBlocked_ = rawSensorBlocked_;
    }
  }

  void moveServo(int angle) {
    const unsigned long elapsed = millis() - lastServoMoveStartedAt;
    if (lastServoMoveStartedAt != 0 &&
        elapsed < Config::SERVO_START_INTERVAL_MS) {
      delay(Config::SERVO_START_INTERVAL_MS - elapsed);
    }
    if (!servo_.attached()) {
      servo_.setPeriodHertz(50);
      servo_.attach(servoPin_, Config::SERVO_MIN_US, Config::SERVO_MAX_US);
    }
    servo_.write(angle);
    lastServoMoveStartedAt = millis();
    lastServoCommandAt_ = lastServoMoveStartedAt;
  }

  void releaseServoSignalWhenSettled() {
    // if (state_ == GateState::Closed && servo_.attached() &&
    //     millis() - lastServoCommandAt_ >= Config::SERVO_SIGNAL_HOLD_MS) {
    //   servo_.detach();
    //   pinMode(servoPin_, OUTPUT);
    //   digitalWrite(servoPin_, LOW);
    // }
  }

  const char* id_;
  uint8_t servoPin_;
  uint8_t sensorPin_;
  const char* preferenceKey_;
  unsigned long activeDebounceMs_;
  unsigned long clearDebounceMs_;
  Servo servo_;
  GateState state_ = GateState::Closed;
  bool rawSensorBlocked_ = false;
  bool sensorBlocked_ = false;
  bool vehicleSeen_ = false;
  unsigned long sensorChangedAt_ = 0;
  unsigned long lastServoCommandAt_ = 0;
  unsigned long openedAt_ = 0;
  unsigned long clearSince_ = 0;
  String lastCommandId_;
};

BarrierGate entryRegularGate(
    "entryRegular", Config::ENTRY_REGULAR_SERVO_PIN,
    Config::ENTRY_REGULAR_SENSOR_PIN, "entryRegularCmd",
    Config::ENTRY_SENSOR_ACTIVE_DEBOUNCE_MS,
    Config::ENTRY_SENSOR_CLEAR_DEBOUNCE_MS);
BarrierGate entryVipGate(
    "entryVip", Config::ENTRY_VIP_SERVO_PIN, Config::ENTRY_VIP_SENSOR_PIN,
    "entryVipCmd",
    Config::ENTRY_SENSOR_ACTIVE_DEBOUNCE_MS,
    Config::ENTRY_SENSOR_CLEAR_DEBOUNCE_MS);
BarrierGate exitGate(
    "exit", Config::EXIT_SERVO_PIN, Config::EXIT_SENSOR_PIN, "exitCmd",
    Config::EXIT_SENSOR_ACTIVE_DEBOUNCE_MS,
    Config::EXIT_SENSOR_CLEAR_DEBOUNCE_MS);
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
  target["sensorBlocked"] = gate.sensorBlocked();
  target["lastCommandId"] = gate.lastCommandId();
}

void sendStatus(int statusCode = 200, bool duplicate = false) {
  StaticJsonDocument<1536> response;
  response["ok"] = true;
  response["duplicate"] = duplicate;
  response["device"] = Config::HOSTNAME;
  response["wifiConnected"] = WiFi.status() == WL_CONNECTED;
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
  if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
    gate.open(commandId, duplicate);
    xSemaphoreGive(gateStateMutex);
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

    if (gate == nullptr) {
      details = "Unsupported barrierId: " + String(command.barrierId);
    } else if (strcmp(command.action, "OPEN") == 0) {
      if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
        completed = gate->open(String(command.commandId), duplicate);
        xSemaphoreGive(gateStateMutex);
      }
      details = duplicate ? "Duplicate command already applied."
                          : "Barrier opened.";
    } else if (strcmp(command.action, "CLOSE") == 0) {
      if (xSemaphoreTake(gateStateMutex, portMAX_DELAY) == pdTRUE) {
        completed = gate->close(false);
        xSemaphoreGive(gateStateMutex);
      }
      details = completed ? "Barrier closed."
                          : "Sensor blocked; close refused.";
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
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
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
