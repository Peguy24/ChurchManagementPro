import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getLocalToday } from "@/lib/utils";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { saveCustomFieldValues } from "@/lib/customFieldsUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EventQRCode from "@/components/EventQRCode";
import { FieldError } from "@/components/FieldError";
import { validateForm, eventSchema, firstErrorMessage, EVENT_DATE_MAX_YEARS_AHEAD, EVENT_MAX_DURATION_DAYS } from "@/lib/validation";
import { sanitizeLine, sanitizeText, sanitizeName } from "@/lib/inputSanitize";

const formatDateInput = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const computeMaxEventDate = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + EVENT_DATE_MAX_YEARS_AHEAD);
  return formatDateInput(d);
};

const computeMaxEndDate = (startDate: string): string => {
  const absoluteMax = computeMaxEventDate();
  if (!startDate) return absoluteMax;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return absoluteMax;
  const maxByDuration = new Date(start);
  maxByDuration.setDate(maxByDuration.getDate() + EVENT_MAX_DURATION_DAYS);
  const durationStr = formatDateInput(maxByDuration);
  return durationStr < absoluteMax ? durationStr : absoluteMax;
};

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  branch_id: string | null;
  status: string;
  expected_attendees: number;
  event_category: string | null;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSuccess?: () => void;
}

const categoryKeys = ["general", "worship", "fasting", "conference", "retreat", "celebration", "prayer", "youth", "community", "holiday"];

