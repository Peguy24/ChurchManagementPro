import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, Lock, Mail, Phone, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PrayerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  is_private: boolean;
  status: "new" | "read" | "praying" | "archived";
  created_at: string;
}

const STATUS_COLORS: Record<PrayerRow["status"], string> = {
  new: "bg-blue-500",
  read: "bg-neutral-400",
  praying: "bg-emerald-500",
  archived: "bg-neutral-300",
};

export default function PrayerRequests() {
  const { tenantId } = useCurrentTenant();
  const [rows, setRows] = useState<PrayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("prayer_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const updateStatus = async (id: string, status: PrayerRow["status"]) => {
    const { error } = await supabase.from("prayer_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    toast.success("Updated");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this prayer request permanently?")) return;
    const { error } = await supabase.from("prayer_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const filtered = rows.filter((r) => (tab === "archived" ? r.status === "archived" : r.status !== "archived"));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 grid place-items-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Prayer Requests</h1>
            <p className="text-sm text-muted-foreground">Requests submitted through your public website.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Active ({rows.filter((r) => r.status !== "archived").length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({rows.filter((r) => r.status === "archived").length})</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">No requests yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {r.name}
                            {r.is_private && <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-label="Private" />}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                            <span>{new Date(r.created_at).toLocaleString()}</span>
                            {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" />{r.email}</a>}
                            {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="w-3 h-3" />{r.phone}</a>}
                          </div>
                        </div>
                        <Badge className={`${STATUS_COLORS[r.status]} text-white capitalize`}>{r.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="whitespace-pre-line text-sm">{r.message}</p>
                      <div className="flex flex-wrap gap-2">
                        {r.status === "new" && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "read")}>Mark Read</Button>}
                        {r.status !== "praying" && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "praying")}>Praying</Button>}
                        {r.status !== "archived" && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "archived")}>Archive</Button>}
                        {r.status === "archived" && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "read")}>Restore</Button>}
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
