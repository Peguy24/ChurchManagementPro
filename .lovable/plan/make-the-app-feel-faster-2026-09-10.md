# Make the app feel faster

The database cleanup fixed the backend. What's left is on the browser side: the app currently ships a very large first download and reloads data more often than it needs to. Here is what I found and what I'd change.

## What's slowing things down today

1. **The downloaded code is not compressed.** Compression was turned off earlier to work around a build crash. The cause of that crash (a bad build-tool version) has since been removed, so compression can be turned back on. This is the single biggest win — typically 50-65% smaller download.
2. **All three languages load on every visit.** The translation file is ~10,900 lines holding French, English and Creole together. Every visitor downloads all three even though they read one.
3. **Report/export libraries load too early.** The Excel and PDF libraries are pulled in by report and dialog screens even when the person never clicks Export.
4. **Data is re-fetched too eagerly.** Every query is treated as stale immediately and refetched whenever the window regains focus, so switching tabs triggers a wave of database calls.
5. **The sidebar/shell re-renders on every navigation.** The main layout (813 lines) and the language provider recompute on each render with no memoization, so clicking a menu item re-renders more than it should.

## What I'll change

**Build and download size**
- Re-enable minification and verify the build passes several times in a row; revert if it turns out to be unstable again.
- Split the vendor chunks a bit further so charts, PDF and Excel code never lands in the first download.

**Translations**
- Move each language into its own file and load only the active one, with a switch loading the new language on demand. The `t()` API stays exactly the same, so no page changes.

**Defer heavy features**
- Load the Excel and PDF libraries only at the moment an export or print button is pressed, in the report tabs, member import, salaries, backup and the PDF helper files.
- Load chart code only on screens that actually draw charts.

**Fewer redundant network calls**
- Set sensible query defaults: a 60-second freshness window, no refetch on window focus, one retry. Screens needing live data can opt out individually.

**Fewer re-renders**
- Memoize the language provider value and the `t` function.
- Memoize the sidebar navigation list and split the layout's static parts so route changes don't re-render the whole shell.

## Technical notes

- `vite.config.ts`: `minify: 'esbuild'`, keep `reportCompressedSize: false`, extend `manualChunks`.
- `src/contexts/LanguageContext.tsx`: split into `src/locales/{fr,en,ht}.ts`, dynamic import per language, keep a small synchronous fallback so first paint isn't blank; wrap the context value in `useMemo`.
- Convert static `import * as XLSX from "xlsx"` / `import jsPDF from "jspdf"` into `await import(...)` inside the export handlers across `src/components/reports/*`, `src/pages/{Salaries,DataBackup,AttendanceArrivalReport}.tsx`, `src/components/MemberImportDialog.tsx` and the `src/lib/*PDF.ts` helpers (these become async).
- `src/App.tsx`: `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } } })`.
- `src/components/Layout.tsx`: `useMemo` for nav items, `React.memo` for sidebar sections.

## Verification

Compare the built asset sizes before and after, confirm the dev and production builds pass, and click through the tenant menu plus one report export to confirm nothing regressed.

## Not included

No visual redesign and no change to business logic or permissions.
