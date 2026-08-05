#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>

#include "secrets.h"

namespace Config {
constexpr uint8_t ENTRY_REGULAR_SERVO_PIN = 18;
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
  }

  void update() {
    updateSensor();
    releaseServoSignalWhenSettled();
    if (state_ == GateState::Closed) return;

    const unsigned long now = millis();
    if (sensorBlocked_) {
      vehicleSeen_ = true;
      clearSince_ = 0;
      state_ = GateState::OpenVehiclePassing;
      return;
    }

    if (vehicleSeen_) {
      if (clearSince_ == 0) clearSince_ = now;
      if (now - openedAt_ >= Config::MIN_OPEN_MS &&
          now - clearSince_ >= Config::CLEAR_BEFORE_CLOSE_MS) {
        close(false);
      }
      return;
    }

    if (now - openedAt_ >= Config::AUTO_CLOSE_NO_VEHICLE_MS) close(false);
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
    if (state_ == GateState::Closed && servo_.attached() &&
        millis() - lastServoCommandAt_ >= Config::SERVO_SIGNAL_HOLD_MS) {
      servo_.detach();
      pinMode(servoPin_, OUTPUT);
      digitalWrite(servoPin_, LOW);
    }
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
  gate.open(commandId, duplicate);
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
  if (!gate.close(force)) {
    sendMessage(409, "Sensor is blocked; refusing to close the barrier.");
    return;
  }
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

void setup() {
  Serial.begin(115200);
  preferences.begin("luxewash", false);
  entryRegularGate.begin();
  entryVipGate.begin();
  exitGate.begin();
  connectWifi();
  configureHttpServer();
}

void loop() {
  server.handleClient();
  entryRegularGate.update();
  entryVipGate.update();
  exitGate.update();
  maintainWifi();
  delay(2);
}
