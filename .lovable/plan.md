## Goal

Make Church Management Pro installable on phones and desktops: admins and pastors add it to their home screen, tap an app icon, and it opens full-screen with no browser bar. No app store needed.

Offline mode is intentionally NOT included — the app depends on live data (members, attendance, finances), and offline caching risks showing stale records. It can be added later if you want an offline attendance kiosk.

## What gets added

1. **App manifest** (`public/manifest.webmanifest`)
   - Name: Church Management Pro, short name: ChurchPro
   - `display: standalone`, portrait-friendly
   - Theme color matched to the app's primary brand color, light background
   - Start URL: `/`

2. **App icons** (generated, placed in `public/`)
   - 192x192 and 512x512 PNG icons
   - A 512x512 maskable icon so Android doesn't crop the logo badly
   - 180x180 Apple touch icon for iPhone home screen

3. **Head tags** in `index.html`
   - `<link rel="manifest">`, `<meta name="theme-color">`, `apple-touch-icon`, and `apple-mobile-web-app-*` tags for iOS full-screen behavior

4. **Install helper (optional, included)**
   - A small dismissible "Install app" prompt shown to signed-in users on Android/Chrome via the browser install event
   - iPhone users get a short trilingual (EN/FR/HT) hint: Share → Add to Home Screen
   - Hidden inside the Lovable preview iframe and once already installed

## Technical notes

- Manifest-only approach: no service worker, no `vite-plugin-pwa`, no caching layer, so there is zero risk of stale HTML or white screens after a deploy.
- Icons generated from the existing Church Management Pro logo styling for brand consistency.
- Install prompt component lives in `src/components/InstallAppPrompt.tsx`, mounted once in the app layout, with copy added to `LanguageContext.tsx` (EN/FR/HT).

## After it ships

Installability only works on the published site (`churchmanagementpro.com`), not inside the editor preview. Users install via the browser: Android/Chrome shows an install button; on iPhone it's Share → Add to Home Screen.
