import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings } from "lucide-react";
import { CustomFieldDialog } from "@/components/CustomFieldDialog";
import { CustomFieldList } from "@/components/CustomFieldList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CustomFields() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);

  const { data: fields, refetch } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("entity_type")
        .order("display_order");

      if (error) throw error;
      return data;
    },
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
      toast.error("Erè pou efase chan an");
      return;
    }

    toast.success("Chan efase avèk siksè");
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
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Chan Pèsonalize</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajoute Chan
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jesyon Chan Pèsonalize</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="member" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="member">
                  Manm ({memberFields.length})
                </TabsTrigger>
                <TabsTrigger value="branch">
                  Branch ({branchFields.length})
                </TabsTrigger>
                <TabsTrigger value="ministry">
                  Ministè ({ministryFields.length})
                </TabsTrigger>
                <TabsTrigger value="event">
                  Evènman ({eventFields.length})
                </TabsTrigger>
                <TabsTrigger value="donation">
                  Don ({donationFields.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="member">
                <CustomFieldList
                  fields={memberFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>

              <TabsContent value="branch">
                <CustomFieldList
                  fields={branchFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>

              <TabsContent value="ministry">
                <CustomFieldList
                  fields={ministryFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>

              <TabsContent value="event">
                <CustomFieldList
                  fields={eventFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>

              <TabsContent value="donation">
                <CustomFieldList
                  fields={donationFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
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
