import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Globe, Trash2, CheckCircle2, Copy, Star, RefreshCw } from "lucide-react";
import { PLATFORM_DOMAIN } from "@/lib/tenantHost";

type Domain = {
  id: string;
  hostname: string;
  domain_type: "subdomain" | "custom";
  is_primary: boolean;
  verification_status: "pending" | "verified" | "failed";
  verification_token: string | null;
  cname_target: string | null;
  created_at: string;
  verified_at: string | null;
};

export default function DomainManager({ tenantId }: { tenantId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState("");
  const [customHost, setCustomHost] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data, error }] = await Promise.all([
      supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle(),
      supabase
        .from("tenant_domains" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .neq("status", "removed")
        .order("created_at", { ascending: true }),
    ]);
    if (t?.slug) setTenantSlug(t.slug);
    if (!error) {
      // Normalize DB columns (kind/status/last_verified_at) to UI shape.
      const rows = ((data as any[]) || []).map((r) => ({
        id: r.id,
        hostname: r.hostname,
        domain_type: r.kind === "subdomain" ? "subdomain" : "custom",
        is_primary: !!r.is_primary,
        verification_status:
          r.status === "active" ? "verified" : r.status === "failed" ? "failed" : "pending",
        verification_token: r.verification_token,
        cname_target: `sites.${PLATFORM_DOMAIN}`,
        created_at: r.created_at,
        verified_at: r.last_verified_at,
      })) as Domain[];
      setDomains(rows);
    }
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const claimSubdomain = async () => {
    if (!subdomain.trim()) return;
    setClaiming(true);
    const { error } = await supabase.rpc("claim_tenant_subdomain" as any, {
      _tenant_id: tenantId,
      _subdomain: subdomain.trim().toLowerCase(),
    });
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Subdomain claimed");
    setSubdomain("");
    load();
  };

  const addCustom = async () => {
    if (!customHost.trim()) return;
    setAdding(true);
    const { error } = await supabase.rpc("add_tenant_custom_domain" as any, {
      _tenant_id: tenantId,
      _hostname: customHost.trim().toLowerCase(),
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Domain added — configure DNS to verify");
    setCustomHost("");
    load();
  };

  const verify = async (id: string) => {
    setVerifying(id);
    const { data, error } = await supabase.functions.invoke("verify-tenant-domain", { body: { domain_id: id } });
    setVerifying(null);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.verified) toast.success("Domain verified — SSL provisioning may take a few minutes");
    else toast.info("Not verified yet. Check your DNS records.");
    load();
  };

  const checkAll = async () => {
    const targets = domains.filter(
      (d) => d.domain_type === "custom" && d.verification_status !== "verified",
    );
    if (targets.length === 0) {
      toast.info("No custom domains pending verification");
      return;
    }
    setCheckingAll(true);
    const results = await Promise.all(
      targets.map((d) =>
        supabase.functions
          .invoke("verify-tenant-domain", { body: { domain_id: d.id } })
          .then((r) => ({ id: d.id, host: d.hostname, ok: (r.data as any)?.verified === true, err: r.error }))
          .catch((err) => ({ id: d.id, host: d.hostname, ok: false, err })),
      ),
    );
    setCheckingAll(false);
    const verified = results.filter((r) => r.ok).length;
    const stillPending = results.length - verified;
    if (verified > 0 && stillPending === 0) toast.success(`${verified} domain(s) verified`);
    else if (verified > 0) toast.success(`${verified} verified, ${stillPending} still pending DNS`);
    else toast.info(`No new verifications. ${stillPending} still pending DNS.`);
    load();
  };

  const setPrimary = async (id: string) => {
    const { error } = await supabase.rpc("set_primary_tenant_domain" as any, { _domain_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Primary domain updated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this domain?")) return;
    const { error } = await supabase.from("tenant_domains" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Domains</CardTitle>
        <CardDescription>
          Serve your church website on a free <strong>subdomain</strong> of {PLATFORM_DOMAIN} or connect a{" "}
          <strong>custom domain</strong> you already own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Claim subdomain */}
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <Label className="font-semibold">Free web address</Label>
          <p className="text-xs text-muted-foreground">
            Reserves your site at <code>{PLATFORM_DOMAIN}/site/&lt;name&gt;</code> — works instantly, no DNS setup.
            For a true <code>&lt;name&gt;.{PLATFORM_DOMAIN}</code> URL, use the custom domain option below.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="mychurch"
              className="flex-1 min-w-[180px]"
            />
            <span className="flex items-center text-sm text-muted-foreground">.{PLATFORM_DOMAIN}</span>
            <Button onClick={claimSubdomain} disabled={claiming || !subdomain.trim()}>
              {claiming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Claim
            </Button>
          </div>
        </div>

        {/* Add custom domain */}
        <div className="space-y-2 border rounded-lg p-4">
          <Label className="font-semibold">Your own domain (BYO)</Label>
          <p className="text-xs text-muted-foreground">
            Example: <code>www.mychurch.org</code>. You'll get DNS records to add at your registrar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="www.mychurch.org"
              className="flex-1 min-w-[220px]"
            />
            <Button onClick={addCustom} disabled={adding || !customHost.trim()}>
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add domain
            </Button>
          </div>
        </div>

        {/* Existing domains */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="font-semibold">Your domains</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={checkAll}
              disabled={checkingAll || loading || domains.every((d) => d.domain_type !== "custom" || d.verification_status === "verified")}
              title="Re-check DNS TXT records for all pending custom domains"
            >
              {checkingAll ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Check all
            </Button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : domains.length === 0 ? (
            <div className="text-sm text-muted-foreground">No domains yet.</div>
          ) : (
            domains.map((d) => {
              // For subdomain rows, the true <sub>.churchmanagementpro.com URL requires a
              // wildcard DNS setup that isn't in place — link to the reliable path URL instead.
              const effectiveUrl =
                d.domain_type === "subdomain" && tenantSlug
                  ? `https://${PLATFORM_DOMAIN}/site/${tenantSlug}`
                  : `https://${d.hostname}`;
              return (
              <div key={d.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm hover:underline"
                  >
                    {d.hostname}
                  </a>
                  <Badge variant="outline">{d.domain_type === "subdomain" ? "Subdomain" : "Custom"}</Badge>
                  {d.verification_status === "verified" ? (
                    <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</Badge>
                  ) : d.verification_status === "failed" ? (
                    <Badge variant="destructive">Failed</Badge>
                  ) : (
                    <Badge variant="secondary">Pending DNS</Badge>
                  )}
                  {d.is_primary && <Badge className="gap-1"><Star className="w-3 h-3" /> Primary</Badge>}
                  <div className="ml-auto flex gap-1">
                    {d.verification_status !== "verified" && d.domain_type === "custom" && (
                      <Button size="sm" variant="outline" onClick={() => verify(d.id)} disabled={verifying === d.id}>
                        {verifying === d.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Verify
                      </Button>
                    )}
                    {d.verification_status === "verified" && !d.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrimary(d.id)}
                        title="Use this domain as the canonical URL for links and redirects"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Set as primary
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {d.domain_type === "custom" && d.verification_status !== "verified" && (
                  <div className="text-xs bg-muted/50 rounded p-3 space-y-2 font-mono">
                    <div>Add these DNS records at your registrar:</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-14 shrink-0">CNAME</span>
                      <span className="shrink-0">{d.hostname}</span>
                      <span>→</span>
                      <span className="flex-1 truncate">{d.cname_target || `sites.${PLATFORM_DOMAIN}`}</span>
                      <Button size="icon" variant="ghost" onClick={() => copy(d.cname_target || `sites.${PLATFORM_DOMAIN}`)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    {d.verification_token && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-14 shrink-0">TXT</span>
                        <span className="shrink-0">_cmp-verify.{d.hostname}</span>
                        <span>→</span>
                        <span className="flex-1 truncate">{d.verification_token}</span>
                        <Button size="icon" variant="ghost" onClick={() => copy(d.verification_token!)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-muted-foreground font-sans">
                      DNS changes can take up to 24 hours to propagate. Click <strong>Verify</strong> after adding the records.
                    </div>
                  </div>
                )}

                {d.domain_type === "subdomain" && (
                  <div className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-3 space-y-1">
                    <div className="font-sans">
                      Your site is live at{" "}
                      <a
                        href={effectiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono underline break-all"
                      >
                        {effectiveUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                    <div className="text-muted-foreground font-sans">
                      To use <code>{d.hostname}</code> directly, add it as a custom domain below and configure the DNS at your registrar.
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
