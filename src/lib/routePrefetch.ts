/**
 * Route chunk prefetching.
 *
 * React.lazy already caches a module after its first load, so the expensive part
 * of a menu click is the very first dynamic import. We warm those chunks ahead of
 * time (on hover/focus/touch, plus an idle pass over the most used pages) so the
 * page swaps instantly and the sidebar never has to wait on a network round trip.
 */

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/": () => import("@/pages/Home"),
  "/members": () => import("@/pages/Members"),
  "/members/requests": () => import("@/pages/MemberRequests"),
  "/members/cards": () => import("@/pages/MemberCards"),
  "/members/photo-booth": () => import("@/pages/PhotoBooth"),
  "/members/details": () => import("@/pages/MemberDetails"),
  "/attendance": () => import("@/pages/Attendance"),
  "/attendance/stats": () => import("@/pages/MemberAttendanceStats"),
  "/attendance/kiosk": () => import("@/pages/AttendanceKiosk"),
  "/attendance/alerts": () => import("@/pages/AttendanceAlerts"),
  "/attendance/arrivals": () => import("@/pages/AttendanceArrivalReport"),
  "/attendance/comparison": () => import("@/pages/GroupComparisonDashboard"),
  "/branches": () => import("@/pages/Branches"),
  "/ministries": () => import("@/pages/Ministries"),
  "/ministries/details": () => import("@/pages/MinistryDetails"),
  "/ministries/stats": () => import("@/pages/MinistriesStats"),
  "/visitors": () => import("@/pages/Visitors"),
  "/donations": () => import("@/pages/Donations"),
  "/donations/categories": () => import("@/pages/IncomeCategories"),
  "/donations/reports": () => import("@/pages/FinancialReports"),
  "/finance": () => import("@/pages/FinancialDashboard"),
  "/finance/budgets": () => import("@/pages/Budgets"),
  "/finance/expenses": () => import("@/pages/Expenses"),
  "/finance/expenses/categories": () => import("@/pages/ExpenseCategories"),
  "/finance/bank": () => import("@/pages/BankReconciliation"),
  "/finance/funds": () => import("@/pages/SpecialFunds"),
  "/finance/cash": () => import("@/pages/CashRegister"),
  "/finance/audit": () => import("@/pages/FinancialAudit"),
  "/finance/credits": () => import("@/pages/CreditAndLoans"),
  "/finance/salaries": () => import("@/pages/Salaries"),
  "/inventory": () => import("@/pages/Inventory"),
  "/events": () => import("@/pages/Events"),
  "/events/calendar": () => import("@/pages/EventCalendar"),
  "/events/registrations": () => import("@/pages/EventRegistrations"),
  "/volunteers": () => import("@/pages/VolunteerScheduling"),
  "/automations": () => import("@/pages/EngagementAutomations"),
  "/insights": () => import("@/pages/SmartInsights"),
  "/ai-assistant": () => import("@/pages/AiAssistant"),
  "/ai-assistant/denials": () => import("@/pages/AiDenialLogs"),
  "/custom-fields": () => import("@/pages/CustomFields"),
  "/website": () => import("@/pages/ChurchWebsite"),
  "/prayer-requests": () => import("@/pages/PrayerRequests"),
  "/system-guide": () => import("@/pages/SystemGuide"),
  "/support": () => import("@/pages/Support"),
  "/support-management": () => import("@/pages/SupportManagement"),
  "/settings/church": () => import("@/pages/ChurchSettings"),
  "/settings/email-templates": () => import("@/pages/EmailTemplates"),
  "/settings/users": () => import("@/pages/UserManagement"),
  "/settings/tenants": () => import("@/pages/TenantManagement"),
  "/settings/tenant-users": () => import("@/pages/TenantUserManagement"),
  "/settings/invitations": () => import("@/pages/AdminInvitations"),
  "/settings/branding": () => import("@/pages/TenantBranding"),
  "/settings/backup": () => import("@/pages/DataBackup"),
  "/settings/data-management": () => import("@/pages/DataManagement"),
  "/settings/subscription": () => import("@/pages/Subscription"),
  "/settings/referrals": () => import("@/pages/Referrals"),
  "/settings/online-giving": () => import("@/pages/OnlineGivingSettings"),
  "/super-admin": () => import("@/pages/SuperAdminDashboard"),
  "/super-admin/health": () => import("@/pages/ChurchHealthScores"),
  "/super-admin/activity": () => import("@/pages/PlatformActivityLog"),
  "/super-admin/explore": () => import("@/pages/TenantDataViewer"),
  "/super-admin/comparison": () => import("@/pages/TenantComparison"),
  "/super-admin/impersonation": () => import("@/pages/Impersonation"),
  "/super-admin/churn": () => import("@/pages/ChurnPrevention"),
  "/super-admin/revenue": () => import("@/pages/RevenueAnalytics"),
  "/super-admin/payments": () => import("@/pages/PaymentMonitoring"),
  "/super-admin/failed-payments": () => import("@/pages/FailedPayments"),
  "/super-admin/subscriptions": () => import("@/pages/SubscriptionOverrides"),
  "/super-admin/accounting": () => import("@/pages/PlatformAccounting"),
  "/super-admin/owners": () => import("@/pages/BusinessOwners"),
  "/super-admin/payroll": () => import("@/pages/PlatformPayroll"),
  "/super-admin/taxes": () => import("@/pages/PlatformTaxRecords"),
  "/super-admin/tax-exemptions": () => import("@/pages/TaxExemptionReviews"),
  "/super-admin/communication": () => import("@/pages/BulkCommunication"),
  "/super-admin/emails": () => import("@/pages/EmailDelivery"),
  "/super-admin/banners": () => import("@/pages/AnnouncementBanners"),
  "/super-admin/referrals": () => import("@/pages/SuperAdminReferrals"),
  "/super-admin/contact-messages": () => import("@/pages/ContactMessages"),
  "/super-admin/reviews": () => import("@/pages/ClientReviews"),
  "/super-admin/audit-log": () => import("@/pages/AuditLog"),
  "/super-admin/status": () => import("@/pages/StatusAdmin"),
  "/super-admin/changelog": () => import("@/pages/ChangelogAdmin"),
  "/super-admin/onboarding-funnel": () => import("@/pages/OnboardingFunnel"),
  "/super-admin/broadcasts": () => import("@/pages/BroadcastsAdmin"),
  "/super-admin/rewards": () => import("@/pages/RewardsAdmin"),
  "/super-admin/nps": () => import("@/pages/NpsAdmin"),
  "/super-admin/website-addons": () => import("@/pages/WebsiteAddonsAdmin"),
  "/super-admin/legal": () => import("@/pages/LegalDocuments"),
  "/super-admin/settings": () => import("@/pages/PlatformSettings"),
  "/super-admin/branding": () => import("@/pages/SuperAdminWhiteLabel"),
};

