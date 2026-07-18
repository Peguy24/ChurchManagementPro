import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown, Download } from "lucide-react";
import { format } from "date-fns";

export default function NpsAdmin() {
  const { data: summary = [] } = useQuery({
    queryKey: ["nps-summary"],
    queryFn: async () => (await supabase.rpc("get_nps_summary")).data || [],
  });
  const { data: recent = [] } = useQuery({
    queryKey: ["nps-recent"],
    queryFn: async () => (await supabase.from("nps_surveys").select("*, tenants(name)").order("submitted_at", { ascending: false }).limit(50)).data || [],
  });

  const current = summary[0];

  const exportCsv = () => {
    const headers = ["submitted_at", "tenant", "score", "category", "comment", "cycle"];
    const rows = recent.map((r: any) => [r.submitted_at, r.tenants?.name || "", r.score, r.category, (r.comment || "").replace(/[\r\n,"]/g, " "), r.survey_cycle]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">NPS Feedback</h1>
            <p className="text-muted-foreground">Customer satisfaction score & comments.</p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current NPS</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold">{current?.score ?? "—"}</p><p className="text-xs text-muted-foreground">{current?.cycle}</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Smile className="w-4 h-4 text-green-600" /> Promoters</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{current?.promoters ?? 0}</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Meh className="w-4 h-4 text-yellow-600" /> Passives</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{current?.passives ?? 0}</p></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Frown className="w-4 h-4 text-red-600" /> Detractors</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{current?.detractors ?? 0}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Trend by Quarter</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.map((s: any) => (
                <div key={s.cycle} className="flex items-center gap-4 text-sm">
                  <span className="w-20 font-medium">{s.cycle}</span>
                  <span className="w-16 text-right font-bold">{s.score ?? 0}</span>
                  <div className="flex-1 h-3 bg-muted rounded overflow-hidden flex">
                    <div className="bg-green-500" style={{ width: `${(Number(s.promoters) / Number(s.total)) * 100}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${(Number(s.passives) / Number(s.total)) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(Number(s.detractors) / Number(s.total)) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-muted-foreground">n={s.total}</span>
                </div>
              ))}
              {summary.length === 0 && <p className="text-center text-muted-foreground py-4">No responses yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Responses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent.map((r: any) => (
                <div key={r.id} className="border rounded p-3 flex items-start gap-3">
                  <Badge variant={r.category === "promoter" ? "default" : r.category === "passive" ? "secondary" : "destructive"}>{r.score}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.tenants?.name || "—"}</p>
                    {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.submitted_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              ))}
              {recent.length === 0 && <p className="text-center text-muted-foreground py-4">No responses</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
