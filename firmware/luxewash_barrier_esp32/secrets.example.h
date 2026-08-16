#pragma once

// Copy this file to secrets.h, then replace the values below.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Must match BarrierDevice__DeviceId and BarrierDevice__DeviceKey on backend.
#define DEVICE_ID "luxewash-branch-1"
#define DEVICE_API_KEY "CHANGE_THIS_TO_A_LONG_RANDOM_KEY"

#define BACKEND_BASE_URL "https://smartwash-be.onrender.com"

// Set to 0 and provide the issuing root CA for certificate verification in production.
#define BACKEND_TLS_INSECURE 1
#define BACKEND_ROOT_CA ""

// Use * only on an isolated development LAN. A specific origin is safer.
#define ALLOWED_ORIGIN "http://localhost:5173"
