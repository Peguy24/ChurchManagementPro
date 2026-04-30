import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, User, Heart, Users, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { FieldError } from "@/components/FieldError";
import { validateForm, joinAsMemberSchema, firstErrorMessage, optionalPhoneSchema } from "@/lib/validation";

const liveCheck = (schema: { safeParse: (v: unknown) => any }, value: string): string | null => {
  const r = schema.safeParse(value);
  if (r.success) return null;
  return r.error?.issues?.[0]?.message ?? null;
};

interface JoinAsMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JoinAsMemberDialog({ open, onOpenChange }: JoinAsMemberDialogProps) {
  const { t, language } = useLanguage();
  const { tenantId, tenant } = useCurrentTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", gender: "", dateOfBirth: "",
    phone: "", email: "", emergencyPhone: "",
    street: "", number: "", apartment: "", city: "", state: "", zipCode: "", country: "",
    academicFormation: "", professionalFormation: "",
    baptismStatus: "", baptismDate: "", originChurch: "", conversionDate: "", christianExperience: "",
    maritalStatus: "", spouseName: "", marriageDate: "", numberOfChildren: "", childrenNames: "",
    message: "", desiredMinistryId: "",
  });

  useEffect(() => {
    if (open && tenantId) {
      supabase
        .from("ministries")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("name")
        .then(({ data }) => {
          if (data) setMinistries(data);
        });
    }
  }, [open, tenantId]);

  const resetForm = () => {
    setFormData({
      firstName: "", lastName: "", gender: "", dateOfBirth: "",
      phone: "", email: "", emergencyPhone: "",
      street: "", number: "", apartment: "", city: "", state: "", zipCode: "", country: "",
      academicFormation: "", professionalFormation: "",
      baptismStatus: "", baptismDate: "", originChurch: "", conversionDate: "", christianExperience: "",
      maritalStatus: "", spouseName: "", marriageDate: "", numberOfChildren: "", childrenNames: "",
      message: "", desiredMinistryId: "",
    });
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(joinAsMemberSchema, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast.error(firstErrorMessage(validation.fieldErrors, t) || t("joinForm.errorRequired"));
      return;
    }
    setErrors({});

    if (!tenantId) {
      toast.error(t("joinForm.errorInvalidLink"));
      return;
    }

    setIsSubmitting(true);
    try {
      const address = {
        street: formData.street, number: formData.number, apartment: formData.apartment,
        city: formData.city, state: formData.state, zipCode: formData.zipCode, country: formData.country,
      };

      const { error } = await supabase.from("member_requests").insert({
        tenant_id: tenantId,
        first_name: formData.firstName, last_name: formData.lastName,
        gender: formData.gender || null, date_of_birth: formData.dateOfBirth || null,
        phone: formData.phone || null, email: formData.email || null,
        emergency_phone: formData.emergencyPhone || null, address,
        academic_formation: formData.academicFormation || null,
        professional_formation: formData.professionalFormation || null,
        baptism_status: formData.baptismStatus || null, baptism_date: formData.baptismDate || null,
        origin_church: formData.originChurch || null, conversion_date: formData.conversionDate || null,
        christian_experience: formData.christianExperience || null,
        marital_status: formData.maritalStatus || null, spouse_name: formData.spouseName || null,
        marriage_date: formData.marriageDate || null,
        number_of_children: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : 0,
        children_names: formData.childrenNames || null, message: formData.message || null,
        desired_ministry_id: formData.desiredMinistryId || null,
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke("notify-admin-member-request", {
          body: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email || null,
            phone: formData.phone || null,
            tenantId,
            tenantName: tenant?.name || "",
            language,
          },
        });
      } catch (emailErr) {
        console.error("Failed to notify admins:", emailErr);
      }

      toast.success(t("joinForm.successToast"));
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("joinForm.errorPrefix") + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("joinForm.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1 hidden sm:inline" />
                {t("joinForm.tabPersonal")}
              </TabsTrigger>
              <TabsTrigger value="formation" className="text-xs sm:text-sm">
                <GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" />
                {t("joinForm.tabFormation")}
              </TabsTrigger>
              <TabsTrigger value="spiritual" className="text-xs sm:text-sm">
                <Heart className="h-4 w-4 mr-1 hidden sm:inline" />
                {t("joinForm.tabSpiritual")}
              </TabsTrigger>
              <TabsTrigger value="family" className="text-xs sm:text-sm">
                <Users className="h-4 w-4 mr-1 hidden sm:inline" />
                {t("joinForm.tabFamily")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.firstName")} {t("joinForm.required")}</Label>
                  <Input value={formData.firstName} onChange={(e) => { updateField("firstName", e.target.value); if (errors.firstName) setErrors((p) => ({ ...p, firstName: "" })); }} />
                  <FieldError name="firstName" errors={errors} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.lastName")} {t("joinForm.required")}</Label>
                  <Input value={formData.lastName} onChange={(e) => { updateField("lastName", e.target.value); if (errors.lastName) setErrors((p) => ({ ...p, lastName: "" })); }} />
                  <FieldError name="lastName" errors={errors} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.gender")}</Label>
                  <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                    <SelectTrigger><SelectValue placeholder={t("joinForm.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">{t("joinForm.male")}</SelectItem>
                      <SelectItem value="F">{t("joinForm.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.dateOfBirth")}</Label>
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.phone")}</Label>
                  <Input
                    inputMode="tel"
                    maxLength={20}
                    value={formData.phone}
                    aria-invalid={!!errors.phone}
                    className={errors.phone ? "border-destructive" : ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^+\d()\-\s]/g, "").slice(0, 20);
                      updateField("phone", v);
                      const err = v.trim().length === 0 ? "" : (liveCheck(optionalPhoneSchema, v) ?? "");
                      setErrors((p) => ({ ...p, phone: err }));
                    }}
                  />
                  <FieldError name="phone" errors={errors} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.email")}</Label>
                  <Input type="email" value={formData.email} onChange={(e) => { updateField("email", e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }} />
                  <FieldError name="email" errors={errors} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.emergencyPhone")}</Label>
                <Input
                  inputMode="tel"
                  maxLength={20}
                  value={formData.emergencyPhone}
                  aria-invalid={!!errors.emergencyPhone}
                  className={errors.emergencyPhone ? "border-destructive" : ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^+\d()\-\s]/g, "").slice(0, 20);
                    updateField("emergencyPhone", v);
                    const err = v.trim().length === 0 ? "" : (liveCheck(optionalPhoneSchema, v) ?? "");
                    setErrors((p) => ({ ...p, emergencyPhone: err }));
                  }}
                />
                <FieldError name="emergencyPhone" errors={errors} />
              </div>
              <h4 className="font-semibold text-sm pt-2">{t("joinForm.address")}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>{t("joinForm.street")}</Label>
                  <Input value={formData.street} onChange={(e) => updateField("street", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.number")}</Label>
                  <Input value={formData.number} onChange={(e) => updateField("number", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.apartment")}</Label>
                  <Input value={formData.apartment} onChange={(e) => updateField("apartment", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.city")}</Label>
                  <Input value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.stateRegion")}</Label>
                  <Input value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.zipCode")}</Label>
                  <Input value={formData.zipCode} onChange={(e) => updateField("zipCode", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.country")}</Label>
                <Input value={formData.country} onChange={(e) => updateField("country", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="formation" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("joinForm.academicFormation")}</Label>
                <Textarea value={formData.academicFormation} onChange={(e) => updateField("academicFormation", e.target.value)} placeholder={t("joinForm.academicPlaceholder")} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.professionalFormation")}</Label>
                <Textarea value={formData.professionalFormation} onChange={(e) => updateField("professionalFormation", e.target.value)} placeholder={t("joinForm.professionalPlaceholder")} rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="spiritual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.baptismStatus")}</Label>
                  <Select value={formData.baptismStatus} onValueChange={(v) => updateField("baptismStatus", v)}>
                    <SelectTrigger><SelectValue placeholder={t("joinForm.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baptized">{t("joinForm.baptized")}</SelectItem>
                      <SelectItem value="not_baptized">{t("joinForm.notBaptized")}</SelectItem>
                      <SelectItem value="in_preparation">{t("joinForm.inPreparation")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.baptismDate")}</Label>
                  <Input type="date" value={formData.baptismDate} onChange={(e) => updateField("baptismDate", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.originChurch")}</Label>
                  <Input value={formData.originChurch} onChange={(e) => updateField("originChurch", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.conversionDate")}</Label>
                  <Input type="date" value={formData.conversionDate} onChange={(e) => updateField("conversionDate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.christianExperience")}</Label>
                <Textarea value={formData.christianExperience} onChange={(e) => updateField("christianExperience", e.target.value)} placeholder={t("joinForm.christianExperiencePlaceholder")} rows={3} />
              </div>
              {ministries.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("joinForm.desiredMinistry")}</Label>
                  <Select value={formData.desiredMinistryId || "none"} onValueChange={(v) => updateField("desiredMinistryId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder={t("joinForm.selectMinistry")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("joinForm.noMinistry")}</SelectItem>
                      {ministries.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="family" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.maritalStatus")}</Label>
                  <Select value={formData.maritalStatus} onValueChange={(v) => updateField("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder={t("joinForm.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("joinForm.single")}</SelectItem>
                      <SelectItem value="married">{t("joinForm.married")}</SelectItem>
                      <SelectItem value="divorced">{t("joinForm.divorced")}</SelectItem>
                      <SelectItem value="widowed">{t("joinForm.widowed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.spouseName")}</Label>
                  <Input value={formData.spouseName} onChange={(e) => updateField("spouseName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("joinForm.marriageDate")}</Label>
                  <Input type="date" value={formData.marriageDate} onChange={(e) => updateField("marriageDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("joinForm.numberOfChildren")}</Label>
                  <Input type="number" min="0" value={formData.numberOfChildren} onChange={(e) => updateField("numberOfChildren", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.childrenNames")}</Label>
                <Textarea value={formData.childrenNames} onChange={(e) => updateField("childrenNames", e.target.value)} placeholder={t("joinForm.childrenNamesPlaceholder")} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t("joinForm.message")}</Label>
                <Textarea value={formData.message} onChange={(e) => updateField("message", e.target.value)} placeholder={t("joinForm.messagePlaceholder")} rows={2} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("joinForm.submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("joinForm.submit")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
