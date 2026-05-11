import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, Search, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  language: string;
  status: "new" | "handled" | string;
  ip_address: string | null;
  user_agent: string | null;
  handled_at: string | null;
  handled_notes: string | null;
  created_at: string;
};

type Filter = "all" | "new" | "handled";

export default function ContactMessages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("new");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessages((data ?? []) as ContactMessage[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [messages, search, filter]);

  const counts = useMemo(() => ({
    all: messages.length,
    new: messages.filter((m) => m.status === "new").length,
    handled: messages.filter((m) => m.status === "handled").length,
  }), [messages]);

  const openMessage = (m: ContactMessage) => {
    setSelected(m);
    setNotes(m.handled_notes ?? "");
  };

  const markHandled = async (handled: boolean) => {
    if (!selected) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const update = handled
      ? {
          status: "handled",
          handled_at: new Date().toISOString(),
          handled_by: userData.user?.id ?? null,
          handled_notes: notes.trim() || null,
        }
      : {
          status: "new",
          handled_at: null,
          handled_by: null,
          handled_notes: notes.trim() || null,
        };
    const { error } = await supabase
      .from("contact_messages")
      .update(update)
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: handled ? "Marked as handled" : "Reopened" });
    setSelected(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message permanently?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    setSelected(null);
    load();
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contact Messages</h1>
            <p className="text-sm text-muted-foreground">
              Public contact form submissions from the website.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList>
                  <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
                  <TabsTrigger value="handled">Handled ({counts.handled})</TabsTrigger>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, message..."
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
              <p className="text-sm text-muted-foreground py-8 text-center">
                No messages found.
              </p>
            ) : (
              <div className="divide-y border rounded-md">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => openMessage(m)}
                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{m.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          &lt;{m.email}&gt;
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={m.status === "handled" ? "secondary" : "default"}>
                          {m.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(m.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {m.message}
                    </p>
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
            <DialogTitle>Message from {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-primary underline break-all">
                    {selected.email}
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground">Received</p>
                  <p>{format(new Date(selected.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Language</p>
                  <p>{selected.language}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selected.status === "handled" ? "secondary" : "default"}>
                    {selected.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Message</p>
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Internal notes</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about how this was handled..."
                  rows={3}
                />
              </div>

              {selected.handled_at && (
                <p className="text-xs text-muted-foreground">
                  Handled {format(new Date(selected.handled_at), "PPpp")}
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
              {selected?.status === "handled" ? (
                <Button variant="outline" onClick={() => markHandled(false)} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reopen
                </Button>
              ) : (
                <Button onClick={() => markHandled(true)} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark as handled
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
