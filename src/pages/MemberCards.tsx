import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, UserCircle, Search, Filter, CheckSquare, Square, ClipboardCheck, Calendar, Church, Hash, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "qrcode";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { generateMemberCardsPDF, downloadPDF, CardCustomization } from "@/lib/memberCardPDF";
import { useLanguage } from "@/contexts/LanguageContext";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  qr_code: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  baptism_status: string | null;
  date_of_birth: string | null;
  join_date: string | null;
  member_number: string | null;
}

export default function MemberCards() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [baptismFilter, setBaptismFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const { data: allMembers = [], isLoading, refetch } = useQuery({
    queryKey: ["member-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, qr_code, photo_url, phone, email, role, baptism_status, date_of_birth, join_date, member_number")
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      return data as Member[];
    },
  });

  // Fetch church settings for card customization
  const { data: churchSettings } = useQuery({
    queryKey: ["church-settings-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value");
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      
      return settingsMap;
    },
  });

  const cardCustomization: CardCustomization | undefined = churchSettings ? {
    primaryColor: churchSettings.card_primary_color || "#3B82F6",
    secondaryColor: churchSettings.card_secondary_color || "#1E40AF",
    textColor: churchSettings.card_text_color || "#FFFFFF",
    showLogo: churchSettings.card_show_logo === "true",
    churchNameOnCard: churchSettings.card_church_name_on_card === "true",
    churchName: churchSettings.church_name || "",
    logoUrl: churchSettings.church_logo_url || "",
  } : undefined;

  // Filter members based on search and filters
  const members = allMembers.filter((member) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      (member.role && member.role.toLowerCase() === roleFilter.toLowerCase());

    const matchesBaptism =
      baptismFilter === "all" ||
      (member.baptism_status && member.baptism_status.toLowerCase() === baptismFilter.toLowerCase());

    return matchesSearch && matchesRole && matchesBaptism;
  });

  // DON'T auto-select all - let user choose
  // Remove the auto-select effect that was causing issues

  const dateLocale = language === 'en' ? enUS : fr;

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedMembers(new Set(members.map((m) => m.id)));
  };

  const deselectAll = () => {
    setSelectedMembers(new Set());
  };

  const selectedCount = Array.from(selectedMembers).filter((id) =>
    members.some((m) => m.id === id)
  ).length;

  // Generate QR codes for all members
  useEffect(() => {
    if (members.length > 0) {
      generateAllQRCodes();
    }
  }, [members]);

  const generateAllQRCodes = async () => {
    setGeneratingQRs(true);
    const codes: Record<string, string> = {};
    const membersNeedingQR: string[] = [];

    for (const member of members) {
      try {
        // If member doesn't have a QR code in database, create one
        if (!member.qr_code) {
          membersNeedingQR.push(member.id);
          const qrCodeData = `MEMBER-${member.id}`;
          const url = await QRCode.toDataURL(qrCodeData, {
            width: 200,
            margin: 1,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          codes[member.id] = url;
        } else {
          // Generate QR code image from existing data
          const url = await QRCode.toDataURL(member.qr_code, {
            width: 200,
            margin: 1,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          codes[member.id] = url;
        }
      } catch (error) {
        console.error(`Error generating QR code for member ${member.id}:`, error);
      }
    }

    // Update database for members without QR codes
    if (membersNeedingQR.length > 0) {
      try {
        const updates = membersNeedingQR.map((id) => ({
          id,
          qr_code: `MEMBER-${id}`,
        }));

        for (const update of updates) {
          await supabase
            .from("members")
            .update({ qr_code: update.qr_code })
            .eq("id", update.id);
        }

        toast({
          title: t("memberCards.qrCodesCreated"),
          description: `${membersNeedingQR.length} ${t("memberCards.qrCodesCreatedDesc")}`,
        });
        
        refetch();
      } catch (error) {
        console.error("Error updating QR codes:", error);
      }
    }

    setQrCodes(codes);
    setGeneratingQRs(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadAllCards = async () => {
    const selectedMembersList = members.filter((m) => selectedMembers.has(m.id));
    
    if (selectedMembersList.length === 0) {
      toast({
        title: t("memberCards.noMemberSelected"),
        description: t("memberCards.selectAtLeastOne"),
        variant: "destructive",
      });
      return;
    }

    setGeneratingPDF(true);
    setPdfProgress(0);

    try {
      toast({
        title: t("memberCards.generatingCards"),
        description: `${t("memberCards.creatingCards")} ${selectedMembersList.length} ${t("memberCards.membersText")}`,
      });

      const pdfBlob = await generateMemberCardsPDF(selectedMembersList, (progress) => {
        setPdfProgress(progress);
      }, cardCustomization);

      const filename = selectedMembersList.length === 1
        ? `carte-${selectedMembersList[0].first_name}-${selectedMembersList[0].last_name}.pdf`
        : `cartes-membres-${format(new Date(), "yyyy-MM-dd")}.pdf`;

      downloadPDF(pdfBlob, filename);

      toast({
        title: t("memberCards.pdfGenerated"),
        description: `${selectedMembersList.length} ${t("memberCards.cardsDownloaded")}`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: t("common.error"),
        description: t("memberCards.errorGeneratingPdf"),
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
      setPdfProgress(0);
    }
  };

  const handleMarkAttendance = async () => {
    if (!eventType || !eventDate) {
      toast({
        title: t("common.error"),
        description: t("memberCards.attendanceDialog.selectEvent"),
        variant: "destructive",
      });
      return;
    }

    const selectedMemberIds = Array.from(selectedMembers).filter((id) =>
      members.some((m) => m.id === id)
    );

    if (selectedMemberIds.length === 0) {
      toast({
        title: t("common.error"),
        description: t("memberCards.attendanceDialog.selectMember"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingAttendance(true);

      const records = selectedMemberIds.map((memberId) => ({
        member_id: memberId,
        event_type: eventType,
        event_date: eventDate,
        scan_method: "bulk_selection",
      }));

      const { error } = await supabase
        .from("attendance_records")
        .insert(records);

      if (error) throw error;

      toast({
        title: t("memberCards.attendanceDialog.success"),
        description: t("memberCards.attendanceDialog.attendanceRecorded").replace("{count}", String(selectedMemberIds.length)),
      });

      setAttendanceDialogOpen(false);
      setEventType("");
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: t("common.error"),
        description: t("memberCards.attendanceDialog.error"),
        variant: "destructive",
      });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  if (isLoading || generatingQRs) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">
              {generatingQRs ? t("memberCards.generatingQr") : t("memberCards.loading")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header - Hidden when printing */}
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t("memberCards.title")}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {selectedCount} {t("memberCards.cardsSelected")} / {members.length} {t("memberCards.filtered")} / {allMembers.length} {t("memberCards.total")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                variant="default" 
                onClick={() => setAttendanceDialogOpen(true)}
                disabled={selectedCount === 0}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("memberCards.markAttendance")}</span>
                <span className="sm:hidden">{t("memberCards.markAttendance")}</span>
                <span className="ml-1">({selectedCount})</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadAllCards}
                disabled={selectedCount === 0 || generatingPDF}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <FileDown className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{generatingPDF ? t("memberCards.generating") : t("memberCards.downloadPdf")}</span>
                <span className="sm:hidden">PDF</span>
                <span className="ml-1">({selectedCount})</span>
              </Button>
              <Button onClick={handlePrint} disabled={selectedCount === 0} size="sm" className="flex-1 sm:flex-none">
                <Printer className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("memberCards.print")}</span>
                <span className="ml-1">({selectedCount})</span>
              </Button>
            </div>
          </div>

          {/* PDF Generation Progress */}
          {generatingPDF && (
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t("memberCards.generatingPdf")}</span>
                  <span className="font-medium">{pdfProgress}%</span>
                </div>
                <Progress value={pdfProgress} className="h-2" />
              </div>
            </div>
          )}
        </div>

        {/* Filters Section - Hidden when printing */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("memberCards.filtersAndSearch")}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">{t("memberCards.searchMember")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("memberCards.typeName")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label htmlFor="role">{t("memberCards.role")}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder={t("memberCards.allRoles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("memberCards.allRoles")}</SelectItem>
                    <SelectItem value="membre">{t("memberCards.member")}</SelectItem>
                    <SelectItem value="diacre">{t("memberCards.deacon")}</SelectItem>
                    <SelectItem value="ancien">{t("memberCards.elder")}</SelectItem>
                    <SelectItem value="pasteur">{t("memberCards.pastor")}</SelectItem>
                    <SelectItem value="dirigeant">{t("memberCards.leader")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Baptism Filter */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="baptism">{t("memberCards.baptismStatus")}</Label>
                <Select value={baptismFilter} onValueChange={setBaptismFilter}>
                  <SelectTrigger id="baptism">
                    <SelectValue placeholder={t("memberCards.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("memberCards.allStatuses")}</SelectItem>
                    <SelectItem value="baptise">{t("memberCards.baptized")}</SelectItem>
                    <SelectItem value="nonbaptise">{t("memberCards.notBaptized")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCount === members.length}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {t("memberCards.selectAll")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                >
                  <Square className="mr-2 h-4 w-4" />
                  {t("memberCards.deselectAll")}
                </Button>
              </div>

              {/* Reset Filters */}
              {(searchQuery || roleFilter !== "all" || baptismFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                    setBaptismFilter("all");
                  }}
                >
                  {t("memberCards.clearFilters")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4">
          {members.map((member) => {
            const isSelected = selectedMembers.has(member.id);
            const shouldPrint = isSelected;
            
            const formatDate = (dateStr: string | null) => {
              if (!dateStr) return t("memberCards.notDefined");
              try {
                return format(new Date(dateStr), "dd MMM yyyy", { locale: dateLocale });
              } catch {
                return t("memberCards.notDefined");
              }
            };
            
            return (
              <Card
                key={member.id}
                className={`overflow-hidden border-2 transition-all cursor-pointer print:break-inside-avoid print:mb-4 relative bg-gradient-to-br from-background to-muted/30 ${
                  shouldPrint ? "" : "print:hidden"
                } ${isSelected ? "border-primary shadow-lg" : "border-primary/20 opacity-60 hover:opacity-80"}`}
                onClick={() => toggleMemberSelection(member.id)}
              >
                {/* Selection Checkbox - Hidden when printing */}
                <div 
                  className="absolute top-2 right-2 z-10 print:hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                    className="h-5 w-5 bg-background border-2"
                  />
                </div>
                
                {/* Card Header with gradient */}
                <div 
                  className="px-3 sm:px-4 py-2 sm:py-3 text-white flex items-center gap-2"
                  style={{ 
                    backgroundColor: cardCustomization?.primaryColor || 'hsl(var(--primary))'
                  }}
                >
                  {cardCustomization?.showLogo && cardCustomization?.logoUrl && (
                    <img 
                      src={cardCustomization.logoUrl} 
                      alt="Logo" 
                      className="h-8 w-8 object-contain rounded-full bg-white p-0.5"
                    />
                  )}
                  <div className="flex-1 flex items-center justify-between">
                    <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide">
                      {cardCustomization?.churchNameOnCard && cardCustomization?.churchName 
                        ? cardCustomization.churchName.length > 25 
                          ? cardCustomization.churchName.slice(0, 25) + "..." 
                          : cardCustomization.churchName
                        : t("memberCards.memberCard")}
                    </h4>
                    {member.member_number && (
                      <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
                        {member.member_number}
                      </span>
                    )}
                  </div>
                </div>
                
                <CardContent className="p-3 sm:p-4">
                  {/* Photo and Name Section */}
                  <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Photo */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border-2 border-primary/20 shadow-md">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name and Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-bold text-base sm:text-lg leading-tight truncate">
                        {member.first_name}
                      </h3>
                      <h3 className="font-bold text-base sm:text-lg leading-tight text-primary truncate">
                        {member.last_name}
                      </h3>
                      {member.role && (
                        <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Member Info */}
                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                      <span className="font-medium">{t("memberCards.bornOn")}</span>
                      <span className="truncate">{formatDate(member.date_of_birth)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Church className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                      <span className="font-medium">{t("memberCards.memberSince")}</span>
                      <span className="truncate">{formatDate(member.join_date)}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">{t("memberCards.phone")}</span>
                        <span className="truncate">{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code Section */}
                  <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-primary/10">
                    <div className="text-center">
                      <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-muted shadow-sm">
                        {qrCodes[member.id] ? (
                          <img
                            src={qrCodes[member.id]}
                            alt={`QR Code - ${member.first_name} ${member.last_name}`}
                            className="w-16 h-16 sm:w-20 sm:h-20"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted animate-pulse rounded"></div>
                        )}
                      </div>
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground font-mono mt-1 max-w-[80px] sm:max-w-none truncate">
                        {member.qr_code || `MEMBER-${member.id.slice(0, 8)}`}
                      </p>
                    </div>
                    
                    {/* Church Branding */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">ÉgliseApp</p>
                      <p className="text-[10px] text-muted-foreground">{t("memberCards.activeMember")}</p>
                      {member.baptism_status === "baptise" && (
                        <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                          {t("memberCards.baptized")}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {members.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {t("memberCards.noActiveMembers")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("memberCards.addMembersToCreate")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print\\:grid-cols-2,
          .print\\:grid-cols-2 * {
            visibility: visible;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("memberCards.attendanceDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("memberCards.attendanceDialog.description")} {selectedCount} {t("memberCards.attendanceDialog.membersSelected")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">{t("memberCards.attendanceDialog.eventType")}</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder={t("memberCards.attendanceDialog.chooseEvent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service Dimanche">{t("memberCards.attendanceDialog.sundayService")}</SelectItem>
                  <SelectItem value="Etude Biblique">{t("memberCards.attendanceDialog.bibleStudy")}</SelectItem>
                  <SelectItem value="Reunion Priere">{t("memberCards.attendanceDialog.prayerMeeting")}</SelectItem>
                  <SelectItem value="Groupe Jeunesse">{t("memberCards.attendanceDialog.youthGroup")}</SelectItem>
                  <SelectItem value="Autre">{t("memberCards.attendanceDialog.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">{t("memberCards.attendanceDialog.date")}</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setAttendanceDialogOpen(false)}
              disabled={submittingAttendance}
              className="w-full sm:w-auto"
            >
              {t("memberCards.attendanceDialog.cancel")}
            </Button>
            <Button
              onClick={handleMarkAttendance}
              disabled={submittingAttendance || !eventType}
              className="w-full sm:w-auto"
            >
              {submittingAttendance ? t("memberCards.attendanceDialog.saving") : t("memberCards.attendanceDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
