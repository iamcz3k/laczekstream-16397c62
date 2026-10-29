import type { CapacitorConfig } from "@capacitor/core";

// Run `npx cap add android` / `npx cap add ios` after exporting the repo.
// Then `npm run build && npx cap sync` to ship a native build.
const config: CapacitorConfig = {
  appId: "app.lovable.laczekstream",
  appName: "ŁĄCZEK STREAM",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
