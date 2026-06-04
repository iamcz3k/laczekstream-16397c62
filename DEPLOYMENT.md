# Deployment

LACZEK STREAM is built with TanStack Start. The Lovable cloud build deploys
everything (SSR + server functions) automatically. If you want to host it
yourself on another platform, here is what works and what does not.

## Static-only hosts (Cloudflare Pages, Netlify, Vercel, Render, GitHub Pages)

These hosts can serve the compiled web bundle, but they cannot run the
TanStack server functions used for analytics, the admin panel, and the
podcast feed proxy. The streaming UI itself (movies / TV / radio / CCTV /
podcasts search / featured banner) keeps working because it talks to the
browser-side Supabase client and public third-party APIs directly.

Steps (any host):

1. `npm install`
2. `npm run build`
3. Publish the `dist/` folder.
4. Configure SPA fallback to `index.html` (already done via
   `public/_redirects` and `netlify.toml`; Vercel/Cloudflare Pages auto-
   detect it; for GitHub Pages copy `dist/index.html` to `dist/404.html`).

Cloudflare Pages, Netlify and Vercel will all build from a connected GitHub
repo using the default settings. Render uses "Static Site" with build
command `npm run build` and publish directory `dist`.

## Full-stack hosts (recommended)

Use the built-in Lovable cloud deploy (the **Publish** button) or any host
with Cloudflare Workers support. Server functions and the admin panel only
work in this mode.

## Android APK (Capacitor)

A Capacitor config is included at `capacitor.config.ts`. To wrap the web
app as a native Android APK with direct-to-device downloads:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/filesystem
npm run build
npx cap add android
npx cap sync android
# open the android/ folder in Android Studio and build the APK
```

`src/lib/native-download.ts` automatically routes downloads to the device
Downloads folder when running inside the Capacitor shell, and falls back to
the existing web download mirrors on the browser.