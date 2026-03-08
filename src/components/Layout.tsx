import { ReactNode, useState, lazy, Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import PlatformAnnouncementBanner from "@/components/PlatformAnnouncementBanner";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import SuperAdminNotifications from "./SuperAdminNotifications";

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
        { to: "/branches", icon: Church, label: t("nav.branches") },
        { to: "/ministries", icon: Briefcase, label: t("nav.ministries") },
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
      ],
    },
    {
      key: "settings",
      label: t("layout.settings"),
      icon: Settings,
      items: [
        { to: "/settings/church", icon: Church, label: t("layout.churchInfo") },
        { to: "/custom-fields", icon: FileText, label: t("nav.customFields") },
        { to: "/system-guide", icon: FileText, label: t("layout.systemGuide") },
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
    branding: "White-Label",
    settings: "Platform Settings",
  },
  fr: {
    dashboard: "Tableau de bord",
    accounting: "Comptabilité",
    revenue: "Analyse des Revenus",
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
    churn: "Prévention Attrition",
    comparison: "Comparaison",
    branding: "White-Label",
    settings: "Configuration Plateforme",
  },
  ht: {
    dashboard: "Tablo Debò",
    accounting: "Kontabilite",
    revenue: "Analiz Revni",
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
    churn: "Prevansyon Atrisyon",
    comparison: "Konparezon",
    branding: "White-Label",
    settings: "Konfigirasyon Platfòm",
  },
};

// Navigation for super admins (platform-level)
const getSuperAdminNavGroups = (t: (key: string) => string, language: string): NavGroup[] => {
  const sl = (key: string) => superAdminNavLabels[language]?.[key] || superAdminNavLabels.en[key] || key;
  return [
    {
      key: "administration",
      label: t("layout.administration"),
      icon: ShieldAlert,
      items: [
        { to: "/super-admin", icon: LayoutDashboard, label: sl("dashboard") },
        { to: "/super-admin/accounting", icon: PiggyBank, label: sl("accounting") },
        { to: "/super-admin/revenue", icon: BarChart3, label: sl("revenue") },
        { to: "/super-admin/health", icon: Sparkles, label: sl("health") },
        { to: "/super-admin/explore", icon: FolderOpen, label: sl("explore") },
        { to: "/settings/tenants", icon: Building2, label: sl("churches") },
        { to: "/settings/invitations", icon: Mail, label: sl("invitations") },
        { to: "/settings/users", icon: Users, label: sl("users") },
        { to: "/support-management", icon: MessageSquare, label: sl("support") },
        { to: "/super-admin/communication", icon: Mail, label: sl("communication") },
        { to: "/super-admin/activity", icon: History, label: sl("activity") },
        { to: "/super-admin/banners", icon: Megaphone, label: sl("banners") },
        { to: "/super-admin/subscriptions", icon: CreditCard, label: sl("subscriptions") },
        { to: "/super-admin/churn", icon: ShieldAlertIcon, label: sl("churn") },
        { to: "/super-admin/comparison", icon: GitCompareArrows, label: sl("comparison") },
        
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
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { settings: whiteLabelSettings } = useWhiteLabel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if user is a super admin (admin without tenant)
  const isSuperAdmin = isAdmin && !tenantId && !tenantLoading;

  // Get appropriate navigation based on user type
  const allNavGroups = isSuperAdmin 
    ? getSuperAdminNavGroups(t, language) 
    : getChurchNavGroups(t, isTenantAdmin);
  
  // Filter nav groups and items based on user permissions (only for church users)
  const navGroups = isSuperAdmin 
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

  // Branding for super admin vs church users
  const brandingName = isSuperAdmin ? "Church Manager Pro" : whiteLabelSettings.app_name;
  const brandingSubtitle = isSuperAdmin ? "Administration Platform" : whiteLabelSettings.app_subtitle;
  const brandingLogo = isSuperAdmin ? "/images/church-management-pro-logo.png" : whiteLabelSettings.logo_url;

  return (
    <div className="min-h-screen bg-background">
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

          <Link to={isSuperAdmin ? "/super-admin" : "/"} className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            {brandingLogo ? (
              <img 
                src={brandingLogo} 
                alt="Logo" 
                className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
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
            {isSuperAdmin && <SuperAdminNotifications />}
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
          {!isSuperAdmin && <PlatformAnnouncementBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}
