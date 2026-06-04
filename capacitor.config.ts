// Capacitor scaffold for wrapping LACZEK STREAM as a native Android/iOS app.
//
// Build steps (run locally, NOT in this preview sandbox):
//   1. npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/filesystem
//   2. npx cap init "LACZEK STREAM" com.laczek.stream
//   3. npm run build && npx cap add android && npx cap sync android
//   4. Open android/ in Android Studio, build the APK.
//
// The web app stays fully functional without Capacitor — native code paths
// are dynamically imported and only activate inside the wrapped shell.
const config = {
  appId: "com.laczek.stream",
  appName: "LACZEK STREAM",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
} as const;

export default config;