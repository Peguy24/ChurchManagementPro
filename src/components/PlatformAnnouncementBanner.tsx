import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Banner {
  id: string;
  title: string;
  message: string;
  banner_type: string;
  priority: string;
}

const BANNER_STYLES: Record<string, { bg: string; border: string; icon: React.ElementType }> = {
  info: { bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200 dark:border-sky-800", icon: Info },
  warning: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: AlertTriangle },
  critical: { bg: "bg-destructive/10", border: "border-destructive/30", icon: AlertCircle },
  update: { bg: "bg-primary/10", border: "border-primary/30", icon: Megaphone },
};

export default function PlatformAnnouncementBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: banners } = useQuery({
    queryKey: ["platform-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcement_banners")
        .select("id, title, message, banner_type, priority")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .order("priority", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as Banner[];
    },
    refetchInterval: 300000, // 5 min
  });

  const visibleBanners = (banners || []).filter(b => !dismissed.has(b.id));
  if (!visibleBanners.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleBanners.map(banner => {
        const style = BANNER_STYLES[banner.banner_type] || BANNER_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={banner.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${style.bg} ${style.border}`}
          >
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-foreground/70" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{banner.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{banner.message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setDismissed(prev => new Set([...prev, banner.id]))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
