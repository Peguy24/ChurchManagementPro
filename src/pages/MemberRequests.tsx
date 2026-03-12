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
import { todayInputValue } from "@/lib/date";
import QRCodeLib from "qrcode";


export default function MemberRequests() {
  const { t, language } = useLanguage();
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

  const publishedOrigin = "https://churchmanagementpro.com";
  const joinUrl = `${publishedOrigin}/join/${tenantId}`;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

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
        .select("*, desired_ministry:ministries!member_requests_desired_ministry_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      const address = request.address || {};
      const { data: memberData, error: memberError } = await supabase.from("members").insert({
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
        join_date: todayInputValue(),
      }).select("id").single();

      if (memberError) throw memberError;

      // If member requested a ministry, add them to it
      if (request.desired_ministry_id && memberData?.id) {
        await supabase.from("ministry_members").insert({
          ministry_id: request.desired_ministry_id,
          member_id: memberData.id,
          role: "member",
          tenant_id: request.tenant_id,
        });
      }

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
    onSuccess: async (_, request) => {
      // Send welcome email if the member has an email
      if (request.email) {
        try {
          // Get tenant name
          let tenantName = "Church Manager Pro";
          if (request.tenant_id) {
            const { data: tenantData } = await supabase
              .from("tenants")
              .select("name")
              .eq("id", request.tenant_id)
              .maybeSingle();
            if (tenantData?.name) tenantName = tenantData.name;
          }

          await supabase.functions.invoke("send-member-approved", {
            body: {
              firstName: request.first_name,
              lastName: request.last_name,
              email: request.email,
              tenantName,
              language,
            },
          });
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }
      toast({ title: t("memberRequests.success"), description: t("memberRequests.approvedSuccess") });
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setDetailOpen(false);
    },
    onError: (error: any) => {
      toast({ title: t("memberRequests.error"), description: error.message, variant: "destructive" });
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
      toast({ title: t("memberRequests.rejectedSuccess") });
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      setRejectOpen(false);
      setDetailOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: t("memberRequests.error"), description: error.message, variant: "destructive" });
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

  const getStatusLabel = (status: string) => {
    const key = `memberRequests.${status}` as string;
    return t(key);
  };

  const getGenderLabel = (gender: string | null) => {
    if (gender === "M") return t("memberRequests.male");
    if (gender === "F") return t("memberRequests.female");
    return "-";
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-7 w-7 text-primary" />
              {t("memberRequests.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("memberRequests.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              toast({ title: t("memberRequests.linkCopied") });
            }}>
              <Copy className="h-4 w-4 mr-2" />
              {t("memberRequests.copyLink")}
            </Button>
            <Button variant="outline" size="sm" onClick={generateQrCode}>
              <QrCode className="h-4 w-4 mr-2" />
              {t("memberRequests.qrCode")}
            </Button>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800 font-medium">
              {t("memberRequests.pendingCount").replace("{count}", String(pendingCount))}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("memberRequests.receivedRequests")}</CardTitle>
            <CardDescription>{t("memberRequests.totalRequests").replace("{count}", String(requests.length))}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("memberRequests.searchPlaceholder")}
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
                {t("memberRequests.noRequests")}
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("memberRequests.name")}</TableHead>
                        <TableHead>{t("memberRequests.email")}</TableHead>
                        <TableHead>{t("memberRequests.phone")}</TableHead>
                        <TableHead>{t("memberRequests.status")}</TableHead>
                        <TableHead>{t("memberRequests.date")}</TableHead>
                        <TableHead className="text-right">{t("memberRequests.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req: any) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.last_name} {req.first_name}</TableCell>
                          <TableCell>{req.email || "-"}</TableCell>
                          <TableCell>{req.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[req.status]}>{getStatusLabel(req.status)}</Badge>
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
                        <Badge variant="outline" className={statusColors[req.status]}>{getStatusLabel(req.status)}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedRequest(req); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> {t("memberRequests.details")}
                        </Button>
                        {req.status === "pending" && (
                          <>
                            <Button size="sm" className="flex-1" onClick={() => approveMutation.mutate(req)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> {t("memberRequests.approve")}
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
            <DialogTitle>{t("memberRequests.requestDetails")}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-medium">{t("memberRequests.lastName")}:</span> {selectedRequest.last_name}</div>
                <div><span className="font-medium">{t("memberRequests.firstName")}:</span> {selectedRequest.first_name}</div>
                <div><span className="font-medium">{t("memberRequests.gender")}:</span> {getGenderLabel(selectedRequest.gender)}</div>
                <div><span className="font-medium">{t("memberRequests.birthDate")}:</span> {selectedRequest.date_of_birth || "-"}</div>
                <div><span className="font-medium">{t("memberRequests.phone")}:</span> {selectedRequest.phone || "-"}</div>
                <div><span className="font-medium">{t("memberRequests.email")}:</span> {selectedRequest.email || "-"}</div>
                <div><span className="font-medium">{t("memberRequests.emergencyPhone")}:</span> {selectedRequest.emergency_phone || "-"}</div>
                <div className="col-span-2"><span className="font-medium">{t("memberRequests.address")}:</span> {formatAddress(selectedRequest.address)}</div>
              </div>
              {(selectedRequest.academic_formation || selectedRequest.professional_formation) && (
                <div>
                  <h4 className="font-semibold mb-1">{t("memberRequests.formation")}</h4>
                  {selectedRequest.academic_formation && <p><span className="font-medium">{t("memberRequests.academic")}:</span> {selectedRequest.academic_formation}</p>}
                  {selectedRequest.professional_formation && <p><span className="font-medium">{t("memberRequests.professional")}:</span> {selectedRequest.professional_formation}</p>}
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-1">{t("memberRequests.spiritualInfo")}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{t("memberRequests.baptism")}:</span> {selectedRequest.baptism_status || "-"}</div>
                  <div><span className="font-medium">{t("memberRequests.baptismDate")}:</span> {selectedRequest.baptism_date || "-"}</div>
                  <div><span className="font-medium">{t("memberRequests.originChurch")}:</span> {selectedRequest.origin_church || "-"}</div>
                  <div><span className="font-medium">{t("memberRequests.conversion")}:</span> {selectedRequest.conversion_date || "-"}</div>
                </div>
                {selectedRequest.christian_experience && <p className="mt-1"><span className="font-medium">{t("memberRequests.experience")}:</span> {selectedRequest.christian_experience}</p>}
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t("memberRequests.family")}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{t("memberRequests.maritalStatus")}:</span> {selectedRequest.marital_status || "-"}</div>
                  <div><span className="font-medium">{t("memberRequests.spouse")}:</span> {selectedRequest.spouse_name || "-"}</div>
                  <div><span className="font-medium">{t("memberRequests.children")}:</span> {selectedRequest.number_of_children || 0}</div>
                </div>
                {selectedRequest.children_names && <p><span className="font-medium">{t("memberRequests.childrenNames")}:</span> {selectedRequest.children_names}</p>}
              </div>
              {selectedRequest.message && (
                <div><h4 className="font-semibold mb-1">{t("memberRequests.message")}</h4><p>{selectedRequest.message}</p></div>
              )}
              {selectedRequest.rejection_reason && (
                <div className="bg-red-50 p-3 rounded"><h4 className="font-semibold text-red-700 mb-1">{t("memberRequests.rejectionReason")}</h4><p className="text-red-600">{selectedRequest.rejection_reason}</p></div>
              )}
            </div>
          )}
          {selectedRequest?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => { setRejectOpen(true); }}>
                <XCircle className="h-4 w-4 mr-2" /> {t("memberRequests.reject")}
              </Button>
              <Button onClick={() => approveMutation.mutate(selectedRequest)} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {t("memberRequests.approveAsMember")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memberRequests.rejectRequest")}</DialogTitle>
            <DialogDescription>{t("memberRequests.rejectReasonDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("memberRequests.rejectReasonLabel")}</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder={t("memberRequests.rejectReasonPlaceholder")} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t("memberRequests.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => selectedRequest && rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason })}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("memberRequests.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{t("memberRequests.qrTitle")}</DialogTitle>
            <DialogDescription>{t("memberRequests.qrDescription")}</DialogDescription>
          </DialogHeader>
          {qrCodeUrl && (
            <div className="space-y-4">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-lg" />
              <p className="text-xs text-muted-foreground break-all">{joinUrl}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(joinUrl);
                  toast({ title: t("memberRequests.linkCopied") });
                }}>
                  <Copy className="h-4 w-4 mr-2" /> {t("memberRequests.copyLink")}
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={qrCodeUrl} download="qr-code-membership.png">{t("memberRequests.download")}</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
