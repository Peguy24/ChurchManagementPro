import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function MinistryDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ministryId = searchParams.get("ministryId");

  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: ministry, refetch: refetchMinistry } = useQuery({
    queryKey: ["ministry", ministryId],
    queryFn: async () => {
      if (!ministryId) return null;
      const { data, error } = await supabase
        .from("ministries")
        .select(`
          *,
          leader:members!ministries_leader_id_fkey(first_name, last_name)
        `)
        .eq("id", ministryId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  const { data: ministryMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ["ministry-members", ministryId],
    queryFn: async () => {
      if (!ministryId) return [];
      const { data, error } = await supabase
        .from("ministry_members")
        .select(`
          *,
          member:members(id, first_name, last_name, email, phone, photo_url)
        `)
        .eq("ministry_id", ministryId)
        .order("joined_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  const { data: availableMembers = [] } = useQuery({
    queryKey: ["available-members", ministryId],
    queryFn: async () => {
      if (!ministryId) return [];
      
      // Get current ministry member IDs
      const { data: currentMembers } = await supabase
        .from("ministry_members")
        .select("member_id")
        .eq("ministry_id", ministryId);
      
      const currentMemberIds = currentMembers?.map(m => m.member_id) || [];
      
      // Get all active members not in this ministry
      let query = supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");
      
      if (currentMemberIds.length > 0) {
        query = query.not("id", "in", `(${currentMemberIds.join(",")})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId && addMemberDialog,
  });

  const handleAddMember = async () => {
    if (!selectedMemberId || !ministryId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("ministry_members")
        .insert([{
          ministry_id: ministryId,
          member_id: selectedMemberId,
          role: memberRole,
          joined_date: joinedDate,
        }]);

      if (error) throw error;
      
      toast.success("Membre ajouté au ministère");
      setAddMemberDialog(false);
      setSelectedMemberId("");
      setMemberRole("member");
      setJoinedDate(new Date().toISOString().split('T')[0]);
      refetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteDialog.id) return;

    try {
      const { error } = await supabase
        .from("ministry_members")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      
      toast.success("Membre retiré du ministère");
      refetchMembers();
      setDeleteDialog({ open: false, id: null });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  if (!ministryId) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate("/ministries")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Aucun ministère sélectionné</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!ministry) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/ministries")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {ministry.name}
              </h2>
              <p className="text-muted-foreground">
                {ministry.description || "Aucune description"}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddMemberDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajoute Manm
          </Button>
        </div>

        {/* Ministry Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Responsab
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {ministry.leader
                  ? `${ministry.leader.first_name} ${ministry.leader.last_name}`
                  : "Okenn"}
              </div>
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Manm
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ministryMembers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estati</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={
                  ministry.status === "active"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-muted text-muted-foreground border-border"
                }
              >
                {ministry.status === "active" ? "Aktif" : "Inaktif"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Manm Ministè a</CardTitle>
            <CardDescription>
              {ministryMembers.length} manm nan ministè sa a
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Non</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefòn</TableHead>
                    <TableHead>Wòl</TableHead>
                    <TableHead>Dat Rantre</TableHead>
                    <TableHead className="text-right">Aksyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ministryMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Okenn manm nan ministè sa a
                      </TableCell>
                    </TableRow>
                  ) : (
                    ministryMembers.map((mm: any) => (
                      <TableRow key={mm.id}>
                        <TableCell className="font-medium">
                          {mm.member?.first_name} {mm.member?.last_name}
                        </TableCell>
                        <TableCell>{mm.member?.email || "-"}</TableCell>
                        <TableCell>{mm.member?.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{mm.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {mm.joined_date
                            ? new Date(mm.joined_date).toLocaleDateString("fr-FR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({ open: true, id: mm.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialog} onOpenChange={setAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajoute Manm nan Ministè</DialogTitle>
            <DialogDescription>
              Chwazi yon manm pou ajoute nan ministè sa a
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Manm</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chwazi yon manm" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Wòl</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Manm</SelectItem>
                  <SelectItem value="coordinator">Kowòdonatè</SelectItem>
                  <SelectItem value="assistant">Asistan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Dat Rantre</Label>
              <Input
                type="date"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setAddMemberDialog(false)}
            >
              Anile
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedMemberId || loading}
            >
              {loading ? "Chajman..." : "Ajoute"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire Manm</AlertDialogTitle>
            <AlertDialogDescription>
              Èske ou sèten ou vle retire manm sa a nan ministè a?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anile</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Retire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