// Module cache: once a chunk has been requested we never request it again.
const started = new Map<string, Promise<unknown>>();

export function prefetchRoute(path: string): void {
  const loader = loaders[path];
  if (!loader || started.has(path)) return;
  started.set(
    path,
    loader().catch(() => {
      // A failed prefetch must not break navigation — allow a retry later.
      started.delete(path);
    })
  );
}

const onIdle = (cb: () => void) => {
  if (typeof window === "undefined") return;
  const ric = (window as unknown as { requestIdleCallback?: (c: () => void, o?: unknown) => number })
    .requestIdleCallback;
  if (ric) ric(cb, { timeout: 3000 });
  else window.setTimeout(cb, 1200);
};

/** Warm a list of routes one at a time while the browser is idle. */
export function prefetchRoutesWhenIdle(paths: string[]): void {
  const queue = paths.filter((p) => loaders[p] && !started.has(p));
  if (queue.length === 0) return;
  const step = () => {
    const next = queue.shift();
    if (!next) return;
    prefetchRoute(next);
    if (queue.length > 0) onIdle(step);
  };
  onIdle(step);
}

/** Props to spread on a nav <Link> so hovering/focusing warms its chunk. */
export function prefetchHandlers(path: string) {
  const trigger = () => prefetchRoute(path);
  return {
    onMouseEnter: trigger,
    onFocus: trigger,
    onTouchStart: trigger,
  };
}
