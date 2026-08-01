import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignedAvatar } from "@/components/SignedAvatar";
import CameraCapture from "@/components/CameraCapture";
import PhotoCropper from "@/components/PhotoCropper";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Camera, Check, Link2, Search, X, ImageIcon } from "lucide-react";

const localT: Record<Language, Record<string, string>> = {
  fr: {
    title: "Studio photo",
    desc: "Prenez les photos des membres pour leurs badges, ou approuvez celles envoyées par les membres.",
    capture: "Prise de photo",
    pending: "En attente d'approbation",
    search: "Rechercher un membre...",
    take: "Photographier",
    retake: "Reprendre",
    hasPhoto: "Photo",
    noPhoto: "Sans photo",
    copyLink: "Lien d'envoi",
    linkCopied: "Lien copié",
    linkCopiedDesc: "Envoyez ce lien au membre. Il expire dans 7 jours.",
    saved: "Photo enregistrée",
    savedDesc: "La photo du membre a été mise à jour.",
    error: "Erreur",
    approve: "Approuver",
    reject: "Rejeter",
    approved: "Photo approuvée",
    rejected: "Photo rejetée",
    noPending: "Aucune photo en attente.",
    noResults: "Aucun membre trouvé.",
    onlyNoPhoto: "Sans photo uniquement",
  },
  en: {
    title: "Photo booth",
    desc: "Capture member photos for their badges, or approve photos members sent in.",
    capture: "Capture",
    pending: "Pending approval",
    search: "Search a member...",
    take: "Take photo",
    retake: "Retake",
    hasPhoto: "Photo",
    noPhoto: "No photo",
    copyLink: "Upload link",
    linkCopied: "Link copied",
    linkCopiedDesc: "Send this link to the member. It expires in 7 days.",
    saved: "Photo saved",
    savedDesc: "The member photo was updated.",
    error: "Error",
    approve: "Approve",
    reject: "Reject",
    approved: "Photo approved",
    rejected: "Photo rejected",
    noPending: "No photo waiting for approval.",
    noResults: "No member found.",
    onlyNoPhoto: "Missing photo only",
  },
  ht: {
    title: "Estidyo foto",
    desc: "Pran foto manm yo pou badj yo, oswa apwouve foto manm yo voye.",
    capture: "Pran foto",
    pending: "Ap tann apwobasyon",
    search: "Chèche yon manm...",
    take: "Pran foto",
    retake: "Reprann",
    hasPhoto: "Foto",
    noPhoto: "San foto",
    copyLink: "Lyen pou voye",
    linkCopied: "Lyen kopye",
    linkCopiedDesc: "Voye lyen sa a bay manm nan. Li ekspire nan 7 jou.",
    saved: "Foto anrejistre",
    savedDesc: "Foto manm nan mete ajou.",
    error: "Erè",
    approve: "Apwouve",
    reject: "Rejte",
    approved: "Foto apwouve",
    rejected: "Foto rejte",
    noPending: "Pa gen foto k ap tann.",
    noResults: "Pa jwenn manm.",
    onlyNoPhoto: "Sèlman san foto",
  },
};

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  member_number: string | null;
  photo_url: string | null;
  pending_photo_url: string | null;
  pending_photo_at: string | null;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function PhotoBooth() {
  const { language } = useLanguage();
  const lt = localT[language] ?? localT.en;
  const { toast } = useToast();
  const { tenantId } = useCurrentTenant();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [activeMember, setActiveMember] = useState<MemberRow | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  const fetchMembers = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await (supabase.from("members") as any)
      .select(
        "id, first_name, last_name, member_number, photo_url, pending_photo_url, pending_photo_at"
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("last_name", { ascending: true });

    if (error) {
      toast({ title: lt.error, description: error.message, variant: "destructive" });
    } else {
      setMembers((data as MemberRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (onlyMissing && m.photo_url) return false;
      if (!q) return true;
      return (
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.member_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, search, onlyMissing]);

  const pending = useMemo(
    () => members.filter((m) => !!m.pending_photo_url),
    [members]
  );

  const saveCropped = async (blob: Blob) => {
    if (!activeMember) return;
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const path = `${activeMember.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("member-photos")
        .upload(path, blob, { upsert: true, contentType: blob.type });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("members")
        .update({ photo_url: path })
        .eq("id", activeMember.id);
      if (error) throw error;

      toast({ title: lt.saved, description: lt.savedDesc });
      setActiveMember(null);
      fetchMembers();
    } catch (e: any) {
      toast({ title: lt.error, description: e.message, variant: "destructive" });
    }
  };

  const createLink = async (member: MemberRow) => {
    if (!tenantId) return;
    const token = randomToken();
    const { error } = await supabase.from("member_photo_links").insert({
      tenant_id: tenantId,
      member_id: member.id,
      token,
    });
    if (error) {
      toast({ title: lt.error, description: error.message, variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/member-photo/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked; the toast still shows the link */
    }
    toast({ title: lt.linkCopied, description: `${lt.linkCopiedDesc}\n${url}` });
  };

  const approvePending = async (member: MemberRow) => {
    if (!member.pending_photo_url) return;
    try {
      const ext = member.pending_photo_url.endsWith(".png") ? "png" : "jpg";
      const dest = `${member.id}.${ext}`;
      const { data: file, error: dlErr } = await supabase.storage
        .from("member-photos")
        .download(member.pending_photo_url);
      if (dlErr) throw dlErr;

      const { error: upErr } = await supabase.storage
        .from("member-photos")
        .upload(dest, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("members")
        .update({
          photo_url: dest,
          pending_photo_url: null,
          pending_photo_at: null,
        })
        .eq("id", member.id);
      if (error) throw error;

      await supabase.storage.from("member-photos").remove([member.pending_photo_url]);
      toast({ title: lt.approved });
      fetchMembers();
    } catch (e: any) {
      toast({ title: lt.error, description: e.message, variant: "destructive" });
    }
  };

  const rejectPending = async (member: MemberRow) => {
    if (!member.pending_photo_url) return;
    await supabase.storage.from("member-photos").remove([member.pending_photo_url]);
    const { error } = await supabase
      .from("members")
      .update({ pending_photo_url: null, pending_photo_at: null })
      .eq("id", member.id);
    if (error) {
      toast({ title: lt.error, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: lt.rejected });
    fetchMembers();
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <PageHeader icon={Camera} title={lt.title} description={lt.desc} />

        <Tabs defaultValue="capture" className="space-y-4">
          <TabsList>
            <TabsTrigger value="capture">{lt.capture}</TabsTrigger>
            <TabsTrigger value="pending">
              {lt.pending}
              {pending.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lt.search}
                  className="pl-9"
                />
              </div>
              <Button
                variant={onlyMissing ? "default" : "outline"}
                onClick={() => setOnlyMissing((v) => !v)}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {lt.onlyNoPhoto}
              </Button>
            </div>

            {!loading && filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {lt.noResults}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <SignedAvatar
                      storedUrl={m.photo_url}
                      bucket="member-photos"
                      fallbackText={`${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}`}
                      className="h-12 w-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.member_number || (m.photo_url ? lt.hasPhoto : lt.noPhoto)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveMember(m);
                          setCameraOpen(true);
                        }}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {lt.take}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title={lt.copyLink}
                        onClick={() => createLink(m)}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {lt.copyLink}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {lt.noPending}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <SignedAvatar
                        storedUrl={m.pending_photo_url}
                        bucket="member-photos"
                        fallbackText={`${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}`}
                        className="h-14 w-14"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.pending_photo_at
                            ? new Date(m.pending_photo_at).toLocaleString()
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" onClick={() => approvePending(m)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectPending(m)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={(o) => {
          setCameraOpen(o);
          if (!o && !cropperOpen) setActiveMember(null);
        }}
        title={
          activeMember
            ? `${lt.take} — ${activeMember.first_name} ${activeMember.last_name}`
            : lt.take
        }
        onCapture={(file) => {
          setCropFile(file);
          setCropperOpen(true);
        }}
      />

      {cropFile && (
        <PhotoCropper
          open={cropperOpen}
          onOpenChange={(o) => {
            setCropperOpen(o);
            if (!o) setCropFile(null);
          }}
          imageFile={cropFile}
          onCropComplete={saveCropped}
        />
      )}
    </Layout>
  );
}
