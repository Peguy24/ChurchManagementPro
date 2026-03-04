import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
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
import EventQRCode from "@/components/EventQRCode";

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
      const today = new Date().toISOString().split('T')[0];
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
  }, [event, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId) throw new Error(t("events.noTenant"));
      const { error } = await supabase.from("events").insert({
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
      });
      if (error) throw error;
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
    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
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
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">{t("events.endDate")}</Label>
                <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} min={formData.date} />
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
