/** ICS Trucker Android — public APK served from /downloads/ on the web host. */
export const TRUCKER_APP_DOWNLOAD = {
  version: '1.18.0',
  versionCode: 18,
  /** Stable URL — overwritten on each release build. */
  apkFileName: 'ics-trucker-latest.apk',
  downloadPath: '/downloads/ics-trucker-latest.apk',
  publicPagePath: '/download/trucker-app',
  minAndroid: '8.0 (Oreo)',
  packageId: 'com.ecms.trucker',
} as const

export function truckerAppApkUrl(origin = window.location.origin) {
  return `${origin}${TRUCKER_APP_DOWNLOAD.downloadPath}`
}
