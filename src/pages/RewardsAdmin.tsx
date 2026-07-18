import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Gift, Trophy, Edit, Trash2, Check, X } from "lucide-react";

const emptyForm = {
  id: "", name: "", description: "", cost_in_referrals: 1,
  reward_type: "free_month", image_url: "", is_active: true, sort_order: 0,
};

export default function RewardsAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"catalog" | "redemptions" | "leaderboard">("catalog");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: catalog = [] } = useQuery({
    queryKey: ["reward-catalog-admin"],
    queryFn: async () => (await supabase.from("reward_catalog").select("*").order("sort_order")).data || [],
  });
  const { data: redemptions = [] } = useQuery({
    queryKey: ["reward-redemptions"],
    queryFn: async () => (await supabase.from("reward_redemptions").select("*, reward_catalog(name), tenants(name)").order("created_at", { ascending: false })).data || [],
  });
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["referral-leaderboard-admin"],
    queryFn: async () => (await supabase.rpc("get_referral_leaderboard", { _limit: 20 })).data || [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, id: undefined as any };
      if (form.id) {
        const { error } = await supabase.from("reward_catalog").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reward_catalog").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["reward-catalog-admin"] }); setDialogOpen(false); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reward_catalog").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["reward-catalog-admin"] }); },
  });

  const updateRedemption = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("reward_redemptions").update({
        status, fulfilled_by: u.user?.id, fulfilled_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["reward-redemptions"] }); },
  });

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Gift /> Rewards & Leaderboard</h1>
            <p className="text-muted-foreground">Manage referral rewards and view top referrers.</p>
          </div>
        </div>

        <div className="flex gap-2 border-b">
          {[{ id: "catalog", label: "Catalog" }, { id: "redemptions", label: `Redemptions (${redemptions.filter((r: any) => r.status === "pending").length})` }, { id: "leaderboard", label: "Leaderboard" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>{t.label}</button>
          ))}
        </div>

        {tab === "catalog" && (
          <>
            <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Reward</Button>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{r.reward_type}</Badge>
                      <Badge>{r.cost_in_referrals} referrals</Badge>
                    </div>
                    <div className="flex gap-1 pt-2">
                      <Button size="sm" variant="outline" onClick={() => { setForm({ ...r }); setDialogOpen(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === "redemptions" && (
          <div className="space-y-2">
            {redemptions.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{r.tenants?.name} → {r.reward_catalog?.name}</p>
                    <p className="text-xs text-muted-foreground">Cost: {r.cost_paid} referrals · {new Date(r.created_at).toLocaleString()}</p>
                    {r.notes && <p className="text-sm mt-1">{r.notes}</p>}
                  </div>
                  <Badge>{r.status}</Badge>
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => updateRedemption.mutate({ id: r.id, status: "fulfilled" })}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateRedemption.mutate({ id: r.id, status: "denied" })}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {redemptions.length === 0 && <p className="text-center text-muted-foreground py-8">No redemptions</p>}
          </div>
        )}

        {tab === "leaderboard" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy /> Top Referrers</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {leaderboard.map((row: any) => (
                  <div key={row.tenant_id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg w-8 text-center">{row.rank}</span>
                      <span>{row.tenant_name}</span>
                    </div>
                    <Badge>{row.qualified_count} qualified</Badge>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-4">No qualified referrals yet</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Reward</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cost (referrals)</Label><Input type="number" value={form.cost_in_referrals} onChange={(e) => setForm({ ...form, cost_in_referrals: +e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_month">Free Month</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="swag">Swag</SelectItem>
                      <SelectItem value="feature_unlock">Feature Unlock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Image URL (optional)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.name}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
