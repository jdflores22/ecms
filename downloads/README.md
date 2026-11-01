# ICS Trucker APK (Hostinger static hosting)

Olive ICS (`android-trucker/local.properties` → `API_BASE_URL=http://201.18.216.37/api`).

Place the release APK here before building the frontend:

- `ics-trucker-latest.apk` — stable download URL for truckers (always overwrite on release)
- `ICS-Trucker-v{version}-release.apk` — versioned archive

The Android build script copies here automatically:

```powershell
cd android-trucker
.\scripts\build-release-apk.ps1
```

After `npm run build`, upload `frontend/dist/` to Hostinger. The APK is served at:

- `/downloads/ics-trucker-latest.apk`
- Download page: `/download/trucker-app`
