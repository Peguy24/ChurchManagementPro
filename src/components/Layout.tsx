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
  Settings,
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
  { to: "/custom-fields", icon: Settings, label: "Chan Pèsonalize" },
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
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-red-600 to-red-700 shadow-lg">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Church className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ChurchCRM</h1>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="text-white hover:bg-red-700">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                CA
              </div>
              <span className="text-sm text-white font-medium hidden md:block">
                Church Admin
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-red-700">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-72 bg-gray-800 md:block">
          <div className="p-4">
            <select className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm">
              <option>Seleksyone Branch</option>
            </select>
          </div>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-700 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
