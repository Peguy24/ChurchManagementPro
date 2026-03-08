import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Megaphone, Trash2, Edit, Power } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

export default function AnnouncementBanners() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", message: "", banner_type: "info", priority: "normal", ends_at: "" });

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcement_banners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveBanner = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        message: form.message,
        banner_type: form.banner_type,
        priority: form.priority,
        ends_at: form.ends_at || null,
      };
      if (editing) {
        const { error } = await supabase.from("platform_announcement_banners").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_announcement_banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(editing ? t("superAdmin.banners.updated") : t("superAdmin.banners.created"));
      setDialogOpen(false);
      setEditing(null);
      setForm({ title: "", message: "", banner_type: "info", priority: "normal", ends_at: "" });
    },
    onError: () => toast.error(t("common.error")),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("platform_announcement_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_announcement_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(t("superAdmin.banners.deleted"));
    },
  });

  const openEdit = (banner: any) => {
    setEditing(banner);
    setForm({
      title: banner.title,
      message: banner.message,
      banner_type: banner.banner_type,
      priority: banner.priority,
      ends_at: banner.ends_at ? banner.ends_at.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const typeColors: Record<string, string> = {
    info: "bg-sky-100 text-sky-800",
    warning: "bg-amber-100 text-amber-800",
    critical: "bg-red-100 text-red-800",
    update: "bg-primary/20 text-primary",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Megaphone className="h-7 w-7" />
              {t("superAdmin.banners.title")}
            </h1>
            <p className="text-muted-foreground">{t("superAdmin.banners.subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm({ title: "", message: "", banner_type: "info", priority: "normal", ends_at: "" })}>
                <Plus className="mr-2 h-4 w-4" /> {t("superAdmin.banners.add")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t("superAdmin.banners.edit") : t("superAdmin.banners.add")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("superAdmin.banners.titleLabel")}</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>{t("superAdmin.banners.messageLabel")}</Label>
                  <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("superAdmin.banners.type")}</Label>
                    <Select value={form.banner_type} onValueChange={v => setForm({ ...form, banner_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("superAdmin.banners.priority")}</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t("superAdmin.banners.endsAt")}</Label>
                  <Input type="date" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
                </div>
                <Button onClick={() => saveBanner.mutate()} disabled={!form.title || !form.message || saveBanner.isPending} className="w-full">
                  {editing ? t("common.save") : t("superAdmin.banners.add")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("superAdmin.banners.titleLabel")}</TableHead>
                  <TableHead>{t("superAdmin.banners.type")}</TableHead>
                  <TableHead>{t("superAdmin.banners.status")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(banners || []).map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{b.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[b.banner_type] || typeColors.info}>{b.banner_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={b.is_active}
                        onCheckedChange={(checked) => toggleBanner.mutate({ id: b.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(b.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBanner.mutate(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!banners?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t("superAdmin.banners.noBanners")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
