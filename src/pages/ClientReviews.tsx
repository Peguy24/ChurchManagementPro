import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Star, Search, Check, X, Trash2, MessageSquareQuote, RotateCcw } from "lucide-react";

type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  church_name: string;
  city: string | null;
  country: string | null;
  rating: number;
  text: string;
  language: string;
  status: "pending" | "approved" | "rejected" | string;
  moderation_notes: string | null;
  moderated_at: string | null;
  created_at: string;
};

type Filter = "pending" | "approved" | "rejected" | "all";

export default function ClientReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<Review | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setReviews((data ?? []) as Review[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("client-reviews-mod")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_reviews" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.reviewer_name.toLowerCase().includes(q) ||
        r.church_name.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q)
      );
    });
  }, [reviews, search, filter]);

  const counts = useMemo(
    () => ({
      all: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
    }),
    [reviews],
  );

  const open = (r: Review) => {
    setSelected(r);
    setNotes(r.moderation_notes ?? "");
  };

  const moderate = async (status: "approved" | "rejected" | "pending") => {
    if (!selected) return;
    if (status === "rejected" && notes.trim().length < 3) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("client_reviews")
      .update({
        status,
        moderation_notes: notes.trim() || null,
        moderated_by: userData.user?.id ?? null,
        moderated_at: status === "pending" ? null : new Date().toISOString(),
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title:
        status === "approved" ? "Review approved" : status === "rejected" ? "Review rejected" : "Review reopened",
    });
    setSelected(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("client_reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    setSelected(null);
    load();
  };

  const Stars = ({ n }: { n: number }) => (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <MessageSquareQuote className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Client Reviews</h1>
            <p className="text-sm text-muted-foreground">
              Moderate verified testimonials before they appear on the public commercial page.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList>
                  <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                  <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, church, text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No reviews found.</p>
            ) : (
              <div className="divide-y border rounded-md">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => open(r)}
                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{r.reviewer_name}</span>
                        <span className="text-xs text-muted-foreground truncate">— {r.church_name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Stars n={r.rating} />
                        <Badge
                          variant={
                            r.status === "approved"
                              ? "default"
                              : r.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.text}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected?.reviewer_name}
              {selected && <Stars n={selected.rating} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p>{selected.reviewer_role || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Church</p>
                  <p>{selected.church_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p>{[selected.city, selected.country].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Language</p>
                  <p className="uppercase">{selected.language}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p>{format(new Date(selected.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selected.status === "approved"
                        ? "default"
                        : selected.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selected.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Review</p>
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap italic">
                  "{selected.text}"
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Moderation notes {selected.status === "pending" && "(required if rejecting)"}
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes / rejection reason shown to author..."
                  rows={3}
                />
              </div>

              {selected.moderated_at && (
                <p className="text-xs text-muted-foreground">
                  Moderated {format(new Date(selected.moderated_at), "PPpp")}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selected && remove(selected.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              {selected?.status !== "pending" && (
                <Button variant="outline" onClick={() => moderate("pending")} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reopen
                </Button>
              )}
              {selected?.status !== "rejected" && (
                <Button variant="destructive" onClick={() => moderate("rejected")} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
              {selected?.status !== "approved" && (
                <Button onClick={() => moderate("approved")} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
