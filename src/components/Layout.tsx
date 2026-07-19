import { ReactNode, useState, useEffect, lazy, Suspense } from "react";

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
import { Link, useLocation } from "react-router-dom";
import PlatformAnnouncementBanner from "@/components/PlatformAnnouncementBanner";
import ImpersonationBanner from "@/components/ImpersonationBanner";

import { cn } from "@/lib/utils";
import {
  Users,
  Calendar,
  DollarSign,
  LayoutDashboard,
  UserCircle,
  LogOut,
  Church,
  ClipboardCheck,
  Bell,
  BarChart3,
  CreditCard,
  Briefcase,
  PieChart,
  Settings,
  Building2,
  PiggyBank,
  Wallet,
  History,
  FolderOpen,
  Mail,
  ChevronDown,
  FileText,
  Package,
  MessageSquare,
  ShieldAlert,
  Menu,
  X,
  Palette,
  UserCog,
  Sparkles,
  UserPlus,
  Megaphone,
  GitCompareArrows,
  ShieldAlert as ShieldAlertIcon,
  Zap,
  Monitor,
  Clock,
  Handshake,
  Archive,
  ShieldCheck,
  Star,
  Eye,
  Activity,
  Gift,
  Smile,
  Globe,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTenantRole } from "@/hooks/useTenantRole";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "./LanguageSelector";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import SuperAdminNotifications from "./SuperAdminNotifications";
