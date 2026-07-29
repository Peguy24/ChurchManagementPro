import { useLocation } from "react-router-dom";
import { Building2, ChevronDown, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadNavSnapshot } from "@/lib/navSnapshot";

/**
 * Layout-preserving skeleton shown while auth/role/tenant identity resolves.
 *
 * It reproduces the exact markup and spacing of `Layout` (header height,
 * container padding, 14rem sidebar, nav row metrics) and replays the last
 * nav/branding snapshot from this browser session, including the active
 * menu item, so swapping to the real shell causes zero layout shift.
 */
export default function AppShellSkeleton() {
  const location = useLocation();
  const snapshot = loadNavSnapshot();
  const groups = snapshot?.groups ?? [];
  const openGroups = snapshot?.openGroups ?? [];
  const hasBranding = Boolean(snapshot?.brandingName);

  const Placeholder = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );

  const IconSlot = () => <div className="h-4 w-4 flex-shrink-0 rounded-sm bg-current opacity-30" />;

  return (
    <div className="min-h-screen bg-background" aria-busy="true">
      {/* Header — mirrors Layout header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          {/* Mobile menu button slot (same footprint as the ghost icon button) */}
          <div className="md:hidden mr-2 h-10 w-10 flex items-center justify-center">
            <Placeholder className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {hasBranding && snapshot?.brandingLogo ? (
              <img
                src={snapshot.brandingLogo}
                alt=""
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                width={48}
                height={48}
              />
            ) : hasBranding ? (
              <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
              </div>
            ) : (
              <Placeholder className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg" />
            )}
            <div className="hidden sm:block">
              {hasBranding ? (
                <>
                  <h1 className="text-lg font-bold text-foreground leading-tight">
                    {snapshot?.brandingName}
                  </h1>
                  {snapshot?.brandingSubtitle ? (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {snapshot.brandingSubtitle}
                    </p>
                  ) : null}
                </>
              ) : (
                <Placeholder className="h-5 w-40" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Placeholder className="h-9 w-9 rounded-md" />
            <Placeholder className="h-9 w-9 rounded-md" />
            <div className="hidden sm:flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground opacity-40" />
              <Placeholder className="hidden lg:block h-4 w-[150px]" />
            </div>
            <div className="h-10 w-10 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-muted-foreground opacity-40" />
            </div>
          </div>
        </div>
      </header>

      <div className="container flex px-4 sm:px-8">
        {/* Desktop sidebar — identical geometry to Layout's aside */}
        <aside className="hidden w-56 border-r py-4 pr-2 md:block flex-shrink-0">
          {groups.length > 0 ? (
            <nav className="space-y-0.5">
              {groups.map((group) => {
                const hasActiveItem = group.items.some((item) => location.pathname === item.to);
                const isOpen = openGroups.includes(group.key) || hasActiveItem;
                return (
                  <div key={group.key}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                        hasActiveItem ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <IconSlot />
                      {group.label}
                      <ChevronDown
                        className={cn("ml-auto h-4 w-4 opacity-50", isOpen && "rotate-180")}
                      />
                    </div>
                    {isOpen && (
                      <div className="ml-3 space-y-0.5 border-l pl-3">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.to;
                          return (
                            <div
                              key={item.to}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              <IconSlot />
                              {item.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          ) : (
            <div className="space-y-2">
              <div className="h-8 rounded-md bg-muted" />
              <div className="h-8 rounded-md bg-muted" />
              <div className="h-8 rounded-md bg-muted" />
            </div>
          )}
        </aside>

        {/* Main content — identical padding to Layout's main */}
        <main className="flex-1 py-4 sm:py-6 md:pl-6 min-w-0 overflow-x-hidden">
          <div className="space-y-4">
            <Placeholder className="h-8 w-1/3" />
            <Placeholder className="h-4 w-2/3" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Placeholder key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
            <Placeholder className="h-64 w-full rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
