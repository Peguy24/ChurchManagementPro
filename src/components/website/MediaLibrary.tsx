import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Upload, Copy, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export type MediaCategory = "hero" | "service" | "contact" | "gallery" | "logo" | "other";

export interface TenantMediaItem {
  id: string;
  tenant_id: string;
  category: MediaCategory;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  sort_order: number;
  public_url: string | null;
  created_at: string;
}

const BUCKET = "tenant-media";
const MAX_MB = 5;
const CATEGORIES: { value: MediaCategory; label: string }[] = [
  { value: "hero", label: "Hero image" },
  { value: "service", label: "Service photo" },
  { value: "contact", label: "Contact / location" },
  { value: "gallery", label: "Gallery" },
  { value: "logo", label: "Logo" },
  { value: "other", label: "Other" },
];

interface Props {
  tenantId: string;
  /** Optional: restrict the picker to specific categories. */
  categories?: MediaCategory[];
  /** Optional: when defined, shows "Use" buttons that call this callback. */
  onPick?: (item: TenantMediaItem) => void;
}

export default function MediaLibrary({ tenantId, categories, onPick }: Props) {
  const [items, setItems] = useState<TenantMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<MediaCategory>("gallery");
  const [filter, setFilter] = useState<MediaCategory | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const availableCats = categories && categories.length
    ? CATEGORIES.filter((c) => categories.includes(c.value))
    : CATEGORIES;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_media")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as TenantMediaItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Max file size ${MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `${tenantId}/${category}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      // Long-lived signed URL so anon (public site) can display private-bucket images
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(key, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;

      const { data: user } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("tenant_media").insert({
        tenant_id: tenantId,
        category,
        storage_path: key,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        public_url: signed.signedUrl,
        uploaded_by: user.user?.id,
      });
      if (insErr) throw insErr;

      toast.success("Uploaded");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (item: TenantMediaItem) => {
    if (!confirm(`Delete ${item.file_name || "image"}?`)) return;
    const { error: sErr } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
    if (sErr) {
      toast.error(sErr.message);
      return;
    }
    const { error } = await supabase.from("tenant_media").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const updateCaption = async (id: string, caption: string) => {
    const { error } = await supabase.from("tenant_media").update({ caption }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const updateCategory = async (id: string, cat: MediaCategory) => {
    const { error } = await supabase.from("tenant_media").update({ category: cat }).eq("id", id);
    if (error) toast.error(error.message);
    else await load();
  };

  const copyUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = items.filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Category for new upload</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as MediaCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCats.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload image
          </Button>
        </div>
        <div className="ml-auto">
          <Label className="text-xs">Filter</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed rounded-lg">
          <ImageIcon className="w-8 h-8 mb-2 opacity-60" />
          <p>No images yet. Upload your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="group border rounded-lg overflow-hidden bg-card">
              <div className="aspect-video bg-muted relative">
                {item.public_url ? (
                  <img
                    src={item.public_url}
                    alt={item.caption || item.file_name || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.public_url && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => copyUrl(item.public_url!, item.id)}
                      title="Copy URL"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() => handleDelete(item)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-2 space-y-1.5">
                <Select
                  value={item.category}
                  onValueChange={(v) => updateCategory(item.id, v as MediaCategory)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Caption (optional)"
                  defaultValue={item.caption || ""}
                  className="h-7 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== (item.caption || "")) {
                      updateCaption(item.id, e.target.value);
                    }
                  }}
                />
                {onPick && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                    onClick={() => onPick(item)}
                  >
                    Use
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
