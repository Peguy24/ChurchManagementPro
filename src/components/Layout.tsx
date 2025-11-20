import { ReactNode } from "react";
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
  Network,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tablo Bò" },
  { to: "/members", icon: Users, label: "Manm" },
  { to: "/members/cards", icon: CreditCard, label: "Kat Manm" },
  { to: "/attendance", icon: ClipboardCheck, label: "Prezans" },
  { to: "/attendance/alerts", icon: Bell, label: "Alèt Prezans" },
  { to: "/attendance/comparison", icon: BarChart3, label: "Konparezon Gwoup" },
  { to: "/donations", icon: DollarSign, label: "Don" },
  { to: "/events", icon: Calendar, label: "Evènman" },
  { to: "/ministries", icon: Briefcase, label: "Ministè" },
  { to: "/branches", icon: Church, label: "Branch" },
  { to: "/branches/hierarchy", icon: Network, label: "Òganigramm" },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Erè',
        description: 'Pwoblèm pou dekonekte',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Dekonekte',
        description: 'Ou dekonekte avèk siksè',
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
              <h1 className="text-xl font-bold text-foreground">EglizApp</h1>
              <p className="text-xs text-muted-foreground">Sistèm Jesyon Legliz</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </div>
                </Link>
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
