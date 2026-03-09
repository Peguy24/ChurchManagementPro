import { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
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
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { usePlanLimits } from "@/hooks/usePlanLimits";

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

const templateIcons: Record<TemplateType, React.ComponentType<{ className?: string }>> = {
  birthday: Gift,
  event_reminder: Bell,
  attendance_alert: UserCheck,
};

const templateVariableKeys: Record<TemplateType, string[]> = {
  birthday: ["{{member_name}}", "{{age}}"],
  event_reminder: ["{{member_name}}", "{{service_type}}", "{{service_date}}"],
  attendance_alert: ["{{member_name}}", "{{attendance_rate}}"],
};

const variableTranslationMap: Record<string, string> = {
  "{{member_name}}": "varMemberName",
  "{{age}}": "varAge",
  "{{service_type}}": "varServiceType",
  "{{service_date}}": "varServiceDate",
  "{{attendance_rate}}": "varAttendanceRate",
};

const templateTitleKeys: Record<TemplateType, string> = {
  birthday: "birthday",
  event_reminder: "eventReminder",
  attendance_alert: "attendanceAlert",
};

const templateDescKeys: Record<TemplateType, string> = {
  birthday: "birthdayDesc",
  event_reminder: "eventReminderDesc",
  attendance_alert: "attendanceAlertDesc",
};

export default function EmailTemplates() {
  const { t } = useLanguage();
  const { hasFeature, loading: planLoading } = usePlanLimits();

  if (!planLoading && !hasFeature("emailNotifications")) {
    return (
      <Layout>
        <FeatureLockedCard
          featureName={t("emailTemplatesPage.featureName")}
          featureDescription={t("emailTemplatesPage.featureDescription")}
          requiredPlan="professionnel"
          icon={<Mail className="w-8 h-8 text-muted-foreground" />}
        />
      </Layout>
    );
  }

  if (planLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">{t("common.loading")}</div>
        </div>
      </Layout>
    );
  }

  return <EmailTemplatesContent />;
}

function EmailTemplatesContent() {
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
      toast.success(t("emailTemplatesPage.updateSuccess"));
      setEditedTemplates({});
    },
    onError: (error) => {
      toast.error(t("emailTemplatesPage.updateError") + ": " + error.message);
    },
  });

  const handleChange = (id: string, field: keyof EmailTemplate, value: string | boolean) => {
    setEditedTemplates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
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
          <AlertTitle>{t("emailTemplatesPage.errorTitle")}</AlertTitle>
          <AlertDescription>{t("emailTemplatesPage.loadError")}</AlertDescription>
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
              {t("emailTemplatesPage.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("emailTemplatesPage.subtitle")}
            </p>
          </div>
        </div>

        <Tabs defaultValue="birthday" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {(["birthday", "event_reminder", "attendance_alert"] as TemplateType[]).map((type) => {
              const Icon = templateIcons[type];
              return (
                <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t(`emailTemplatesPage.${templateTitleKeys[type]}`)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {templates?.map((template) => {
            const type = template.template_type as TemplateType;
            const Icon = templateIcons[type];
            if (!Icon) return null;
            
            return (
              <TabsContent key={template.id} value={template.template_type}>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              {t(`emailTemplatesPage.${templateTitleKeys[type]}`)}
                            </CardTitle>
                            <CardDescription>{t(`emailTemplatesPage.${templateDescKeys[type]}`)}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${template.id}`} className="text-sm">
                              {t("emailTemplatesPage.active")}
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
                          <Label htmlFor={`subject-${template.id}`}>{t("emailTemplatesPage.subject")}</Label>
                          <Input
                            id={`subject-${template.id}`}
                            value={getCurrentValue(template, "subject") as string}
                            onChange={(e) => handleChange(template.id, "subject", e.target.value)}
                            placeholder={t("emailTemplatesPage.subjectPlaceholder")}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>{t("emailTemplatesPage.htmlContent")}</Label>
                          <RichTextEditor
                            value={getCurrentValue(template, "body_html") as string}
                            onChange={(html) => handleChange(template.id, "body_html", html)}
                            minHeight="300px"
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
                                {t("emailTemplatesPage.cancel")}
                              </Button>
                              <Button
                                onClick={() => handleSave(template)}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {t("emailTemplatesPage.save")}
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
                          {t("emailTemplatesPage.availableVariables")}
                        </CardTitle>
                        <CardDescription>
                          {t("emailTemplatesPage.variablesDescription")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {templateVariableKeys[type]?.map((varName) => (
                          <div key={varName} className="space-y-1">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {varName}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {t(`emailTemplatesPage.${variableTranslationMap[varName]}`)}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{t("emailTemplatesPage.preview")}</CardTitle>
                        <CardDescription>
                          {t("emailTemplatesPage.previewDescription")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(
                              (getCurrentValue(template, "body_html") as string)
                                .replace(/\{\{member_name\}\}/g, "Jean Dupont")
                                .replace(/\{\{age\}\}/g, "35")
                                .replace(/\{\{service_type\}\}/g, "Dimanche")
                                .replace(/\{\{service_date\}\}/g, "25 décembre 2024")
                                .replace(/\{\{attendance_rate\}\}/g, "45%"),
                              { ALLOWED_TAGS: ['div', 'p', 'span', 'strong', 'em', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img'], ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class'] }
                            )
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