import { BroadcastInbox } from "./BroadcastInbox";
import { AnnualUpgradePrompt } from "./AnnualUpgradePrompt";
import { NpsPrompt } from "./NpsPrompt";
import TenantNotifications from "./TenantNotifications";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  key: string; // Internal key for permissions
  label: string; // Translated display label
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Navigation for church/tenant users
const getChurchNavGroups = (t: (key: string) => string, isTenantAdmin: boolean): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      key: "members",
      label: t("layout.members"),
      icon: Users,
      items: [
        { to: "/members", icon: Users, label: t("nav.members") },
        { to: "/members/requests", icon: UserPlus, label: t("memberRequests.title") },
        { to: "/members/cards", icon: CreditCard, label: t("nav.memberCards") },
        { to: "/attendance", icon: ClipboardCheck, label: t("nav.attendance") },
        { to: "/attendance/kiosk", icon: Monitor, label: t("nav.kioskMode") },
        { to: "/attendance/alerts", icon: Bell, label: t("nav.attendanceAlerts") },
        { to: "/attendance/arrivals", icon: Clock, label: t("nav.arrivalReport") },
        { to: "/branches", icon: Church, label: t("nav.branches") },
        { to: "/ministries", icon: Briefcase, label: t("nav.ministries") },
        { to: "/visitors", icon: UserPlus, label: t("nav.visitors") },
      ],
    },
    {
      key: "finances",
      label: t("layout.finances"),
      icon: DollarSign,
      items: [
        { to: "/donations", icon: DollarSign, label: t("nav.donations") },
        { to: "/donations/categories", icon: FolderOpen, label: t("layout.incomeCategories") },
        { to: "/finance/expenses", icon: Briefcase, label: t("nav.expenses") },
        { to: "/finance/expenses/categories", icon: FolderOpen, label: t("layout.expenseCategories") },
        { to: "/finance/budgets", icon: BarChart3, label: t("nav.budgets") },
        { to: "/finance/bank", icon: Building2, label: t("nav.bankReconciliation") },
        { to: "/finance/funds", icon: PiggyBank, label: t("nav.specialFunds") },
        { to: "/finance/cash", icon: Wallet, label: t("nav.cashRegister") },
        { to: "/finance/salaries", icon: Users, label: t("layout.salaries") },
        { to: "/finance/audit", icon: History, label: t("nav.auditTrail") },
        { to: "/finance/credits", icon: Handshake, label: t("nav.creditAndLoans") },
      ],
    },
    {
      key: "reports",
      label: t("layout.reports"),
      icon: PieChart,
      items: [
        { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/finance", icon: LayoutDashboard, label: t("nav.financialDashboard") },
        { to: "/donations/reports", icon: PieChart, label: t("nav.financialReports") },
        { to: "/attendance/comparison", icon: BarChart3, label: t("nav.groupComparison") },
        { to: "/insights", icon: Sparkles, label: t("layout.smartInsights") },
      ],
    },
    {
      key: "communication",
      label: t("layout.communication"),
      icon: MessageSquare,
      items: [
        { to: "/settings/email-templates", icon: Mail, label: t("layout.emailTemplates") },
        { to: "/automations", icon: Zap, label: t("nav.automations") },
      ],
    },
    {
      key: "planning",
      label: t("layout.planning"),
      icon: Calendar,
      items: [
        { to: "/events", icon: Calendar, label: t("nav.events") },
        { to: "/events/calendar", icon: Calendar, label: t("nav.eventCalendar") },
        { to: "/volunteers", icon: Users, label: t("nav.volunteers") },
      ],
    },
    {
      key: "settings",
      label: t("layout.settings"),
      icon: Settings,
      items: [
      { to: "/settings/church", icon: Church, label: t("layout.churchInfo") },
        { to: "/custom-fields", icon: FileText, label: t("nav.customFields") },
        { to: "/settings/referrals", icon: Sparkles, label: t("layout.referrals") },
        { to: "/settings/backup", icon: FileText, label: t("layout.dataBackup") },
        { to: "/settings/data-management", icon: Archive, label: t("layout.dataManagement") },
        { to: "/system-guide", icon: FileText, label: t("layout.systemGuide") },
        { to: "/website", icon: Globe, label: "Church Website" },
        { to: "/prayer-requests", icon: Globe, label: "Prayer Requests" },
        { to: "/settings/online-giving", icon: Globe, label: "Online Giving" },
      ],
    },
    {
      key: "inventory",
      label: t("layout.inventory"),
      icon: Package,
      items: [
        { to: "/inventory", icon: Package, label: t("layout.inventoryManagement") },
      ],
    },
    {
      key: "support",
      label: t("layout.support"),
      icon: MessageSquare,
      items: [
        { to: "/support", icon: MessageSquare, label: t("layout.support") },
      ],
    },
  ];

  // Add tenant user management and branding for tenant admins
  if (isTenantAdmin) {
    const settingsGroup = groups.find(g => g.key === "settings");
    if (settingsGroup) {
      settingsGroup.items.push(
        {
          to: "/settings/tenant-users",
          icon: UserCog,
          label: t("layout.churchUsers"),
        },
        {
          to: "/settings/branding",
          icon: Palette,
          label: t("layout.customization"),
        }
      );
    }
  }

  return groups;
};

