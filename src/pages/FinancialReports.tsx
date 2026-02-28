import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Users, Calendar, CalendarCheck, Shield, Cake, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import FinancialReportsTab from "@/components/reports/FinancialReportsTab";
import MembersReportTab from "@/components/reports/MembersReportTab";
import AttendanceReportTab from "@/components/reports/AttendanceReportTab";
import EventsReportTab from "@/components/reports/EventsReportTab";
import AuditReportTab from "@/components/reports/AuditReportTab";
import BirthdaysReportTab from "@/components/reports/BirthdaysReportTab";
import InventoryReportTab from "@/components/reports/InventoryReportTab";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export default function FinancialReports() {
  const { hasFeature, loading: planLoading } = usePlanLimits();

  // Check for advanced reports feature access
  if (!planLoading && !hasFeature("advancedReports")) {
    return (
      <Layout>
        <FeatureLockedCard
          featureName="Rapports Avancés"
          featureDescription="Accédez à des analyses complètes, des statistiques détaillées et des exports personnalisés pour votre église."
          requiredPlan="professionnel"
        />
      </Layout>
    );
  }

  if (planLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return <FinancialReportsContent />;
}

function FinancialReportsContent() {
  const [activeTab, setActiveTab] = useState("financial");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Rapports</h2>
            <p className="text-muted-foreground">
              Analyse complète des données de votre église
            </p>
          </div>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Toutes les branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financier</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Membres</span>
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="flex items-center gap-2">
              <Cake className="h-4 w-4" />
              <span className="hidden sm:inline">Anniversaires</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventaire</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Événements</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Présences</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="mt-6">
            <FinancialReportsTab selectedBranch={selectedBranch} branches={branches} />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <MembersReportTab selectedBranch={selectedBranch} />
          </TabsContent>

          <TabsContent value="birthdays" className="mt-6">
            <BirthdaysReportTab selectedBranch={selectedBranch} />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryReportTab selectedBranch={selectedBranch} />
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <EventsReportTab selectedBranch={selectedBranch} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceReportTab selectedBranch={selectedBranch} />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
