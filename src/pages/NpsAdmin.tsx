import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smile, Meh, Frown, Download, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Row = {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  plan: string;
  member_count: number;
  score: number;
  category: string | null;
  comment: string | null;
  survey_cycle: string;
  submitted_at: string;
};

const SIZE_BUCKETS = [
  { label: "All sizes", value: "all", min: null, max: null },
  { label: "< 50 members", value: "s", min: null, max: 49 },
  { label: "50–200", value: "m", min: 50, max: 200 },
  { label: "200–500", value: "l", min: 200, max: 500 },
  { label: "500+", value: "xl", min: 500, max: null },
];

const PLANS = ["all", "trial", "essentiel", "professionnel", "entreprise"];

export default function NpsAdmin() {
  const qc = useQueryClient();
  const [plan, setPlan] = useState("all");
  const [size, setSize] = useState("all");

  const bucket = SIZE_BUCKETS.find((b) => b.value === size)!;

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["nps-filtered", plan, size],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nps_responses_filtered", {
        _plan: plan === "all" ? null : plan,
        _min_members: bucket.min,
        _max_members: bucket.max,
      });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const promoters = rows.filter((r) => r.score >= 9).length;
    const passives = rows.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = rows.filter((r) => r.score <= 6).length;
    const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    return { total, promoters, passives, detractors, score };
  }, [rows]);

  const trend = useMemo(() => {
    const byCycle = new Map<string, Row[]>();
    rows.forEach((r) => {
      if (!byCycle.has(r.survey_cycle)) byCycle.set(r.survey_cycle, []);
      byCycle.get(r.survey_cycle)!.push(r);
    });
    return Array.from(byCycle.entries())
      .map(([cycle, list]) => {
        const p = list.filter((r) => r.score >= 9).length;
        const pa = list.filter((r) => r.score >= 7 && r.score <= 8).length;
        const d = list.filter((r) => r.score <= 6).length;
        return {
          cycle,
          total: list.length,
          promoters: p,
          passives: pa,
          detractors: d,
          score: list.length ? Math.round(((p - d) / list.length) * 100) : 0,
        };
      })
      .sort((a, b) => (a.cycle < b.cycle ? 1 : -1));
  }, [rows]);

  const sendEmails = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-nps-survey", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (r: any) => {
      toast.success(`Emailed ${r?.sent ?? 0} admins (skipped ${r?.skipped ?? 0})`);
      qc.invalidateQueries({ queryKey: ["nps-last-emailed"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: lastEmailed } = useQuery({
    queryKey: ["nps-last-emailed"],
    queryFn: async () => {
      const { data } = await supabase.from("nps_email_sends").select("sent_at").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      return data?.sent_at ?? null;
    },
  });

  const exportCsv = () => {
    const headers = ["submitted_at", "tenant", "plan", "member_count", "score", "category", "comment", "cycle"];
    const csvRows = rows.map((r) => [r.submitted_at, r.tenant_name || "", r.plan, r.member_count, r.score, r.category, (r.comment || "").replace(/[\r\n,"]/g, " "), r.survey_cycle]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nps-${plan}-${size}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">NPS Feedback</h1>
            <p className="text-muted-foreground">Customer satisfaction score & comments.</p>
            {lastEmailed && (
              <p className="text-xs text-muted-foreground mt-1">
                Last email survey: {format(new Date(lastEmailed), "MMM d, yyyy HH:mm")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => sendEmails.mutate()} disabled={sendEmails.isPending}>
              {sendEmails.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send email survey
            </Button>
            <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => <SelectItem key={p} value={p}>{p === "all" ? "All plans" : p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Tenant size</label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZE_BUCKETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              {isLoading ? "Loading..." : `${rows.length} responses`}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">NPS Score</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold">{stats.total > 0 ? stats.score : "—"}</p><p className="text-xs text-muted-foreground">{stats.total} responses</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Smile className="w-4 h-4 text-green-600" /> Promoters</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.promoters}</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Meh className="w-4 h-4 text-yellow-600" /> Passives</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.passives}</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Frown className="w-4 h-4 text-red-600" /> Detractors</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.detractors}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Trend by Cycle</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trend.map((s) => (
                <div key={s.cycle} className="flex items-center gap-4 text-sm">
                  <span className="w-20 font-medium">{s.cycle}</span>
                  <span className="w-16 text-right font-bold">{s.score}</span>
                  <div className="flex-1 h-3 bg-muted rounded overflow-hidden flex">
                    <div className="bg-green-500" style={{ width: `${(s.promoters / s.total) * 100}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${(s.passives / s.total) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(s.detractors / s.total) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-muted-foreground">n={s.total}</span>
                </div>
              ))}
              {trend.length === 0 && <p className="text-center text-muted-foreground py-4">No responses in this segment</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Responses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rows.slice(0, 50).map((r) => (
                <div key={r.id} className="border rounded p-3 flex items-start gap-3">
                  <Badge variant={r.score >= 9 ? "default" : r.score >= 7 ? "secondary" : "destructive"}>{r.score}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {r.tenant_name || "—"}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">{r.plan} · {r.member_count} members</span>
                    </p>
                    {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.submitted_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="text-center text-muted-foreground py-4">No responses</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