// Local translations for super admin nav to avoid nested key resolution issues
const superAdminNavLabels: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    accounting: "Accounting",
    revenue: "Revenue Analytics",
    payments: "Payment Monitoring",
    health: "Church Health",
    explore: "Explore Data",
    churches: "Church Management",
    invitations: "Admin Invitations",
    users: "User Management",
    support: "Support Management",
    communication: "Communication",
    activity: "Activity Log",
    banners: "Banners",
    subscriptions: "Subscription Overrides",
    churn: "Churn Prevention",
    comparison: "Comparison",
    legal: "Legal Documents",
    branding: "White-Label",
    settings: "Platform Settings",
    payroll: "Payroll",
    taxes: "Taxes",
    referrals: "Referrals",
    grpOverview: "Overview",
    grpChurches: "Churches & Users",
    grpFinance: "Finance & Billing",
    grpEngagement: "Engagement & Communication",
    grpPlatform: "Platform & Settings",
  },
  fr: {
    dashboard: "Tableau de bord",
    accounting: "Comptabilité",
    revenue: "Analyse des Revenus",
    payments: "Suivi des Paiements",
    health: "Santé des Églises",
    explore: "Explorer les Données",
    churches: "Gestion des Églises",
    invitations: "Invitations Admin",
    users: "Gestion des Utilisateurs",
    support: "Gestion du Support",
    communication: "Communication",
    activity: "Journal d'Activité",
    banners: "Bannières",
    subscriptions: "Abonnements",
    churn: "Prévention Désengagement",
    comparison: "Comparaison",
    legal: "Documents Juridiques",
    branding: "White-Label",
    settings: "Configuration Plateforme",
    payroll: "Paie",
    taxes: "Fiscalité",
    referrals: "Parrainages",
    grpOverview: "Vue d'ensemble",
    grpChurches: "Églises & Utilisateurs",
    grpFinance: "Finance & Facturation",
    grpEngagement: "Engagement & Communication",
    grpPlatform: "Plateforme & Paramètres",
  },
  ht: {
    dashboard: "Tablo Debò",
    accounting: "Kontabilite",
    revenue: "Analiz Revni",
    payments: "Swivi Pèman",
    health: "Sante Legliz",
    explore: "Eksplore Done",
    churches: "Jesyon Legliz",
    invitations: "Envitasyon Admin",
    users: "Jesyon Itilizatè",
    support: "Jesyon Sipò",
    communication: "Kominikasyon",
    activity: "Jounal Aktivite",
    banners: "Bannyè",
    subscriptions: "Abònman",
    churn: "Prevansyon Dezangajman",
    comparison: "Konparezon",
    legal: "Dokiman Legal",
    branding: "White-Label",
    settings: "Konfigirasyon Platfòm",
    payroll: "Pewòl",
    taxes: "Taks",
    referrals: "Referans",
    grpOverview: "Apèsi",
    grpChurches: "Legliz & Itilizatè",
    grpFinance: "Finans & Faktirasyon",
    grpEngagement: "Angajman & Kominikasyon",
    grpPlatform: "Platfòm & Paramèt",
  },
};

