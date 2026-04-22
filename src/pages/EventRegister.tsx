import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Loader2, CheckCircle, Globe, XCircle } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { eventRegistrationSchema, validateForm, firstErrorMessage } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ht", label: "Kreyòl", flag: "🇭🇹" },
];

export default function EventRegister() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t, language, setLanguage } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [churchName, setChurchName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      const { data: eventArr } = await supabase
        .rpc('get_public_event' as any, { _event_id: eventId });
      const eventData = eventArr?.[0] ?? null;

      if (eventData) {
        setEvent(eventData);
        if (eventData.tenant_id) {
          const { data: tenantArr } = await supabase
            .rpc('get_tenant_public_info', { _tenant_id: eventData.tenant_id });
          const tenant = tenantArr?.[0] ?? null;
          if (tenant) {
            setChurchName(tenant.name);
            setLogoUrl(tenant.logo_url);
          }
        }
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !eventId) return;

    const validation = validateForm(eventRegistrationSchema, formData);
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      alert(t(firstErrorMessage(validation.fieldErrors) || "errors.required"));
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        tenant_id: event.tenant_id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
      });

      if (error) throw error;

      // Send confirmation email if email provided
      if (formData.email.trim()) {
        try {
          await supabase.functions.invoke("send-event-registration-email", {
            body: {
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              email: formData.email.trim(),
              eventName: event.name,
              eventDate: event.event_date,
              eventTime: event.event_time ? event.event_time.substring(0, 5) : null,
              eventLocation: event.location || null,
              churchName: churchName || undefined,
            },
          });
        } catch (emailErr) {
          console.error("Failed to send registration email:", emailErr);
        }
      }

      setSubmitted(true);
    } catch {
      alert(t("eventRegistration.errorSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">{t("eventRegistration.errorEventNotFound")}</p>
      </div>
    );
  }

  // Event is completed or cancelled — registration closed
  const isEventClosed = event.status === "completed" || event.status === "cancelled";
  if (isEventClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-1" />
                  {languages.find((l) => l.code === language)?.flag}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {languages.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}>
                    {l.flag} {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">{t("eventRegistration.eventClosedTitle")}</h2>
              <p className="text-muted-foreground">{t("eventRegistration.eventClosedMessage")}</p>
              <div className="pt-2 space-y-1">
                <p className="font-semibold text-lg">{event.name}</p>
                {churchName && <p className="text-sm text-muted-foreground">{churchName}</p>}
                <p className="text-sm text-muted-foreground">{event.event_date}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">{t("eventRegistration.successTitle")}</h2>
            <p className="text-muted-foreground">{t("eventRegistration.successMessage")}</p>
            <p className="font-semibold">{event.name}</p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setFormData({ firstName: "", lastName: "", email: "", phone: "" });
              }}
            >
              {t("eventRegistration.registerAnother")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-6 py-8">
        {/* Language selector */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-1" />
                {languages.find((l) => l.code === language)?.flag}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {languages.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}>
                  {l.flag} {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          {logoUrl && (
            <img src={logoUrl} alt={churchName} className="h-16 w-16 rounded-full mx-auto object-cover" />
          )}
          {churchName && <p className="text-sm text-muted-foreground">{churchName}</p>}
          <h1 className="text-2xl font-bold">{event.name}</h1>
        </div>

        {/* Event info */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{event.event_date}{event.end_date ? ` → ${event.end_date}` : ""}</span>
            </div>
            {event.event_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>{event.event_time.substring(0, 5)}{event.end_time ? ` - ${event.end_time.substring(0, 5)}` : ""}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <p className="text-sm text-muted-foreground pt-2">{event.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Registration form */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-1">{t("eventRegistration.title")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("eventRegistration.subtitle")}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("eventRegistration.firstName")} *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) setErrors({ ...errors, firstName: "" });
                    }}
                    placeholder={t("eventRegistration.firstNamePlaceholder")}
                    required
                    maxLength={100}
                  />
                  <FieldError name="firstName" errors={errors} />
                </div>
                <div className="space-y-2">
                  <Label>{t("eventRegistration.lastName")} *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) setErrors({ ...errors, lastName: "" });
                    }}
                    placeholder={t("eventRegistration.lastNamePlaceholder")}
                    required
                    maxLength={100}
                  />
                  <FieldError name="lastName" errors={errors} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("eventRegistration.email")}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  placeholder={t("eventRegistration.emailPlaceholder")}
                  maxLength={255}
                />
                <FieldError name="email" errors={errors} />
              </div>
              <div className="space-y-2">
                <Label>{t("eventRegistration.phone")}</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                  placeholder={t("eventRegistration.phonePlaceholder")}
                  maxLength={20}
                />
                <FieldError name="phone" errors={errors} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t("eventRegistration.registering") : t("eventRegistration.register")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
