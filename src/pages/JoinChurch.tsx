import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Church, Send, Loader2, CheckCircle, User, Heart, Users, GraduationCap, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { FieldError } from "@/components/FieldError";
import {
  validateForm,
  joinChurchPersonalSchema,
  joinChurchFormationSchema,
  joinChurchSpiritualSchema,
  joinChurchFamilySchema,
  firstErrorMessage,
} from "@/lib/validation";
import { ArrowLeft, ArrowRight } from "lucide-react";

const STEPS = ["personal", "formation", "spiritual", "family"] as const;
type Step = (typeof STEPS)[number];

const STEP_SCHEMAS = {
  personal: joinChurchPersonalSchema,
  formation: joinChurchFormationSchema,
  spiritual: joinChurchSpiritualSchema,
  family: joinChurchFamilySchema,
} as const;

const STEP_FIELDS: Record<Step, string[]> = {
  personal: [
    "firstName", "lastName", "gender", "dateOfBirth", "email", "phone", "emergencyPhone",
    "street", "number", "apartment", "city", "state", "zipCode", "country",
  ],
  formation: ["academicFormation", "professionalFormation"],
  spiritual: ["baptismStatus", "baptismDate", "originChurch", "conversionDate", "christianExperience"],
  family: ["maritalStatus", "spouseName", "marriageDate", "numberOfChildren", "childrenNames", "message"],
};

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ht", label: "Kreyòl", flag: "🇭🇹" },
];

export default function JoinChurch() {
  const { tenantIdOrSlug } = useParams<{ tenantIdOrSlug: string }>();
  const { t, language, setLanguage } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("personal");
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", gender: "", dateOfBirth: "",
    phone: "", email: "", emergencyPhone: "",
    street: "", number: "", apartment: "", city: "", state: "", zipCode: "", country: "",
    academicFormation: "", professionalFormation: "",
    baptismStatus: "", baptismDate: "", originChurch: "", conversionDate: "", christianExperience: "",
    maritalStatus: "", spouseName: "", marriageDate: "", numberOfChildren: "", childrenNames: "",
    message: "", desiredMinistryId: "",
  });

  // Resolve tenant branding + ministries via a public, tenant-scoped RPC
  useEffect(() => {
    async function fetchTenant() {
      if (!tenantIdOrSlug) return;
      const { data, error } = await supabase.rpc("get_public_join_config", { _slug: tenantIdOrSlug });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setNotFound(true);
        return;
      }
      setTenantId(row.tenant_id);
      setChurchName(row.tenant_name);
      setLogoUrl(row.logo_url);
      setPrimaryColor(row.primary_color);
      setMinistries(Array.isArray(row.ministries) ? row.ministries : []);
    }
    fetchTenant();
  }, [tenantIdOrSlug]);


  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  };

  const stepIndex = STEPS.indexOf(step);
  const isLastStep = stepIndex === STEPS.length - 1;

  /** Validates one step; sets its field errors and returns validity. */
  const validateStep = (target: Step): boolean => {
    const fields = STEP_FIELDS[target];
    const payload: Record<string, string> = {};
    for (const f of fields) payload[f] = (formData as any)[f] ?? "";
    const result = validateForm(STEP_SCHEMAS[target] as any, payload);
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return { ...next, ...result.fieldErrors };
    });
    if (!result.success) {
      toast.error(
        firstErrorMessage(result.fieldErrors, t) || t("joinForm.errorStepInvalid"),
      );
    }
    return result.success;
  };

  const goToStep = (target: Step) => {
    const targetIndex = STEPS.indexOf(target);
    if (targetIndex <= stepIndex) {
      setStep(target);
      return;
    }
    // Moving forward: every step in between must be valid
    for (let i = stepIndex; i < targetIndex; i++) {
      if (!validateStep(STEPS[i])) {
        setStep(STEPS[i]);
        return;
      }
    }
    setStep(target);
  };

  const handleNext = () => goToStep(STEPS[stepIndex + 1]);
  const handleBack = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate every step, not just the visible one
    for (const s of STEPS) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }


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

      const requestId = crypto.randomUUID();

      const { error } = await supabase.from("member_requests").insert({
        id: requestId,
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

      // Notify tenant admins about new member request
      try {
        await supabase.functions.invoke("notify-admin-member-request", {
          body: {
            requestId,
            language,
          },
        });
      } catch (emailErr) {
        console.error("Failed to notify admins:", emailErr);
      }

      setSubmitted(true);
      toast.success(t("joinForm.successToast"));
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("joinForm.errorPrefix") + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLang = languages.find((l) => l.code === language);

  const LanguageSwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span>{currentLang?.flag} {currentLang?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const brandStyle = (() => {
    const hsl = primaryColor ? hexToHSL(primaryColor) : null;
    if (!hsl) return undefined;
    return {
      ["--primary" as any]: `${hsl.h} ${hsl.s}% ${hsl.l}%`,
      ["--ring" as any]: `${hsl.h} ${hsl.s}% ${hsl.l}%`,
      ["--accent" as any]: `${hsl.h} ${Math.max(hsl.s - 25, 10)}% ${Math.min(hsl.l + 35, 95)}%`,
    } as React.CSSProperties;
  })();

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/40 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <Church className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">{t("joinForm.errorInvalidLink")}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={brandStyle} className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center overflow-hidden">
          <div className="h-2 w-full bg-primary" />
          <CardContent className="pt-8 pb-8 space-y-4">
            {logoUrl && (
              <img src={logoUrl} alt={churchName} className="h-16 w-16 mx-auto rounded-lg object-contain" />
            )}
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">{t("joinForm.successTitle")}</h2>
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{
              __html: t("joinForm.successMessage").replace("{churchName}", churchName)
            }} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={brandStyle} className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Header with church branding */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="mx-auto mb-4 h-24 w-24 rounded-2xl bg-card border shadow-sm flex items-center justify-center overflow-hidden">
              <img src={logoUrl} alt={churchName} className="h-20 w-20 object-contain" />
            </div>
          ) : (
            <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Church className="h-10 w-10 text-primary" />
            </div>
          )}
          {churchName && (
            <h1 className="text-3xl font-bold text-primary">{churchName}</h1>
          )}
          <p className="text-lg font-medium mt-1">{t("joinForm.title")}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t("joinForm.subtitle")}
          </p>
        </div>



        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                // Enter must not submit from an intermediate step
                if (e.key === "Enter" && !isLastStep) {
                  const target = e.target as HTMLElement;
                  if (target.tagName !== "TEXTAREA") e.preventDefault();
                }
              }}
            >
              <p className="text-xs text-muted-foreground mb-3 text-center">
                {t("joinForm.stepOf")
                  .replace("{current}", String(stepIndex + 1))
                  .replace("{total}", String(STEPS.length))}
              </p>
              <Tabs value={step} onValueChange={(v) => goToStep(v as Step)} className="w-full">
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
                      <Input value={formData.phone} onChange={(e) => { updateField("phone", e.target.value); if (errors.phone) setErrors((p) => ({ ...p, phone: "" })); }} />
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
                    <Input value={formData.emergencyPhone} onChange={(e) => updateField("emergencyPhone", e.target.value)} />
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

              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
                {stepIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="sm:w-auto w-full"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("joinForm.back")}
                  </Button>
                )}
                {!isLastStep ? (
                  <Button type="button" className="flex-1" size="lg" onClick={handleNext}>
                    {t("joinForm.next")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={isSubmitting} size="lg">
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
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
