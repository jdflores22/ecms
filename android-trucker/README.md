# ECMS Trucker — Android App

Native Android app for **Trucker** role users. Connects to the same ECMS REST API as the web frontend.

## Features

| Area | Capabilities |
|------|----------------|
| **Auth** | Login, sign up, forgot password, JWT refresh, logout |
| **Dashboard** | Trucker stats, quick actions, alert widgets |
| **Pre-forecast** | List, create, edit draft, submit, upload container photos |
| **Returns** | Assigned schedules, return detail with payment & QR status |
| **Payments** | Due list, upload proof (image/PDF) |
| **QR passes** | View QR codes, book LOGICTECK |
| **Withdrawals** | List, create ATW withdrawal, upload certificate, submit, gate pass |
| **Demurrage** | Outstanding billings, upload payment proof |
| **Reports** | Daily & monthly return reports |
| **Profile** | Update profile, change password |
| **Notifications** | In-app notification list |

## Requirements

- Android Studio Ladybug (2024.2+) or newer
- JDK 17
- Android SDK 35
- Running ECMS API (same backend as web app)

## After pulling fixes

1. **Build → Clean Project**, then **Build → Rebuild Project** in Android Studio.
2. **Uninstall** the old ECMS Trucker app from your phone/emulator.
3. Run the app again (installs v**1.0.4** / versionCode **5** — centered login, improved headers, native Android layout).
4. Sign in with `trucker1` / `Trucker@123`.

If login still fails, open **Logcat** in Android Studio, filter by `EcmsTruckerApp`, and check the crash stack trace.

## Setup

1. **Open project** in Android Studio: `android-trucker/`

2. **Configure API URL** — create `local.properties` (or edit existing):

```properties
sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
API_BASE_URL=https://your-ecms-domain.com/api
```

For **local development** with emulator + XAMPP on the same PC:

```properties
API_BASE_URL=http://10.0.2.2/ecms/backend/ECMS.API/api
```

For a **physical device** on the same LAN, use your PC's IP:

```properties
API_BASE_URL=http://192.168.1.100/ecms/backend/ECMS.API/api
```

3. **Sync Gradle** and run on device/emulator (min SDK 26).

## Demo account

```
Username: trucker1
Password: Trucker@123
```

## Architecture

- **Kotlin** + **Jetpack Compose** + **Material 3**
- **Retrofit** + **OkHttp** for REST API
- **DataStore** for secure token persistence
- **Navigation Compose** with bottom tabs + detail routes
- Automatic JWT refresh via `AuthInterceptor`

## Project structure

```
app/src/main/java/com/ecms/trucker/
├── data/
│   ├── api/          # Retrofit service, network module
│   ├── local/        # TokenStore (DataStore)
│   ├── model/        # API DTOs
│   └── repository/   # Auth + Trucker repositories
├── ui/
│   ├── components/   # Shared UI
│   ├── navigation/   # Routes & bottom nav
│   ├── screens/      # Feature screens
│   └── theme/        # Material theme
├── util/             # QR code generator
├── EcmsTruckerApp.kt
└── MainActivity.kt
```

## API endpoints used

All endpoints mirror the web trucker role (`frontend/src/services/api.ts`):

- `POST /auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout`
- `GET /dashboard/trucker`
- `GET/POST/PUT/DELETE /preforecast/*`
- `GET /schedules`, `/schedules/{id}`
- `GET/POST /payments/*`
- `GET/POST /qr/*`
- `GET/POST/PUT/DELETE /withdrawals/*`
- `GET/POST /demurrage-billing/*`
- `GET /reports/returns/daily`, `/reports/returns/monthly`
- `GET/PUT /profile`, `POST /profile/change-password`
- `GET /notifications`

## Building release APK

```bash
cd android-trucker
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release-unsigned.apk`

Sign with your keystore before distributing to truckers.

## Notes

- Cleartext HTTP is allowed for local dev (`network_security_config.xml`). Use HTTPS in production.
- File uploads (payment proof, ATW certificate, container photos) use the system file picker.
- QR codes are rendered locally with ZXing; download endpoint uses authenticated Bearer token.