// Navigation for super admins (platform-level)
const getSuperAdminNavGroups = (t: (key: string) => string, language: string): NavGroup[] => {
  const sl = (key: string) => superAdminNavLabels[language]?.[key] || superAdminNavLabels.en[key] || key;
  return [
    {
      key: "sa-overview",
      label: sl("grpOverview"),
      icon: LayoutDashboard,
      items: [
        { to: "/super-admin", icon: LayoutDashboard, label: sl("dashboard") },
        { to: "/super-admin/health", icon: Sparkles, label: sl("health") },
        { to: "/super-admin/activity", icon: History, label: sl("activity") },
        { to: "/super-admin/explore", icon: FolderOpen, label: sl("explore") },
        { to: "/super-admin/comparison", icon: GitCompareArrows, label: sl("comparison") },
      ],
    },
    {
      key: "sa-churches",
      label: sl("grpChurches"),
      icon: Building2,
      items: [
        { to: "/settings/tenants", icon: Building2, label: sl("churches") },
        { to: "/settings/users", icon: Users, label: sl("users") },
        { to: "/settings/invitations", icon: Mail, label: sl("invitations") },
        { to: "/super-admin/impersonation", icon: Eye, label: "Impersonation" },
        { to: "/support-management", icon: MessageSquare, label: sl("support") },
        { to: "/super-admin/churn", icon: ShieldAlertIcon, label: sl("churn") },
      ],
    },

    {
      key: "sa-finance",
      label: sl("grpFinance"),
      icon: BarChart3,
      items: [
        { to: "/super-admin/revenue", icon: BarChart3, label: sl("revenue") },
        { to: "/super-admin/payments", icon: CreditCard, label: sl("payments") },
        { to: "/super-admin/failed-payments", icon: CreditCard, label: "Failed Payments" },
        { to: "/super-admin/subscriptions", icon: CreditCard, label: sl("subscriptions") },
        { to: "/super-admin/accounting", icon: PiggyBank, label: sl("accounting") },
        { to: "/super-admin/owners", icon: Users, label: language === "fr" ? "Propriétaires" : language === "ht" ? "Pwopriyetè" : "Owners" },
        { to: "/super-admin/payroll", icon: Users, label: sl("payroll") },
        { to: "/super-admin/taxes", icon: FileText, label: sl("taxes") },
        { to: "/super-admin/tax-exemptions", icon: ShieldCheck, label: "Tax Exemptions" },
      ],
    },
    {
      key: "sa-engagement",
      label: sl("grpEngagement"),
      icon: Megaphone,
      items: [
        { to: "/super-admin/communication", icon: Mail, label: sl("communication") },
        { to: "/super-admin/emails", icon: Mail, label: "Email Delivery" },
        { to: "/super-admin/banners", icon: Megaphone, label: sl("banners") },
        { to: "/super-admin/referrals", icon: Sparkles, label: sl("referrals") },
        { to: "/super-admin/contact-messages", icon: Mail, label: "Contact Messages" },
        { to: "/super-admin/reviews", icon: Star, label: "Client Reviews" },
      ],
    },
    {
      key: "sa-platform",
      label: sl("grpPlatform"),
      icon: Settings,
      items: [
        { to: "/super-admin/audit-log", icon: ShieldCheck, label: "Audit Log" },
        { to: "/super-admin/status", icon: Activity, label: "Status Page" },
        { to: "/super-admin/changelog", icon: Sparkles, label: "Changelog" },
        { to: "/super-admin/onboarding-funnel", icon: BarChart3, label: "Onboarding Funnel" },
        { to: "/super-admin/broadcasts", icon: Megaphone, label: "Broadcasts" },
        { to: "/super-admin/rewards", icon: Gift, label: "Rewards" },
        { to: "/super-admin/nps", icon: Smile, label: "NPS Feedback" },
        { to: "/super-admin/website-addons", icon: Globe, label: "Website Add-Ons" },
        { to: "/super-admin/legal", icon: FileText, label: sl("legal") },
        { to: "/super-admin/settings", icon: Settings, label: sl("settings") },
      ],
    },
  ];
};



