import { Skeleton } from "@/components/ui/skeleton";
import { Church } from "lucide-react";

type CachedTenant = {
  name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
};

function readCachedTenant(): CachedTenant | null {
  try {
    const raw = sessionStorage.getItem("tenant_cache");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.tenant ?? null;
  } catch {
    return null;
  }
}

/**
 * Layout-preserving skeleton shown while auth/role/tenant identity resolves.
 * It mirrors the real Layout geometry (sticky header + 14rem sidebar) and,
 * when a same-session tenant cache exists, paints the tenant's own name/logo
 * so refreshing never flashes generic or platform branding.
 */
export default function AppShellSkeleton() {
  const tenant = readCachedTenant();
  const hasBranding = Boolean(tenant?.name);

  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {hasBranding && tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt=""
                className="h-9 w-9 rounded-md object-contain"
              />
            ) : hasBranding ? (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md"
                style={{ backgroundColor: tenant?.primary_color || undefined }}
              >
                <Church className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <Skeleton className="h-9 w-9 rounded-md" />
            )}
            {hasBranding ? (
              <span className="truncate text-base font-semibold">{tenant?.name}</span>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="hidden h-8 w-24 sm:block" />
          </div>
        </div>
      </header>

      <div className="container flex">
        <aside className="hidden w-56 flex-shrink-0 border-r py-4 pr-2 md:block">
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden py-4 sm:py-6 md:pl-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