export default function EventDialog({ open, onOpenChange, event, onSuccess }: EventDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const navigate = useNavigate();
  const isEditing = !!event;
  const isReadOnly = isEditing && (event.status === "completed" || event.status === "cancelled");

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    endDate: "",
    time: "",
    endTime: "",
    location: "",
    description: "",
    status: "planned",
    expectedAttendees: 0,
    eventCategory: "general",
  });

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        date: event.event_date,
        endDate: event.end_date || "",
        time: event.event_time?.substring(0, 5) || "",
        endTime: event.end_time?.substring(0, 5) || "",
        location: event.location || "",
        description: event.description || "",
        status: event.status,
        expectedAttendees: event.expected_attendees,
        eventCategory: event.event_category || "general",
      });
    } else {
      const today = getLocalToday();
      setFormData({
        name: "",
        date: today,
        endDate: "",
        time: "",
        endTime: "",
        location: "",
        description: "",
        status: "planned",
        expectedAttendees: 0,
        eventCategory: "general",
      });
    }
    setCustomFieldValues({});
  }, [event, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId) throw new Error(t("events.noTenant"));
      const { data: inserted, error } = await supabase.from("events").insert({
        name: data.name,
        event_date: data.date,
        end_date: data.endDate || null,
        event_time: data.time || null,
        end_time: data.endTime || null,
        location: data.location || null,
        description: data.description || null,
        status: data.status,
        expected_attendees: data.expectedAttendees,
        event_category: data.eventCategory,
        tenant_id: tenantId,
      }).select("id").single();
      if (error) throw error;
      if (inserted) {
        await saveCustomFieldValues(inserted.id, customFieldValues, "event", tenantId);
      }
    },
    onSuccess: () => {
      toast({ title: t("events.eventCreated"), description: `${formData.name} ${t("events.eventCreatedDesc")} ${formData.date}.` });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("events.errorCreate"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!event) return;
      const { error } = await supabase
        .from("events")
        .update({
          name: data.name,
          event_date: data.date,
          end_date: data.endDate || null,
          event_time: data.time || null,
          end_time: data.endTime || null,
          location: data.location || null,
          description: data.description || null,
          status: data.status,
          expected_attendees: data.expectedAttendees,
          event_category: data.eventCategory,
        })
        .eq("id", event.id);
      if (error) throw error;
      await saveCustomFieldValues(event.id, customFieldValues, "event", tenantId);
    },
    onSuccess: () => {
      toast({ title: t("events.eventUpdated"), description: `${formData.name} ${t("events.eventUpdatedDesc")}` });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("events.errorUpdate"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("events.eventDeleted"), description: t("events.eventDeletedDesc") });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("events.errorDelete"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(eventSchema, {
      name: formData.name,
      date: formData.date,
      endDate: formData.endDate,
      location: formData.location,
      description: formData.description,
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast({ title: t("common.error"), description: firstErrorMessage(validation.fieldErrors, t) || t("events.errorCreate"), variant: "destructive" });
      return;
    }
    setErrors({});

    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const statusLabels: Record<string, string> = {
    confirmed: t("events.confirmed"),
    planned: t("events.planned"),
    cancelled: t("events.cancelled"),
    completed: t("events.completed"),
  };

  const formatTime = (time: string) => time.substring(0, 5);

  // Fetch actual attendance count for completed/cancelled events
  const { data: actualAttendees = 0 } = useQuery({
    queryKey: ["event-attendance-count", event?.id],
    queryFn: async () => {
      if (!event) return 0;
      const { count, error } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: isReadOnly && !!event,
  });

  // Read-only report view for completed/cancelled events
  if (isReadOnly && event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("events.eventReport")}</DialogTitle>
            <DialogDescription>{t("events.eventReportDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <Badge
                variant="outline"
                className={event.status === "completed"
                  ? "bg-muted text-muted-foreground border-muted"
                  : "bg-destructive/10 text-destructive border-destructive/20"}
              >
                {statusLabels[event.status] || event.status}
              </Badge>
            </div>

            <div className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("events.category")}</span>
                <Badge variant="secondary">{t(`events.${event.event_category || "general"}`)}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("events.startDate")}</span>
                <span className="font-medium">{event.event_date}</span>
              </div>
              {event.end_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("events.endDate")}</span>
                  <span className="font-medium">{event.end_date}</span>
                </div>
              )}
              {event.event_time && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("events.startTime")}</span>
                  <span className="font-medium">
                    {formatTime(event.event_time)}
                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("events.locationLabel")}</span>
                  <span className="font-medium">{event.location}</span>
                </div>
              )}
              {event.expected_attendees > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("events.expectedAttendees")}</span>
                  <span className="font-medium">{event.expected_attendees}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground font-medium">{t("events.actualAttendees")}</span>
                <span className="text-lg font-bold text-primary">{actualAttendees}</span>
              </div>
            </div>

            {event.description && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">{t("events.descriptionLabel")}</p>
                <p className="text-sm">{event.description}</p>
              </div>
            )}

            {/* QR Code & Registration Link */}
            <div className="space-y-2">
              <EventQRCode eventId={event.id} />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/events/registrations?eventId=${event.id}`);
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                {t("eventRegistration.viewRegistrations")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("events.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("events.editEvent") : t("events.createEvent")}</DialogTitle>
          <DialogDescription>{isEditing ? t("events.editEventDesc") : t("events.createEventDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("events.eventNameLabel")} *</Label>
              <Input
                id="name"
                value={formData.name}
                maxLength={120}
                onChange={(e) => { setFormData({ ...formData, name: sanitizeName(e.target.value, 120) }); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
              />
              <FieldError name="name" errors={errors} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">{t("events.category")}</Label>
                <Select value={formData.eventCategory} onValueChange={(v) => setFormData({ ...formData, eventCategory: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryKeys.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`events.${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">{t("events.statusLabel")}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">{t("events.planned")}</SelectItem>
                    <SelectItem value="confirmed">{t("events.confirmed")}</SelectItem>
                    <SelectItem value="cancelled">{t("events.cancelled")}</SelectItem>
                    <SelectItem value="completed">{t("events.completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">{t("events.startDate")} *</Label>
                <Input id="date" type="date" value={formData.date} max={computeMaxEventDate()} onChange={(e) => { setFormData({ ...formData, date: e.target.value }); if (errors.date) setErrors((p) => ({ ...p, date: "" })); }} />
                <FieldError name="date" errors={errors} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">{t("events.endDate")}</Label>
                <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); if (errors.endDate) setErrors((p) => ({ ...p, endDate: "" })); }} min={formData.date} max={computeMaxEndDate(formData.date)} />
                <FieldError name="endDate" errors={errors} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time">{t("events.startTime")}</Label>
                <Input id="time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">{t("events.endTime")}</Label>
                <Input id="endTime" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedAttendees">{t("events.expectedAttendees")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setFormData({ ...formData, expectedAttendees: Math.max(0, formData.expectedAttendees - 10) })}
                >
                  -10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setFormData({ ...formData, expectedAttendees: Math.max(0, formData.expectedAttendees - 1) })}
                >
                  -
                </Button>
                <Input
                  id="expectedAttendees"
                  type="number"
                  min="0"
                  value={formData.expectedAttendees}
                  onChange={(e) => setFormData({ ...formData, expectedAttendees: parseInt(e.target.value) || 0 })}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setFormData({ ...formData, expectedAttendees: formData.expectedAttendees + 1 })}
                >
                  +
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setFormData({ ...formData, expectedAttendees: formData.expectedAttendees + 10 })}
                >
                  +10
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[50, 100, 200, 500, 1000].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={formData.expectedAttendees === n ? "default" : "secondary"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFormData({ ...formData, expectedAttendees: n })}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t("events.locationLabel")}</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("events.descriptionLabel")}</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            {/* QR Code & Registration Link for existing events */}
            {isEditing && event && (
              <div className="space-y-2">
                <EventQRCode eventId={event.id} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/events/registrations?eventId=${event.id}`);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t("eventRegistration.viewRegistrations")}
                </Button>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          <CustomFieldsRenderer
            entityType="event"
            entityId={event?.id}
            values={customFieldValues}
            onChange={(fieldName, value) =>
              setCustomFieldValues((prev) => ({ ...prev, [fieldName]: value }))
            }
          />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isLoading} className="w-full sm:w-auto sm:mr-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("events.deleteEvent")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("events.deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("events.deleteConfirmDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("events.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t("events.deleteEvent")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t("events.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t("events.save") : t("events.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
