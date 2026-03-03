import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import EventQRCode from "@/components/EventQRCode";
import { useToast } from "@/hooks/use-toast";

export default function EventRegistrations() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["event-registrations", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
    },
  });

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      registered: "bg-blue-100 text-blue-800",
      checked_in: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      registered: t("eventRegistration.statusRegistered"),
      checked_in: t("eventRegistration.statusCheckedIn"),
      cancelled: t("eventRegistration.statusCancelled"),
    };
    return (
      <Badge className={variants[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  const exportCSV = () => {
    if (!registrations.length) return;
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Statut", "Date"];
    const rows = registrations.map((r: any) => [
      r.first_name,
      r.last_name,
      r.email || "",
      r.phone || "",
      r.status,
      new Date(r.registered_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{event?.name || t("eventRegistration.registrations")}</h1>
            <p className="text-sm text-muted-foreground">{t("eventRegistration.registrationsList")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{registrations.length}</span>
          </div>
        </div>

        {/* QR Code section */}
        {eventId && (
          <EventQRCode eventId={eventId} />
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!registrations.length}>
            <Download className="h-4 w-4 mr-2" />
            {t("eventRegistration.export")}
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("eventRegistration.noRegistrations")}
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("eventRegistration.firstName")}</TableHead>
                  <TableHead>{t("eventRegistration.lastName")}</TableHead>
                  <TableHead>{t("eventRegistration.email")}</TableHead>
                  <TableHead>{t("eventRegistration.phone")}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t("eventRegistration.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg: any) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.first_name}</TableCell>
                    <TableCell>{reg.last_name}</TableCell>
                    <TableCell>{reg.email || "—"}</TableCell>
                    <TableCell>{reg.phone || "—"}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          const next = reg.status === "registered" ? "checked_in" : reg.status === "checked_in" ? "cancelled" : "registered";
                          updateStatusMutation.mutate({ id: reg.id, status: next });
                        }}
                        className="cursor-pointer"
                      >
                        {statusBadge(reg.status)}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
