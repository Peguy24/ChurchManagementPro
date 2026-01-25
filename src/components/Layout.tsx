import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Navigation for church/tenant users
const getChurchNavGroups = (t: (key: string) => string, isTenantAdmin: boolean): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      label: "Membres",
      icon: Users,
      items: [
        { to: "/members", icon: Users, label: t("nav.members") },
        { to: "/members/cards", icon: CreditCard, label: t("nav.memberCards") },
        { to: "/attendance", icon: ClipboardCheck, label: t("nav.attendance") },
        { to: "/attendance/alerts", icon: Bell, label: t("nav.attendanceAlerts") },
        { to: "/branches", icon: Church, label: t("nav.branches") },
        { to: "/ministries", icon: Briefcase, label: t("nav.ministries") },
      ],
    },
    {
      label: "Finances",
      icon: DollarSign,
      items: [
        { to: "/donations", icon: DollarSign, label: t("nav.donations") },
        { to: "/donations/categories", icon: FolderOpen, label: "Catégories Recettes" },
        { to: "/finance/expenses", icon: Briefcase, label: t("nav.expenses") },
        { to: "/finance/expenses/categories", icon: FolderOpen, label: "Catégories Dépenses" },
        { to: "/finance/budgets", icon: BarChart3, label: t("nav.budgets") },
        { to: "/finance/bank", icon: Building2, label: t("nav.bankReconciliation") },
        { to: "/finance/funds", icon: PiggyBank, label: t("nav.specialFunds") },
        { to: "/finance/cash", icon: Wallet, label: t("nav.cashRegister") },
        { to: "/finance/salaries", icon: Users, label: "Salaires" },
        { to: "/finance/audit", icon: History, label: t("nav.auditTrail") },
      ],
    },
    {
      label: "Rapports",
      icon: PieChart,
      items: [
        { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/finance", icon: LayoutDashboard, label: t("nav.financialDashboard") },
        { to: "/donations/reports", icon: PieChart, label: t("nav.financialReports") },
        { to: "/attendance/comparison", icon: BarChart3, label: t("nav.groupComparison") },
      ],
    },
    {
      label: "Communication",
      icon: MessageSquare,
      items: [
        { to: "/settings/email-templates", icon: Mail, label: "Modèles d'emails" },
      ],
    },
    {
      label: "Planning",
      icon: Calendar,
      items: [
        { to: "/events", icon: Calendar, label: t("nav.events") },
      ],
    },
    {
      label: "Paramètres",
      icon: Settings,
      items: [
        { to: "/settings/church", icon: Church, label: "Infos Église" },
        { to: "/custom-fields", icon: FileText, label: t("nav.customFields") },
      ],
    },
    {
      label: "Inventaire",
      icon: Package,
      items: [
        { to: "/inventory", icon: Package, label: "Gestion Inventaire" },
      ],
    },
  ];

  // Add tenant user management and branding for tenant admins
  if (isTenantAdmin) {
    const settingsGroup = groups.find(g => g.label === "Paramètres");
    if (settingsGroup) {
      settingsGroup.items.push(
        {
          to: "/settings/tenant-users",
          icon: UserCog,
          label: "Utilisateurs Église",
        },
        {
          to: "/settings/branding",
          icon: Palette,
          label: "Personnalisation",
        }
      );
    }
  }

  return groups;
};

// Navigation for super admins (platform-level)
const getSuperAdminNavGroups = (): NavGroup[] => [
  {
    label: "Administration",
    icon: ShieldAlert,
    items: [
      { to: "/super-admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/super-admin/explore", icon: FolderOpen, label: "Explorer Données" },
      { to: "/settings/tenants", icon: Building2, label: "Gestion Églises" },
      { to: "/settings/invitations", icon: Mail, label: "Invitations Admin" },
      { to: "/settings/users", icon: Users, label: "Gestion Utilisateurs" },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { canSeeNav, canSeeItem, isAdmin } = useUserRole();
  const { isTenantAdmin } = useTenantRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { settings: whiteLabelSettings } = useWhiteLabel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if user is a super admin (admin without tenant)
  const isSuperAdmin = isAdmin && !tenantId && !tenantLoading;

  // Get appropriate navigation based on user type
  const allNavGroups = isSuperAdmin 
    ? getSuperAdminNavGroups() 
    : getChurchNavGroups(t, isTenantAdmin);
  
  // Filter nav groups and items based on user permissions (only for church users)
  const navGroups = isSuperAdmin 
    ? allNavGroups 
    : allNavGroups
        .filter(group => canSeeNav(group.label))
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
    return currentGroup ? [currentGroup.label] : [];
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Erreur',
        description: 'Problème de déconnexion',
        variant: 'destructive',
      });
    } else {
      toast({
        title: t("nav.logout"),
        description: 'Vous êtes déconnecté avec succès',
      });
    }
  };

  // Navigation content - shared between desktop and mobile
  const NavigationContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-1">
      {navGroups.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups.includes(group.label);
        const hasActiveItem = group.items.some(item => location.pathname === item.to);
        const hasItems = group.items.length > 0;

        if (!hasItems) {
          return (
            <div
              key={group.label}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <GroupIcon className="h-5 w-5" />
              {group.label}
              <span className="ml-auto text-xs">(Bientôt)</span>
            </div>
          );
        }

        return (
          <Collapsible
            key={group.label}
            open={isOpen}
            onOpenChange={() => toggleGroup(group.label)}
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
  const brandingLogo = isSuperAdmin ? null : whiteLabelSettings.logo_url;

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
        <main className="flex-1 py-4 sm:py-6 md:pl-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
