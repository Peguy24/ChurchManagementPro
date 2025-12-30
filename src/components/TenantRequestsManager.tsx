import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Mail, Clock, Building2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TenantRequest {
  id: string;
  church_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  requested_plan: string;
  message: string | null;
  status: string;
  created_at: string;
}

const PLAN_LABELS: Record<string, string> = {
  basic: "Essentiel",
  standard: "Professionnel",
  premium: "Entreprise",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Approuvé", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
};

export function TenantRequestsManager() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["tenant-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: TenantRequest) => {
      // Create the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: request.church_name,
          slug: request.church_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          contact_email: request.contact_email,
          contact_phone: request.contact_phone,
          address: request.address,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create subscription based on plan
      const planConfig: Record<string, { price: number; members: number; branches: number; users: number; storage: number }> = {
        basic: { price: 49, members: 200, branches: 1, users: 3, storage: 500 },
        standard: { price: 99, members: 1000, branches: 3, users: 10, storage: 2000 },
        premium: { price: 199, members: -1, branches: -1, users: -1, storage: -1 },
      };

      const config = planConfig[request.requested_plan] || planConfig.basic;

      const { error: subError } = await supabase
        .from("tenant_subscriptions")
        .insert({
          tenant_id: tenant.id,
          plan: request.requested_plan as any,
          status: "trial",
          price_monthly: config.price,
          max_members: config.members,
          max_branches: config.branches,
          max_users: config.users,
          max_storage_mb: config.storage,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subError) throw subError;

      // Update request status
      const { error: updateError } = await supabase
        .from("tenant_requests")
        .update({ 
          status: "approved", 
          created_tenant_id: tenant.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Send admin invite
      try {
        await supabase.functions.invoke('send-admin-invite', {
          body: {
            email: request.contact_email,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
          },
        });
      } catch (inviteErr) {
        console.error('Failed to send admin invite:', inviteErr);
      }

      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Demande approuvée! Tenant créé et invitation envoyée.");
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("tenant_requests")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      toast.success("Demande refusée");
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
      setProcessingId(null);
    },
  });

  const handleApprove = (request: TenantRequest) => {
    if (confirm(`Approuver la demande de "${request.church_name}" et créer le tenant ?`)) {
      setProcessingId(request.id);
      approveMutation.mutate(request);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm("Êtes-vous sûr de vouloir refuser cette demande ?")) {
      setProcessingId(requestId);
      rejectMutation.mutate(requestId);
    }
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Demandes d'inscription
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} en attente</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Demandes reçues depuis le formulaire de la page commerciale
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests && requests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Église</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Plan souhaité</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.church_name}</p>
                      {request.address && (
                        <p className="text-sm text-muted-foreground">{request.address}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.contact_name}</p>
                      <p className="text-sm text-muted-foreground">{request.contact_email}</p>
                      {request.contact_phone && (
                        <p className="text-sm text-muted-foreground">{request.contact_phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PLAN_LABELS[request.requested_plan] || request.requested_plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm max-w-[200px] truncate">
                      {request.message || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[request.status]?.variant || "outline"}>
                      {STATUS_CONFIG[request.status]?.label || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(request)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReject(request.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {request.status === "approved" ? "Traité" : "Refusé"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune demande d'inscription</p>
            <p className="text-sm">Les demandes depuis la page commerciale apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
