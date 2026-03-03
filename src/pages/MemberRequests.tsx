import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle, XCircle, Eye, QrCode, Copy, Loader2, Clock, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import QRCodeLib from "qrcode";
import { useEffect } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
};

export default function MemberRequests() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { tenantId } = useCurrentTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const joinUrl = `${window.location.origin}/join/${tenantId}`;

  const generateQrCode = async () => {
    try {
      const url = await QRCodeLib.toDataURL(joinUrl, { width: 400, margin: 2 });
      setQrCodeUrl(url);
      setQrDialogOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["member-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Create the member
      const address = request.address || {};
      const { error: memberError } = await supabase.from("members").insert({
        tenant_id: request.tenant_id,
        first_name: request.first_name,
        last_name: request.last_name,
        gender: request.gender,
        date_of_birth: request.date_of_birth,
        phone: request.phone,
        email: request.email,
        emergency_phone: request.emergency_phone,
        address: JSON.stringify(address),
        academic_formation: request.academic_formation,
        professional_formation: request.professional_formation,
        baptism_status: request.baptism_status,
        baptism_date: request.baptism_date,
        origin_church: request.origin_church,
        conversion_date: request.conversion_date,
        christian_experience: request.christian_experience,
        marital_status: request.marital_status,
        spouse_name: request.spouse_name,
        marriage_date: request.marriage_date,
        number_of_children: request.number_of_children,
        children_names: request.children_names,
        status: "active",
        join_date: new Date().toISOString().split("T")[0],
      });
      if (memberError) throw memberError;

      // 2. Update request status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from("member_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "Succès", description: "Membre approuvé et ajouté avec succès!" });
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setDetailOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("member_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Demande rejetée" });
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      setRejectOpen(false);
      setDetailOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredRequests = requests.filter(
    (r: any) =>
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  const formatAddress = (addr: any) => {
    if (!addr || typeof addr !== "object") return "-";
    return [addr.street, addr.number, addr.city, addr.state, addr.country].filter(Boolean).join(", ");
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-7 w-7 text-primary" />
              Demandes d'adhésion
            </h2>
            <p className="text-muted-foreground text-sm">
              Gérez les demandes d'adhésion soumises via le formulaire public
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              toast({ title: "Lien copié!" });
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copier le lien
            </Button>
            <Button variant="outline" size="sm" onClick={generateQrCode}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800 font-medium">
              {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente d'approbation
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Demandes reçues</CardTitle>
            <CardDescription>Total: {requests.length} demandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune demande d'adhésion pour le moment.
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req: any) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.last_name} {req.first_name}</TableCell>
                          <TableCell>{req.email || "-"}</TableCell>
                          <TableCell>{req.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                          </TableCell>
                          <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedRequest(req); setDetailOpen(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {req.status === "pending" && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-green-600" onClick={() => approveMutation.mutate(req)}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedRequest(req); setRejectOpen(true); }}>
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {filteredRequests.map((req: any) => (
                    <div key={req.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{req.last_name} {req.first_name}</p>
                          <p className="text-sm text-muted-foreground">{req.email || req.phone || "-"}</p>
                        </div>
                        <Badge variant="outline" className={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedRequest(req); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> Détails
                        </Button>
                        {req.status === "pending" && (
                          <>
                            <Button size="sm" className="flex-1" onClick={() => approveMutation.mutate(req)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => { setSelectedRequest(req); setRejectOpen(true); }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-medium">Nom:</span> {selectedRequest.last_name}</div>
                <div><span className="font-medium">Prénom:</span> {selectedRequest.first_name}</div>
                <div><span className="font-medium">Genre:</span> {selectedRequest.gender === "M" ? "Masculin" : selectedRequest.gender === "F" ? "Féminin" : "-"}</div>
                <div><span className="font-medium">Naissance:</span> {selectedRequest.date_of_birth || "-"}</div>
                <div><span className="font-medium">Téléphone:</span> {selectedRequest.phone || "-"}</div>
                <div><span className="font-medium">Email:</span> {selectedRequest.email || "-"}</div>
                <div><span className="font-medium">Tél. urgence:</span> {selectedRequest.emergency_phone || "-"}</div>
                <div className="col-span-2"><span className="font-medium">Adresse:</span> {formatAddress(selectedRequest.address)}</div>
              </div>
              {(selectedRequest.academic_formation || selectedRequest.professional_formation) && (
                <div>
                  <h4 className="font-semibold mb-1">Formation</h4>
                  {selectedRequest.academic_formation && <p><span className="font-medium">Académique:</span> {selectedRequest.academic_formation}</p>}
                  {selectedRequest.professional_formation && <p><span className="font-medium">Professionnelle:</span> {selectedRequest.professional_formation}</p>}
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-1">Informations spirituelles</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Baptême:</span> {selectedRequest.baptism_status || "-"}</div>
                  <div><span className="font-medium">Date baptême:</span> {selectedRequest.baptism_date || "-"}</div>
                  <div><span className="font-medium">Église d'origine:</span> {selectedRequest.origin_church || "-"}</div>
                  <div><span className="font-medium">Conversion:</span> {selectedRequest.conversion_date || "-"}</div>
                </div>
                {selectedRequest.christian_experience && <p className="mt-1"><span className="font-medium">Expérience:</span> {selectedRequest.christian_experience}</p>}
              </div>
              <div>
                <h4 className="font-semibold mb-1">Famille</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Statut:</span> {selectedRequest.marital_status || "-"}</div>
                  <div><span className="font-medium">Conjoint:</span> {selectedRequest.spouse_name || "-"}</div>
                  <div><span className="font-medium">Enfants:</span> {selectedRequest.number_of_children || 0}</div>
                </div>
                {selectedRequest.children_names && <p><span className="font-medium">Noms:</span> {selectedRequest.children_names}</p>}
              </div>
              {selectedRequest.message && (
                <div><h4 className="font-semibold mb-1">Message</h4><p>{selectedRequest.message}</p></div>
              )}
              {selectedRequest.rejection_reason && (
                <div className="bg-red-50 p-3 rounded"><h4 className="font-semibold text-red-700 mb-1">Raison du rejet</h4><p className="text-red-600">{selectedRequest.rejection_reason}</p></div>
              )}
            </div>
          )}
          {selectedRequest?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => { setRejectOpen(true); }}>
                <XCircle className="h-4 w-4 mr-2" /> Rejeter
              </Button>
              <Button onClick={() => approveMutation.mutate(selectedRequest)} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approuver comme membre
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>Indiquez la raison du rejet (optionnel)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Raison</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Raison du rejet..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => selectedRequest && rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason })}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>QR Code - Formulaire d'adhésion</DialogTitle>
            <DialogDescription>Scannez ce code pour accéder au formulaire</DialogDescription>
          </DialogHeader>
          {qrCodeUrl && (
            <div className="space-y-4">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-lg" />
              <p className="text-xs text-muted-foreground break-all">{joinUrl}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(joinUrl);
                  toast({ title: "Lien copié!" });
                }}>
                  <Copy className="h-4 w-4 mr-2" /> Copier le lien
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={qrCodeUrl} download="qr-code-adhesion.png">Télécharger</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
