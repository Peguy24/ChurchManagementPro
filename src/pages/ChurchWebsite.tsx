import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { Globe, ExternalLink, Loader2, Sparkles, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { renderTemplate, SiteContent, TEMPLATE_LIST } from "@/components/website/SiteTemplates";
import MediaLibrary, { TenantMediaItem } from "@/components/website/MediaLibrary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TEMPLATES = TEMPLATE_LIST;

const emptyContent: SiteContent = {
  tagline: "",
  about: "",
  address: "",
  phone: "",
  email: "",
  hero_image_url: "",
  footer_text: "",
  service_times: [],
  social: { facebook: "", instagram: "", youtube: "", whatsapp: "" },
};

export default function ChurchWebsite() {
  const { tenant, tenantId } = useCurrentTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [hasAddon, setHasAddon] = useState(false);
  const [template, setTemplate] = useState("classic");
  const [isPublished, setIsPublished] = useState(false);
  const [content, setContent] = useState<SiteContent>(emptyContent);
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; caption?: string }>>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const publicUrl = tenant?.slug ? `${window.location.origin}/site/${tenant.slug}` : "";

  useEffect(() => {
    const addonStatus = searchParams.get("addon");
    if (addonStatus === "success") {
      toast.success("Website add-on activated! Give it a moment to sync.");
      searchParams.delete("addon");
      setSearchParams(searchParams, { replace: true });
    } else if (addonStatus === "cancelled") {
      toast.info("Subscription cancelled.");
      searchParams.delete("addon");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadGallery = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tenant_media")
      .select("public_url,caption")
      .eq("tenant_id", tenantId)
      .eq("category", "gallery")
      .not("public_url", "is", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setGalleryImages(
      (data || [])
        .filter((r: any) => r.public_url)
        .map((r: any) => ({ url: r.public_url as string, caption: r.caption || undefined })),
    );
  };

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      const [{ data: addon }, { data: site }] = await Promise.all([
        supabase.rpc("has_website_addon", { _tenant_id: tenantId }),
        supabase.from("tenant_websites").select("*").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      setHasAddon(!!addon);
      if (site) {
        setTemplate(site.template || "classic");
        setIsPublished(!!site.is_published);
        setContent({ ...emptyContent, ...(site.content as SiteContent) });
      }
      await loadGallery();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const previewProps = useMemo(
    () => ({
      name: tenant?.name || "Your Church",
      logoUrl: tenant?.logo_url,
      primaryColor: tenant?.primary_color,
      content: { ...content, gallery: galleryImages },
    }),
    [tenant, content, galleryImages],
  );

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-website-addon-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout");
    } finally {
      setSubscribing(false);
    }
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!tenantId) return;
    setSaving(true);
    const publish = publishOverride ?? isPublished;
    const { error } = await supabase.from("tenant_websites").upsert(
      {
        tenant_id: tenantId,
        template,
        content: content as any,
        is_published: publish,
      },
      { onConflict: "tenant_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      setIsPublished(publish);
      toast.success(publish ? "Website saved & published" : "Website saved");
    }
  };

  const updateContent = (patch: Partial<SiteContent>) => setContent((c) => ({ ...c, ...patch }));
  const updateSocial = (key: keyof NonNullable<SiteContent["social"]>, val: string) =>
    setContent((c) => ({ ...c, social: { ...(c.social || {}), [key]: val } }));
  const addService = () =>
    setContent((c) => ({ ...c, service_times: [...(c.service_times || []), { day: "Sunday", time: "10:00 AM", title: "" }] }));
  const updateService = (i: number, patch: Partial<{ day: string; time: string; title: string }>) =>
    setContent((c) => {
      const arr = [...(c.service_times || [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...c, service_times: arr };
    });
  const removeService = (i: number) =>
    setContent((c) => {
      const arr = [...(c.service_times || [])];
      arr.splice(i, 1);
      return { ...c, service_times: arr };
    });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAddon) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Church Website Add-On</h1>
            <p className="text-muted-foreground">Give your church a beautiful public page at your own URL — no design skills needed.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> $15/month</CardTitle>
              <CardDescription>Includes 3 templates, live editor, and unlimited updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li>• Choose from Classic, Modern, or Warm designs</li>
                <li>• Share your service times, address, and contact info</li>
                <li>• Link Facebook, Instagram, YouTube, WhatsApp</li>
                <li>• Publish and unpublish anytime</li>
                <li>• Live preview while you edit</li>
              </ul>
              <Button onClick={handleSubscribe} disabled={subscribing} size="lg" className="w-full">
                {subscribing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Subscribe — $15/month
              </Button>
              <p className="text-xs text-muted-foreground text-center">Cancel anytime from your subscription page.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded overflow-hidden max-h-[500px] overflow-y-auto">
                <div className="scale-[0.6] origin-top-left w-[166%]">
                  {renderTemplate("modern", { ...previewProps, content: { ...previewProps.content, tagline: "A place to belong", about: "We are a welcoming church family serving our community with love." } })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Globe className="w-7 h-7 text-primary" /> Church Website</h1>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                {publicUrl} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={(v) => handleSave(v)} />
              <Label>Published</Label>
            </div>
            <Button onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Template</CardTitle></CardHeader>
              <CardContent>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} — {t.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Content</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="basic">
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="social">Social</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-3">
                    <div><Label>Tagline</Label><Input value={content.tagline || ""} onChange={(e) => updateContent({ tagline: e.target.value })} placeholder="A place to belong" /></div>
                    <div><Label>About / Welcome</Label><Textarea rows={6} value={content.about || ""} onChange={(e) => updateContent({ about: e.target.value })} /></div>
                    <div>
                      <Label>Hero image URL (Modern template)</Label>
                      <div className="flex gap-2">
                        <Input value={content.hero_image_url || ""} onChange={(e) => updateContent({ hero_image_url: e.target.value })} placeholder="https://..." />
                        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="shrink-0 gap-1">
                          <ImageIcon className="w-4 h-4" /> Pick
                        </Button>
                      </div>
                      {content.hero_image_url && (
                        <div className="mt-2 aspect-video w-full rounded border overflow-hidden bg-muted">
                          <img src={content.hero_image_url} alt="Hero preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Footer text</Label>
                      <Input
                        value={content.footer_text || ""}
                        onChange={(e) => updateContent({ footer_text: e.target.value })}
                        placeholder="e.g. All are welcome — or your own tagline"
                        maxLength={120}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Replaces the default footer message ("Made with love"). Leave blank to keep the template default.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="services" className="space-y-3">
                    {(content.service_times || []).map((s, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div><Label>Day</Label><Input value={s.day} onChange={(e) => updateService(i, { day: e.target.value })} /></div>
                        <div><Label>Time</Label><Input value={s.time} onChange={(e) => updateService(i, { time: e.target.value })} /></div>
                        <div><Label>Title</Label><Input value={s.title || ""} onChange={(e) => updateService(i, { title: e.target.value })} /></div>
                        <Button variant="ghost" size="icon" onClick={() => removeService(i)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addService}><Plus className="w-4 h-4 mr-1" /> Add service</Button>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-3">
                    <div><Label>Address</Label><Input value={content.address || ""} onChange={(e) => updateContent({ address: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={content.phone || ""} onChange={(e) => updateContent({ phone: e.target.value })} /></div>
                    <div><Label>Email</Label><Input value={content.email || ""} onChange={(e) => updateContent({ email: e.target.value })} /></div>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-3">
                    <div><Label>Facebook URL</Label><Input value={content.social?.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} /></div>
                    <div><Label>Instagram URL</Label><Input value={content.social?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} /></div>
                    <div><Label>YouTube URL</Label><Input value={content.social?.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} /></div>
                    <div><Label>WhatsApp link (https://wa.me/…)</Label><Input value={content.social?.whatsapp || ""} onChange={(e) => updateSocial("whatsapp", e.target.value)} /></div>
                  </TabsContent>

                  <TabsContent value="media" className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Upload hero images, service photos, contact media, and gallery pictures. Images tagged <strong>gallery</strong> appear on your public site automatically.
                    </p>
                    {tenantId && (
                      <MediaLibrary
                        tenantId={tenantId}
                        onPick={(item) => {
                          if (item.public_url) {
                            updateContent({ hero_image_url: item.public_url });
                            toast.success("Hero image updated");
                          }
                        }}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded overflow-hidden max-h-[700px] overflow-y-auto">
                <div className="scale-[0.6] origin-top-left w-[166%]">
                  {renderTemplate(template, previewProps)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pick a hero image</DialogTitle>
            </DialogHeader>
            {tenantId && (
              <MediaLibrary
                tenantId={tenantId}
                categories={["hero", "gallery", "other"]}
                onPick={(item) => {
                  if (item.public_url) {
                    updateContent({ hero_image_url: item.public_url });
                    setPickerOpen(false);
                    toast.success("Hero image set");
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
