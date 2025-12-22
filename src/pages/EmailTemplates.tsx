import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Save, RefreshCw, Info, Gift, Bell, UserCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type TemplateType = "birthday" | "event_reminder" | "attendance_alert";

interface EmailTemplate {
  id: string;
  template_type: TemplateType;
  subject: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const templateInfo: Record<TemplateType, { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  variables: { name: string; description: string }[];
}> = {
  birthday: {
    icon: Gift,
    title: "Anniversaire",
    description: "Email envoyé automatiquement le jour de l'anniversaire des membres",
    variables: [
      { name: "{{member_name}}", description: "Nom complet du membre" },
      { name: "{{age}}", description: "Âge du membre" },
    ],
  },
  event_reminder: {
    icon: Bell,
    title: "Rappel d'événement",
    description: "Email envoyé la veille des cultes (dimanche et mercredi)",
    variables: [
      { name: "{{member_name}}", description: "Nom complet du membre" },
      { name: "{{service_type}}", description: "Type de culte (Dimanche/Mercredi)" },
      { name: "{{service_date}}", description: "Date du culte" },
    ],
  },
  attendance_alert: {
    icon: UserCheck,
    title: "Alerte de présence",
    description: "Email envoyé aux membres dont la présence a diminué",
    variables: [
      { name: "{{member_name}}", description: "Nom complet du membre" },
      { name: "{{attendance_rate}}", description: "Taux de présence actuel" },
    ],
  },
};

export default function EmailTemplates() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<EmailTemplate>>>({});

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_type");
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailTemplate> }) => {
      const { error } = await supabase
        .from("email_templates")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Modèle mis à jour avec succès");
      setEditedTemplates({});
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  const handleChange = (id: string, field: keyof EmailTemplate, value: string | boolean) => {
    setEditedTemplates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = (template: EmailTemplate) => {
    const updates = editedTemplates[template.id];
    if (!updates) return;
    
    updateMutation.mutate({ id: template.id, updates });
  };

  const hasChanges = (id: string) => {
    return !!editedTemplates[id] && Object.keys(editedTemplates[id]).length > 0;
  };

  const getCurrentValue = (template: EmailTemplate, field: keyof EmailTemplate) => {
    if (editedTemplates[template.id]?.[field] !== undefined) {
      return editedTemplates[template.id][field];
    }
    return template[field];
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger les modèles d'emails. Vérifiez que vous avez les permissions nécessaires.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Modèles d'emails
            </h1>
            <p className="text-muted-foreground mt-1">
              Personnalisez les emails automatiques envoyés aux membres
            </p>
          </div>
        </div>

        <Tabs defaultValue="birthday" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {(["birthday", "event_reminder", "attendance_alert"] as TemplateType[]).map((type) => {
              const info = templateInfo[type];
              const Icon = info.icon;
              return (
                <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{info.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {templates?.map((template) => {
            const info = templateInfo[template.template_type as TemplateType];
            if (!info) return null;
            
            return (
              <TabsContent key={template.id} value={template.template_type}>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <info.icon className="h-5 w-5" />
                              {info.title}
                            </CardTitle>
                            <CardDescription>{info.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${template.id}`} className="text-sm">
                              Actif
                            </Label>
                            <Switch
                              id={`active-${template.id}`}
                              checked={getCurrentValue(template, "is_active") as boolean}
                              onCheckedChange={(checked) => handleChange(template.id, "is_active", checked)}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`subject-${template.id}`}>Sujet de l'email</Label>
                          <Input
                            id={`subject-${template.id}`}
                            value={getCurrentValue(template, "subject") as string}
                            onChange={(e) => handleChange(template.id, "subject", e.target.value)}
                            placeholder="Sujet de l'email..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`body-${template.id}`}>Contenu HTML</Label>
                          <Textarea
                            id={`body-${template.id}`}
                            value={getCurrentValue(template, "body_html") as string}
                            onChange={(e) => handleChange(template.id, "body_html", e.target.value)}
                            placeholder="Contenu de l'email en HTML..."
                            className="min-h-[300px] font-mono text-sm"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          {hasChanges(template.id) && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => setEditedTemplates(prev => {
                                  const next = { ...prev };
                                  delete next[template.id];
                                  return next;
                                })}
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={() => handleSave(template)}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Enregistrer
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Variables disponibles
                        </CardTitle>
                        <CardDescription>
                          Utilisez ces variables dans votre modèle
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {info.variables.map((variable) => (
                          <div key={variable.name} className="space-y-1">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {variable.name}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {variable.description}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Aperçu</CardTitle>
                        <CardDescription>
                          Prévisualisation du contenu
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg"
                          dangerouslySetInnerHTML={{ 
                            __html: (getCurrentValue(template, "body_html") as string)
                              .replace(/\{\{member_name\}\}/g, "Jean Dupont")
                              .replace(/\{\{age\}\}/g, "35")
                              .replace(/\{\{service_type\}\}/g, "Dimanche")
                              .replace(/\{\{service_date\}\}/g, "25 décembre 2024")
                              .replace(/\{\{attendance_rate\}\}/g, "45%")
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
}
