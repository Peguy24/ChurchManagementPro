import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell, X, AlertTriangle, Clock, XCircle, Info, Check, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface PlatformNotification {
  id: string;
  notification_type: string;
  severity: string;
  title: string;
  message: string;
  tenant_id: string | null;
  metadata: any;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  critical: { icon: XCircle, className: "text-destructive" },
  warning: { icon: AlertTriangle, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-500" },
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; badgeVariant: "destructive" | "secondary" | "outline" }> = {
  trial_expiring: { icon: Clock, badgeVariant: "secondary" },
  trial_expired: { icon: XCircle, badgeVariant: "destructive" },
  payment_issue: { icon: AlertTriangle, badgeVariant: "destructive" },
  tenant_inactive: { icon: Info, badgeVariant: "outline" },
  contact_message: { icon: Info, badgeVariant: "secondary" },
};

export default function SuperAdminNotifications() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const dateLocale = language === "fr" ? fr : enUS;

  type ContactChannel = "toast" | "email" | "both" | "none";

  const { data: prefs } = useQuery({
    queryKey: ["super-admin-notif-prefs"],
    queryFn: async (): Promise<{ contact_message_channel: ContactChannel }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { contact_message_channel: "both" };
      const { data } = await supabase
        .from("super_admin_notification_prefs" as any)
        .select("contact_message_channel")
        .eq("user_id", user.id)
        .maybeSingle();
      return { contact_message_channel: ((data as any)?.contact_message_channel as ContactChannel) ?? "both" };
    },
  });

  const savePrefs = useMutation({
    mutationFn: async (channel: ContactChannel) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("super_admin_notification_prefs" as any)
        .upsert({ user_id: user.id, contact_message_channel: channel }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-notif-prefs"] });
      toast.success(t("common.saved") || "Saved");
      setPrefsOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["platform-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_notifications")
        .select("*")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as PlatformNotification[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-notifications"] }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_notifications")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("platform_notifications")
        .update({ is_read: true })
        .eq("is_read", false)
        .eq("is_dismissed", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-notifications"] }),
  });

  const refreshAlerts = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("check-platform-alerts", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platform-notifications"] });
      toast.success(`${t("superAdmin.notifications.checked")} (${data?.created || 0} ${t("superAdmin.notifications.newAlerts")})`);
    },
    onError: () => toast.error(t("superAdmin.notifications.checkError")),
  });

  // Real-time subscription: refresh + toast on new platform notifications
  useEffect(() => {
    const channel = supabase
      .channel("platform-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_notifications" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["platform-notifications"] });
          const n = payload.new as PlatformNotification;
          if (n?.title) toast.info(n.title, { description: n.message });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "platform_notifications" },
        () => queryClient.invalidateQueries({ queryKey: ["platform-notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trial_expiring: t("superAdmin.notifications.trialExpiring"),
      trial_expired: t("superAdmin.notifications.trialExpired"),
      payment_issue: t("superAdmin.notifications.paymentIssue"),
      tenant_inactive: t("superAdmin.notifications.tenantInactive"),
      contact_message: t("superAdmin.notifications.contactMessage") || "Contact message",
    };
    return labels[type] || type;
  };

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
          <h3 className="font-semibold text-sm">{t("superAdmin.notifications.title")}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refreshAlerts.mutate()}
              disabled={refreshAlerts.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshAlerts.isPending ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
              >
                <Check className="h-3 w-3 mr-1" />
                {t("superAdmin.notifications.markAllRead")}
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
              {t("superAdmin.notifications.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const severityConf = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
                const typeConf = TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.tenant_inactive;
                const SeverityIcon = severityConf.icon;

                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-muted/50 transition-colors ${!notif.is_read ? "bg-muted/30" : ""}`}
                    onClick={() => !notif.is_read && markAsRead.mutate(notif.id)}
                  >
                    <div className="flex gap-3">
                      <SeverityIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${severityConf.className}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm leading-tight ${!notif.is_read ? "font-semibold" : "font-medium"}`}>
                              {notif.title}
                            </p>
                            <Badge variant={typeConf.badgeVariant} className="text-[10px] px-1.5 py-0 mt-1">
                              {getTypeLabel(notif.notification_type)}
                            </Badge>
                          </div>
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
