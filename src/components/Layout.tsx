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
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "./LanguageSelector";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

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

const getNavGroups = (t: (key: string) => string): NavGroup[] => [
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
    items: [],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const navGroups = getNavGroups(t);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">ÉgliseApp</h1>
              <p className="text-xs text-muted-foreground">Système de Gestion d'Église</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden md:block">
                {user?.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r py-6 md:block">
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
                          <Link key={item.to} to={item.to}>
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-6 md:pl-6">{children}</main>
      </div>
    </div>
  );
}
