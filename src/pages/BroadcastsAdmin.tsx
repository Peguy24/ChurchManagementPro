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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Megaphone, Users, Trash2, Edit, Copy } from "lucide-react";
import { format } from "date-fns";

type AudienceRules = {
  subscription_tier?: string[];
  subscription_status?: string[];
  trial_day_range?: { min?: number; max?: number };
  country?: string[];
  member_count_range?: { min?: number; max?: number };
};

const TIERS = ["basic", "essentiel", "professionnel", "entreprise", "premium"];
const STATUSES = ["trial", "active", "past_due", "canceled", "suspended"];

const emptyForm = {
  id: "",
  title: "",
  body_html: "",
  cta_label: "",
  cta_url: "",
  delivery: "inbox" as "inbox" | "banner" | "both",
  severity: "info" as "info" | "success" | "warning" | "error",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: "",
  is_active: true,
  audience_rules: {} as AudienceRules,
};

export default function BroadcastsAdmin() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["broadcasts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const previewAudience = async () => {
    const { data, error } = await supabase.rpc("preview_broadcast_audience", { _rules: form.audience_rules as any });
    if (error) { toast.error(error.message); return; }
    setAudienceCount(data as number);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        body_html: form.body_html,
        cta_label: form.cta_label || null,
        cta_url: form.cta_url || null,
        delivery: form.delivery,
        severity: form.severity,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
        audience_rules: form.audience_rules as any,
      };
      if (form.id) {
        const { error } = await supabase.from("broadcasts").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("broadcasts").insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Broadcast saved");
      qc.invalidateQueries({ queryKey: ["broadcasts-admin"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setAudienceCount(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("broadcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["broadcasts-admin"] }); },
  });

  const toggleArrayValue = (key: keyof AudienceRules, val: string) => {
    setForm((f) => {
      const cur = (f.audience_rules[key] as string[]) || [];
      const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
      const rules = { ...f.audience_rules, [key]: next };
      if (next.length === 0) delete (rules as any)[key];
      return { ...f, audience_rules: rules };
    });
    setAudienceCount(null);
  };

  const openNew = () => { setForm(emptyForm); setAudienceCount(null); setDialogOpen(true); };
  const openEdit = (b: any) => {
    setForm({
      id: b.id, title: b.title, body_html: b.body_html,
      cta_label: b.cta_label || "", cta_url: b.cta_url || "",
      delivery: b.delivery, severity: b.severity,
      starts_at: b.starts_at ? new Date(b.starts_at).toISOString().slice(0, 16) : "",
      ends_at: b.ends_at ? new Date(b.ends_at).toISOString().slice(0, 16) : "",
      is_active: b.is_active,
      audience_rules: b.audience_rules || {},
    });
    setAudienceCount(null);
    setDialogOpen(true);
  };
  const duplicate = (b: any) => {
    openEdit({ ...b, id: "", title: b.title + " (copy)" });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Megaphone /> Broadcasts</h1>
            <p className="text-muted-foreground">Send targeted messages to specific tenant groups.</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Broadcast</Button>
        </div>

        <div className="grid gap-3">
          {broadcasts.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{b.title}</h3>
                    <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{b.delivery}</Badge>
                    <Badge variant="outline">{b.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: b.body_html }} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(b.starts_at), "MMM d, yyyy")} {b.ends_at && `→ ${format(new Date(b.ends_at), "MMM d, yyyy")}`}
                    {" · "} Rules: {Object.keys(b.audience_rules || {}).length === 0 ? "everyone" : Object.keys(b.audience_rules).join(", ")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => duplicate(b)}><Copy className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {broadcasts.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No broadcasts yet</CardContent></Card>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Broadcast</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Body (HTML allowed)</Label><Textarea rows={4} value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CTA Label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
                <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Delivery</Label>
                  <Select value={form.delivery} onValueChange={(v) => setForm({ ...form, delivery: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox">Inbox only</SelectItem>
                      <SelectItem value="banner">Banner only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["info", "success", "warning", "error"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div><Label>Ends at (optional)</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>

              <Card className="bg-muted/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Audience Targeting</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Subscription Tier</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {TIERS.map((t) => (
                        <label key={t} className="flex items-center gap-1 text-sm">
                          <Checkbox checked={(form.audience_rules.subscription_tier || []).includes(t)} onCheckedChange={() => toggleArrayValue("subscription_tier", t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Subscription Status</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {STATUSES.map((s) => (
                        <label key={s} className="flex items-center gap-1 text-sm">
                          <Checkbox checked={(form.audience_rules.subscription_status || []).includes(s)} onCheckedChange={() => toggleArrayValue("subscription_status", s)} />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Trial day range (0-14)</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="number" placeholder="min" className="w-24" value={form.audience_rules.trial_day_range?.min ?? ""} onChange={(e) => setForm((f) => ({ ...f, audience_rules: { ...f.audience_rules, trial_day_range: { ...f.audience_rules.trial_day_range, min: e.target.value ? +e.target.value : undefined } } }))} />
                      <span>-</span>
                      <Input type="number" placeholder="max" className="w-24" value={form.audience_rules.trial_day_range?.max ?? ""} onChange={(e) => setForm((f) => ({ ...f, audience_rules: { ...f.audience_rules, trial_day_range: { ...f.audience_rules.trial_day_range, max: e.target.value ? +e.target.value : undefined } } }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Country (comma-separated codes)</Label>
                    <Input value={(form.audience_rules.country || []).join(",")} onChange={(e) => setForm((f) => ({ ...f, audience_rules: { ...f.audience_rules, country: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined as any } }))} placeholder="HT, US, FR" />
                  </div>
                  <div>
                    <Label className="text-xs">Member count range</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="number" placeholder="min" className="w-24" value={form.audience_rules.member_count_range?.min ?? ""} onChange={(e) => setForm((f) => ({ ...f, audience_rules: { ...f.audience_rules, member_count_range: { ...f.audience_rules.member_count_range, min: e.target.value ? +e.target.value : undefined } } }))} />
                      <span>-</span>
                      <Input type="number" placeholder="max" className="w-24" value={form.audience_rules.member_count_range?.max ?? ""} onChange={(e) => setForm((f) => ({ ...f, audience_rules: { ...f.audience_rules, member_count_range: { ...f.audience_rules.member_count_range, max: e.target.value ? +e.target.value : undefined } } }))} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={previewAudience}>Preview audience</Button>
                  {audienceCount !== null && <p className="text-sm font-medium">Matches: <span className="text-primary">{audienceCount}</span> tenants</p>}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.body_html}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
