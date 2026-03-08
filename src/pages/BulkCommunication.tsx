import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Megaphone, Clock, Users, AlertTriangle, Wrench, Rocket, Package, Mail } from "lucide-react";
import { format } from "date-fns";

export default function BulkCommunication() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState("general");
  const [priority, setPriority] = useState("normal");

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-bulk-announcement", {
        body: { title, message, announcementType, priority },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: t("superAdmin.communication.sent"),
        description: `${t("superAdmin.communication.sentTo")} ${data.recipientCount} ${t("superAdmin.communication.recipients")}`,
      });
      setTitle("");
      setMessage("");
      setAnnouncementType("general");
      setPriority("normal");
      queryClient.invalidateQueries({ queryKey: ["platform-announcements"] });
    },
    onError: () => {
      toast({
        title: t("superAdmin.communication.sendError"),
        variant: "destructive",
      });
    },
  });

  const typeIcon = (type: string) => {
    switch (type) {
      case "maintenance": return <Wrench className="h-4 w-4" />;
      case "new_feature": return <Rocket className="h-4 w-4" />;
      case "update": return <Package className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case "critical": return <Badge variant="destructive">Critical</Badge>;
      case "high": return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      default: return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("superAdmin.communication.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("superAdmin.communication.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Compose */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t("superAdmin.communication.compose")}
              </CardTitle>
              <CardDescription>{t("superAdmin.communication.composeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("superAdmin.communication.type")}</label>
                  <Select value={announcementType} onValueChange={setAnnouncementType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t("superAdmin.communication.typeGeneral")}</SelectItem>
                      <SelectItem value="update">{t("superAdmin.communication.typeUpdate")}</SelectItem>
                      <SelectItem value="new_feature">{t("superAdmin.communication.typeFeature")}</SelectItem>
                      <SelectItem value="maintenance">{t("superAdmin.communication.typeMaintenance")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("superAdmin.communication.priority")}</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">{t("superAdmin.communication.priorityHigh")}</SelectItem>
                      <SelectItem value="critical">{t("superAdmin.communication.priorityCritical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("superAdmin.communication.titleLabel")}</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("superAdmin.communication.titlePlaceholder")}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("superAdmin.communication.messageLabel")}</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("superAdmin.communication.messagePlaceholder")}
                  rows={6}
                  maxLength={5000}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => sendMutation.mutate()}
                disabled={!title.trim() || !message.trim() || sendMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                {sendMutation.isPending
                  ? t("superAdmin.communication.sending")
                  : t("superAdmin.communication.sendAll")}
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("superAdmin.communication.history")}
              </CardTitle>
              <CardDescription>{t("superAdmin.communication.historyDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">{t("superAdmin.communication.loading")}</p>
              ) : !announcements?.length ? (
                <p className="text-muted-foreground text-sm">{t("superAdmin.communication.noHistory")}</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {announcements.map((a: any) => (
                    <div key={a.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {typeIcon(a.announcement_type)}
                          <span className="font-medium text-sm truncate">{a.title}</span>
                        </div>
                        {priorityBadge(a.priority)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {a.recipient_count} {t("superAdmin.communication.recipients")}
                        </span>
                        <span>{a.sent_at ? format(new Date(a.sent_at), "PPp") : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
