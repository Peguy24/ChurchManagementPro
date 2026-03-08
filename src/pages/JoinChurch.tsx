import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ht", label: "Kreyòl", flag: "🇭🇹" },
];

export default function JoinChurch() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { t, language, setLanguage } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ministries, setMinistries] = useState<any[]>([]);
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
    if (tenantId) {
      supabase
        .from("tenants")
        .select("name, logo_url")
        .eq("id", tenantId)
        .single()
        .then(({ data }) => {
          if (data) {
            setChurchName(data.name);
            setLogoUrl(data.logo_url);
          }
        });

      // Fetch active ministries for this tenant
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
  }, [tenantId]);

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error(t("joinForm.errorRequired"));
      return;
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Header with Logo */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={churchName} className="h-20 w-20 mx-auto mb-3 rounded-xl object-contain" />
          ) : (
            <Church className="h-12 w-12 text-primary mx-auto mb-3" />
          )}
          <h1 className="text-3xl font-bold">{t("joinForm.title")}</h1>
          {churchName && (
            <p className="text-lg text-muted-foreground mt-1">{churchName}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {t("joinForm.subtitle")}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
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
                      <Input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("joinForm.lastName")} {t("joinForm.required")}</Label>
                      <Input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} required />
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
                      <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("joinForm.email")}</Label>
                      <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
