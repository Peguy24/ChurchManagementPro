import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Users, Trash2, BarChart3, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MinistryDialog from "@/components/MinistryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
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
import { useLanguage } from "@/contexts/LanguageContext";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

export default function Ministries() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<any>();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: ministries = [], refetch } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select(`
          *,
          leader:members!ministries_leader_id_fkey(first_name, last_name),
          ministry_members(count)
        `)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMinistries = ministries.filter(
    (ministry: any) =>
      ministry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ministry.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const { error } = await supabase
        .from("ministries")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      
      toast.success(t("ministries.deleteSuccess"));
      refetch();
      setDeleteDialog({ open: false, id: null });
    } catch (error: any) {
      toast.error(error.message || t("ministries.deleteError"));
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("ministries.title")}</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t("ministries.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigate("/ministries/stats")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {t("ministries.statistics")}
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setSelectedMinistry(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("ministries.addMinistry")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("ministries.ministryList")}</CardTitle>
            <CardDescription>
              {t("ministries.total")}: {ministries.length} {t("nav.ministries").toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("ministries.searchPlaceholder")}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ministries.name")}</TableHead>
                    <TableHead>{t("ministries.description")}</TableHead>
                    <TableHead>{t("ministries.leader")}</TableHead>
                    <TableHead>{t("ministries.members")}</TableHead>
                    <TableHead>{t("ministries.status")}</TableHead>
                    <TableHead className="text-right">{t("ministries.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMinistries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("ministries.noMinistryFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMinistries.map((ministry: any) => (
                      <TableRow key={ministry.id}>
                        <TableCell className="font-medium">
                          {ministry.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {ministry.description || "-"}
                        </TableCell>
                        <TableCell>
                          {ministry.leader
                            ? `${ministry.leader.first_name} ${ministry.leader.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {ministry.ministry_members?.[0]?.count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[ministry.status || "active"]}
                          >
                            {ministry.status === "active" ? t("ministries.active") : t("ministries.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/ministries/details?ministryId=${ministry.id}`)}
                              title={t("ministries.manageMembers")}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMinistry(ministry);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteDialog({ open: true, id: ministry.id })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      <MinistryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ministry={selectedMinistry}
        onSuccess={refetch}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ministries.deleteMinistry")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ministries.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ministries.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("ministries.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