export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { canSeeNav, canSeeItem, isAdmin } = useUserRole();
  const { isTenantAdmin } = useTenantRole();
  const { tenantId, tenant, loading: tenantLoading } = useCurrentTenant();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { settings: whiteLabelSettings } = useWhiteLabel();
  const { isGlobalFeatureEnabled } = usePlanLimits();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Apply tenant primary color to CSS custom properties
  // Use cached tenant color first (instant), then whiteLabel query result
  useEffect(() => {
    const hex = tenant?.primary_color || whiteLabelSettings.primary_color;
    if (!hex || hex === '#6366f1') {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--primary-light');
      document.documentElement.style.removeProperty('--primary-dark');
      document.documentElement.style.removeProperty('--ring');
      return;
    }
    const hsl = hexToHSL(hex);
    if (hsl) {
      document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      document.documentElement.style.setProperty('--primary-light', `${hsl.h} ${hsl.s}% ${Math.min(hsl.l + 30, 90)}%`);
      document.documentElement.style.setProperty('--primary-dark', `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 10, 10)}%`);
      document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
  }, [tenant?.primary_color, whiteLabelSettings.primary_color]);

  // Determine if user is a super admin (admin without tenant)
  const isSuperAdmin = isAdmin && !tenantId && !tenantLoading;
  
  // While tenant is loading for admin users, use route to predict which nav to show
  // This prevents the church menu from flashing before super admin menu appears
  const isSuperAdminRoute = location.pathname.startsWith("/super-admin") || 
    location.pathname === "/settings/tenants" || 
    location.pathname === "/settings/invitations" ||
    location.pathname === "/settings/users" ||
    location.pathname === "/support-management";
  const showAsSuperAdmin = isSuperAdmin || (isAdmin && tenantLoading && isSuperAdminRoute);

  // Get appropriate navigation based on user type
  const allNavGroups = showAsSuperAdmin 
    ? getSuperAdminNavGroups(t, language) 
    : getChurchNavGroups(t, isTenantAdmin);
  
  // Filter nav groups and items based on user permissions (only for church users)
  const navGroups = showAsSuperAdmin 
    ? allNavGroups 
    : allNavGroups
        .filter(group => canSeeNav(group.key))
        .map(group => ({
          ...group,
          items: group.items.filter(item => canSeeItem(item.to))
        }))
        .filter(group => group.items.length > 0);

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    // Open the group that contains the current route by default
    const currentGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.to)
    );
    return currentGroup ? [currentGroup.key] : [];
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => 
      prev.includes(key) 
        ? prev.filter(g => g !== key)
        : [...prev, key]
    );
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t("common.error"),
        description: t("layout.logoutError"),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t("nav.logout"),
        description: t("layout.logoutSuccess"),
      });
    }
  };

  // Navigation content - shared between desktop and mobile
  const NavigationContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-1">
      {navGroups.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups.includes(group.key);
        const hasActiveItem = group.items.some(item => location.pathname === item.to);
        const hasItems = group.items.length > 0;

        if (!hasItems) {
          return (
            <div
              key={group.key}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <GroupIcon className="h-5 w-5" />
              {group.label}
              <span className="ml-auto text-xs">({t("layout.comingSoon")})</span>
            </div>
          );
        }

        return (
          <Collapsible
            key={group.key}
            open={isOpen}
            onOpenChange={() => toggleGroup(group.key)}
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted",
                  hasActiveItem ? "text-primary" : "text-muted-foreground"
                )}
              >
                <GroupIcon className="h-5 w-5" />
                {group.label}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-1 border-l pl-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link 
                      key={item.to} 
                      to={item.to}
                      onClick={onItemClick}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );

  // Use cached tenant data first to avoid flash, fall back to whiteLabel query
  const brandingName = showAsSuperAdmin 
    ? "Church Management Pro" 
    : (tenant?.name || whiteLabelSettings.app_name);
  const brandingSubtitle = showAsSuperAdmin ? "Administration Platform" : whiteLabelSettings.app_subtitle;
  const brandingLogo = showAsSuperAdmin 
    ? "/images/church-management-pro-logo.webp" 
    : (tenant?.logo_url || whiteLabelSettings.logo_url);

  return (
    <div className="min-h-screen bg-background">
      <ImpersonationBanner />
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">

        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex items-center gap-3 p-4 border-b">
                {brandingLogo ? (
                  <img 
                    src={brandingLogo} 
                    alt="Logo" 
                    className="h-10 w-10 object-contain"
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-bold leading-tight">{brandingName}</h1>
                  <p className="text-xs text-muted-foreground leading-tight">{brandingSubtitle}</p>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                <NavigationContent onItemClick={() => setMobileMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link to={showAsSuperAdmin ? "/super-admin" : "/"} className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            {brandingLogo ? (
              <img 
                src={brandingLogo} 
                alt="Logo" 
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                width={48}
                height={48}
              />
            ) : (
              <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground leading-tight">{brandingName}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{brandingSubtitle}</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSelector />
            {showAsSuperAdmin && <SuperAdminNotifications />}
            {!showAsSuperAdmin && <TenantNotifications />}
            {!showAsSuperAdmin && <BroadcastInbox />}
            <div className="hidden sm:flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden lg:block max-w-[150px] truncate">
                {user?.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex px-4 sm:px-8">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 border-r py-6 md:block flex-shrink-0">
          <NavigationContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-4 sm:py-6 md:pl-6 min-w-0 overflow-x-hidden">
          {!showAsSuperAdmin && <PlatformAnnouncementBanner />}
          {children}
          {!showAsSuperAdmin && <AnnualUpgradePrompt />}
          {!showAsSuperAdmin && <NpsPrompt />}
        </main>
      </div>
    </div>
  );
}
