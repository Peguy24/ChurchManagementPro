import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { formatDistanceToNow } from "date-fns";

export function BroadcastInbox() {
  const { tenantId } = useCurrentTenant();
  const [items, setItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data: bcasts } = await supabase
      .from("broadcasts")
      .select("*")
      .in("delivery", ["inbox", "both"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (!bcasts) return;
    // Filter by audience using RPC
    const filtered: any[] = [];
    for (const b of bcasts) {
      if (!tenantId) continue;
      const { data: matches } = await supabase.rpc("matches_broadcast_audience", { _tenant_id: tenantId, _rules: b.audience_rules as any });
      if (matches) filtered.push(b);
    }
    const ids = filtered.map((b) => b.id);
    const { data: reads } = ids.length
      ? await supabase.from("broadcast_reads").select("*").in("broadcast_id", ids).eq("user_id", u.user.id)
      : { data: [] as any[] };
    const readMap = new Map((reads || []).map((r: any) => [r.broadcast_id, r]));
    setItems(filtered.map((b) => ({ ...b, _read: readMap.get(b.id) })));
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const unread = items.filter((i) => !i._read?.dismissed_at).length;

  const markRead = async (broadcast_id: string) => {
    if (!userId) return;
    await supabase.from("broadcast_reads").upsert({ broadcast_id, user_id: userId, read_at: new Date().toISOString() }, { onConflict: "broadcast_id,user_id" });
  };
  const dismiss = async (broadcast_id: string) => {
    if (!userId) return;
    await supabase.from("broadcast_reads").upsert({ broadcast_id, user_id: userId, dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() }, { onConflict: "broadcast_id,user_id" });
    load();
  };

  return (
    <Sheet onOpenChange={(open) => { if (open) load(); items.forEach((i) => !i._read && markRead(i.id)); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Messages</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {items.filter((i) => !i._read?.dismissed_at).map((b) => (
            <Card key={b.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{b.title}</h4>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{b.severity}</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dismiss(b.id)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: b.body_html }} />
                {b.cta_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={b.cta_url} target="_blank" rel="noreferrer">{b.cta_label || "Open"} <ExternalLink className="w-3 h-3 ml-1" /></a>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</p>
              </CardContent>
            </Card>
          ))}
          {items.filter((i) => !i._read?.dismissed_at).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
