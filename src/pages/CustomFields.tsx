import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, ArrowLeft } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { CustomFieldDialog } from "@/components/CustomFieldDialog";
import { CustomFieldList } from "@/components/CustomFieldList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

export default function CustomFields() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tenantId } = useCurrentTenant();

  const { data: fields, refetch } = useQuery({
    queryKey: ["custom-fields", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("custom_fields")
        .select("*")
        .order("entity_type")
        .order("display_order");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleEdit = (field: any) => {
    setSelectedField(field);
    setDialogOpen(true);
  };

  const handleDelete = async (fieldId: string) => {
    const { error } = await supabase
      .from("custom_fields")
      .delete()
      .eq("id", fieldId);

    if (error) {
      toast.error(t("customFields.deleteError"));
      return;
    }

    toast.success(t("customFields.deleteSuccess"));
    refetch();
  };

  const handleSuccess = () => {
    refetch();
    setDialogOpen(false);
    setSelectedField(null);
  };

  const memberFields = fields?.filter((f) => f.entity_type === "member") || [];
  const branchFields = fields?.filter((f) => f.entity_type === "branch") || [];
  const ministryFields = fields?.filter((f) => f.entity_type === "ministry") || [];
  const eventFields = fields?.filter((f) => f.entity_type === "event") || [];
  const donationFields = fields?.filter((f) => f.entity_type === "donation") || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("customFields.title")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("customFields.addField")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("customFields.subtitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="member" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="member">
                  {t("customFields.tabMembers")} ({memberFields.length})
                </TabsTrigger>
                <TabsTrigger value="branch">
                  {t("customFields.tabBranches")} ({branchFields.length})
                </TabsTrigger>
                <TabsTrigger value="ministry">
                  {t("customFields.tabMinistries")} ({ministryFields.length})
                </TabsTrigger>
                <TabsTrigger value="event">
                  {t("customFields.tabEvents")} ({eventFields.length})
                </TabsTrigger>
                <TabsTrigger value="donation">
                  {t("customFields.tabDonations")} ({donationFields.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="member">
                <CustomFieldList fields={memberFields} onEdit={handleEdit} onDelete={handleDelete} />
              </TabsContent>
              <TabsContent value="branch">
                <CustomFieldList fields={branchFields} onEdit={handleEdit} onDelete={handleDelete} />
              </TabsContent>
              <TabsContent value="ministry">
                <CustomFieldList fields={ministryFields} onEdit={handleEdit} onDelete={handleDelete} />
              </TabsContent>
              <TabsContent value="event">
                <CustomFieldList fields={eventFields} onEdit={handleEdit} onDelete={handleDelete} />
              </TabsContent>
              <TabsContent value="donation">
                <CustomFieldList fields={donationFields} onEdit={handleEdit} onDelete={handleDelete} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <CustomFieldDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedField(null);
          }}
          field={selectedField}
          onSuccess={handleSuccess}
        />
      </div>
    </Layout>
  );
}
