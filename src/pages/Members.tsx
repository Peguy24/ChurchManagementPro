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
import { Plus, Search, Download, Upload, Edit, BarChart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MemberDialog from "@/components/MemberDialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PlanLimitDialog } from "@/components/PlanLimitDialog";

const statusColors: Record<string, string> = {
  Actif: "bg-success/10 text-success border-success/20",
  Inactif: "bg-muted text-muted-foreground border-border",
  Transféré: "bg-info/10 text-info border-info/20",
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  transferred: "bg-info/10 text-info border-info/20",
};

export default function Members() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  
  const { canAddMember, usage, limits, plan } = usePlanLimits();

  const handleAddMember = () => {
    if (!canAddMember()) {
      setLimitDialogOpen(true);
      return;
    }
    setSelectedMember(undefined);
    setDialogOpen(true);
  };

  const { data: members = [], refetch } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMembers = members.filter(
    (member: any) =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return t("common.active");
      case "inactive": return t("common.inactive");
      case "transferred": return t("common.transferred");
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("members.title")}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("members.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("common.import")}</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("common.export")}</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={handleAddMember}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("members.addMember")}</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("members.title")}</CardTitle>
            <CardDescription>
              {t("common.total")}: {members.length} {t("nav.members").toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("members.searchPlaceholder")}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("members.memberNumber")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("members.gender")}</TableHead>
                    <TableHead>{t("common.phone")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("members.joinDate")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-sm text-primary font-semibold">
                        {member.member_number || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.last_name} {member.first_name}
                      </TableCell>
                      <TableCell>
                        {member.gender === "M" ? t("members.male") : member.gender === "F" ? t("members.female") : "-"}
                      </TableCell>
                      <TableCell>{member.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[member.status || "active"]}
                        >
                          {getStatusLabel(member.status || "active")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.join_date 
                          ? new Date(member.join_date).toLocaleDateString() 
                          : member.created_at 
                            ? new Date(member.created_at).toLocaleDateString() 
                            : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/members/details?memberId=${member.id}`)}
                            title={t("members.viewDetails")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/attendance/stats?memberId=${member.id}`)}
                            title={t("attendance.statistics")}
                          >
                            <BarChart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredMembers.map((member: any) => (
                <div 
                  key={member.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{member.last_name} {member.first_name}</p>
                      {member.member_number && (
                        <p className="text-sm font-mono text-primary">{member.member_number}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[member.status || "active"]}
                    >
                      {getStatusLabel(member.status || "active")}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">{t("common.phone")}:</span> {member.phone || "-"}
                    </div>
                    <div>
                      <span className="font-medium">{t("members.gender")}:</span>{" "}
                      {member.gender === "M" ? t("members.male") : member.gender === "F" ? t("members.female") : "-"}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/members/details?memberId=${member.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedMember(member);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        <MemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={selectedMember}
          onSuccess={refetch}
        />
        <PlanLimitDialog
          open={limitDialogOpen}
          onOpenChange={setLimitDialogOpen}
          limitType="members"
          currentCount={usage.membersCount}
          maxCount={limits.maxMembers}
          planName={plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Essentiel"}
        />
    </Layout>
  );
}
