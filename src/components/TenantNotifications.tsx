import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import {
  Bell, X, AlertTriangle, Info, Check, UserPlus, DollarSign,
  Calendar, Briefcase, Users, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface TenantNotification {
  id: string;
  tenant_id: string;
  notification_type: string;
  severity: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  new_member: UserPlus,
  new_donation: DollarSign,
  new_event: Calendar,
  new_expense: Briefcase,
  member_request: Users,
  info: Info,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export default function TenantNotifications() {
  const { t, language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dateLocale = language === "fr" ? fr : enUS;

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["tenant-notifications", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_notifications" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as TenantNotification[];
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("tenant_notifications" as any)
        .update({ is_read: true })
        .eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-notifications"] }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("tenant_notifications" as any)
        .update({ is_dismissed: true })
        .eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await supabase
        .from("tenant_notifications" as any)
        .update({ is_read: true })
        .eq("tenant_id", tenantId)
        .eq("is_read", false)
        .eq("is_dismissed", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-notifications"] }),
  });

  const dismissAll = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await supabase
        .from("tenant_notifications" as any)
        .update({ is_dismissed: true })
        .eq("tenant_id", tenantId)
        .eq("is_dismissed", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-notifications"] }),
  });

  if (!tenantId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">{t("tenantNotifications.title")}</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
              >
                <Check className="h-3 w-3 mr-1" />
                {t("tenantNotifications.markAllRead")}
              </Button>
            )}
            {(notifications?.length || 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => dismissAll.mutate()}
              >
                <XCircle className="h-3 w-3 mr-1" />
                {t("tenantNotifications.clearAll")}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("common.loading")}...
            </div>
          ) : !notifications?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t("tenantNotifications.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const TypeIcon = TYPE_ICONS[notif.notification_type] || Info;
                const severityClass = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;

                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${!notif.is_read ? "bg-muted/30" : ""}`}
                    onClick={() => !notif.is_read && markAsRead.mutate(notif.id)}
                  >
                    <div className="flex gap-3">
                      <TypeIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${severityClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!notif.is_read ? "font-semibold" : "font-medium"}`}>
                            {notif.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismiss.mutate(notif.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
