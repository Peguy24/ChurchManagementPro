import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldAlert, RefreshCw } from "lucide-react";

type Denial = {
  id: string;
  created_at: string;
  user_id: string;
  roles: string[] | null;
  tool_name: string;
  rule: string;
  table_name: string | null;
  column_name: string | null;
  required_scope: string | null;
  message: string;
};

const COPY: Record<string, Record<string, string>> = {
  en: {
    title: "AI Access Denials",
    subtitle: "Every AI Assistant request blocked by the data-access policy.",
    search: "Search by tool, rule, role or table...",
    when: "When",
    roles: "Roles",
    tool: "Tool",
    rule: "Policy rule",
    target: "Target",
    detail: "Detail",
    empty: "No denied requests recorded. ",
    refresh: "Refresh",
    total: "denied requests",
  },
  fr: {
    title: "Refus d'accès IA",
    subtitle: "Chaque requête de l'Assistant IA bloquée par la politique d'accès aux données.",
    search: "Rechercher par outil, règle, rôle ou table...",
    when: "Date",
    roles: "Rôles",
    tool: "Outil",
    rule: "Règle appliquée",
    target: "Cible",
    detail: "Détail",
    empty: "Aucune requête refusée enregistrée.",
    refresh: "Actualiser",
    total: "requêtes refusées",
  },
  ht: {
    title: "Refi aksè IA",
    subtitle: "Chak demann Asistan IA politik aksè done a bloke.",
    search: "Chèche pa zouti, règ, wòl oswa tab...",
    when: "Dat",
    roles: "Wòl",
    tool: "Zouti",
    rule: "Règ politik",
    target: "Sib",
    detail: "Detay",
    empty: "Pa gen demann refize anrejistre.",
    refresh: "Aktyalize",
    total: "demann refize",
  },
};

const RULE_LABELS: Record<string, string> = {
  table_not_allowed: "Table not allow-listed",
  scope_denied: "Role scope denied",
  column_not_allowed: "Column not allow-listed",
  filter_not_allowed: "Filter not permitted",
  invalid_date: "Invalid date argument",
  invalid_identifier: "Invalid identifier",
  too_many_values: "Too many values",
};

export default function AiDenialLogs() {
  const { language } = useLanguage();
  const t = COPY[language] ?? COPY.en;
  const [rows, setRows] = useState<Denial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_tool_denials")
      .select("id, created_at, user_id, roles, tool_name, rule, table_name, column_name, required_scope, message")
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as Denial[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.tool_name, r.rule, r.table_name, r.column_name, r.required_scope, r.message, ...(r.roles ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
        </div>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-base">
              {filtered.length} {t.total}
            </CardTitle>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="max-w-md"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {filtered.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.when}</TableHead>
                    <TableHead>{t.roles}</TableHead>
                    <TableHead>{t.tool}</TableHead>
                    <TableHead>{t.rule}</TableHead>
                    <TableHead>{t.target}</TableHead>
                    <TableHead>{t.detail}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {(r.roles ?? []).length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          (r.roles ?? []).map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.tool_name}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">
                          {RULE_LABELS[r.rule] ?? r.rule}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {[r.table_name, r.column_name].filter(Boolean).join(".") || "—"}
                        {r.required_scope ? (
                          <span className="ml-1 text-muted-foreground">({r.required_scope})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs max-w-md">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
