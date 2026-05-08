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
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, CreditCard } from "lucide-react";
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
  discount_expired: AlertTriangle,
  info: Info,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-sky-500",
};

// Translation maps for notification titles and messages
const notifTitleTranslations: Record<string, Record<string, string>> = {
  fr: {
    new_member_added: "Nouveau membre ajouté",
    new_donation_received: "Nouveau don reçu",
    new_event_created: "Nouvel événement créé",
    new_expense_recorded: "Nouvelle dépense enregistrée",
    new_membership_request: "Nouvelle demande d'adhésion",
    payment_failed: "Paiement échoué",
    free_access_ended_plan_restored: "Accès gratuit terminé — plan précédent réactivé",
    free_access_ended_select_plan: "Accès gratuit terminé — veuillez sélectionner un plan",
    discount_ended: "Votre réduction a pris fin",
  },
  en: {
    new_member_added: "New member added",
    new_donation_received: "New donation received",
    new_event_created: "New event created",
    new_expense_recorded: "New expense recorded",
    new_membership_request: "New membership request",
    payment_failed: "Payment failed",
    free_access_ended_plan_restored: "Free access ended — previous plan reactivated",
    free_access_ended_select_plan: "Free access ended — please select a plan",
    discount_ended: "Your discount has ended",
  },
  ht: {
    new_member_added: "Nouvo manm ajoute",
    new_donation_received: "Nouvo don resevwa",
    new_event_created: "Nouvo evènman kreye",
    new_expense_recorded: "Nouvo depans anrejistre",
    new_membership_request: "Nouvo demann manm",
    payment_failed: "Peman echwe",
    free_access_ended_plan_restored: "Aksè gratis fini — plan anvan an reaktive",
    free_access_ended_select_plan: "Aksè gratis fini — tanpri chwazi yon plan",
    discount_ended: "Rabè ou a fini",
  },
};

// Legacy French titles stored in DB → key mapping
const legacyTitleMap: Record<string, string> = {
  "Nouveau membre ajouté": "new_member_added",
  "Nouveau don reçu": "new_donation_received",
  "Nouvel événement créé": "new_event_created",
  "Nouvelle dépense enregistrée": "new_expense_recorded",
  "Nouvelle demande d'adhésion": "new_membership_request",
};

function translateTitle(title: string, language: string): string {
  // Check if it's a key
  const translated = notifTitleTranslations[language]?.[title];
  if (translated) return translated;

  // Check if it's a legacy French string
  const key = legacyTitleMap[title];
  if (key) return notifTitleTranslations[language]?.[key] || title;

  return title;
}

function translateMessage(notif: TenantNotification, language: string): string {
  const meta = notif.metadata || {};
  const type = notif.notification_type;

  // Try to build a translated message from metadata
  if (type === "new_member" && meta.member_name) {
    const templates: Record<string, string> = {
      fr: `${meta.member_name} a été ajouté comme membre.`,
      en: `${meta.member_name} has been added as a member.`,
      ht: `${meta.member_name} te ajoute kòm manm.`,
    };
    return templates[language] || templates.en;
  }

  if (type === "new_donation" && meta.amount != null) {
    const templates: Record<string, string> = {
      fr: `Un don de ${meta.amount} a été enregistré.`,
      en: `A donation of ${meta.amount} has been recorded.`,
      ht: `Yon don de ${meta.amount} te anrejistre.`,
    };
    return templates[language] || templates.en;
  }

  if (type === "new_event" && meta.event_name) {
    const templates: Record<string, string> = {
      fr: `L'événement "${meta.event_name}" a été créé.`,
      en: `The event "${meta.event_name}" has been created.`,
      ht: `Evènman "${meta.event_name}" te kreye.`,
    };
    return templates[language] || templates.en;
  }

  if (type === "new_expense" && meta.amount != null) {
    const desc = meta.description || "";
    const templates: Record<string, string> = {
      fr: `Dépense de ${meta.amount}${desc ? ` - ${desc}` : ""}`,
      en: `Expense of ${meta.amount}${desc ? ` - ${desc}` : ""}`,
      ht: `Depans de ${meta.amount}${desc ? ` - ${desc}` : ""}`,
    };
    return templates[language] || templates.en;
  }

  if (type === "member_request" && meta.name) {
    const templates: Record<string, string> = {
      fr: `${meta.name} souhaite rejoindre votre église.`,
      en: `${meta.name} would like to join your church.`,
      ht: `${meta.name} ta renmen rejwenn legliz ou a.`,
    };
    return templates[language] || templates.en;
  }

  // Fallback: return raw message
  return notif.message;
}

// Local translations for UI strings
const uiTranslations: Record<string, Record<string, string>> = {
  fr: {
    title: "Notifications",
    markAllRead: "Tout marquer lu",
    clearAll: "Tout effacer",
    loading: "Chargement...",
    empty: "Aucune notification",
  },
  en: {
    title: "Notifications",
    markAllRead: "Mark all read",
    clearAll: "Clear all",
    loading: "Loading...",
    empty: "No notifications",
  },
  ht: {
    title: "Notifikasyon",
    markAllRead: "Make tout li",
    clearAll: "Efase tout",
    loading: "Chajman...",
    empty: "Pa gen notifikasyon",
  },
};

export default function TenantNotifications() {
  const { language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dateLocale = language === "fr" ? fr : enUS;
  const ui = uiTranslations[language] || uiTranslations.en;

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
          <h3 className="font-semibold text-sm">{ui.title}</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
              >
                <Check className="h-3 w-3 mr-1" />
                {ui.markAllRead}
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
                {ui.clearAll}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {ui.loading}
            </div>
          ) : !notifications?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {ui.empty}
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
                            {translateTitle(notif.title, language)}
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
                          {translateMessage(notif, language)}
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
