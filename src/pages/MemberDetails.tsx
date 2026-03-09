import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, Calendar, Users, Book, Heart, Briefcase, Plus, History, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatar } from "@/components/SignedAvatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import MemberAttendanceStats from "@/components/MemberAttendanceStats";
import MemberDonationStats from "@/components/MemberDonationStats";
import MemberDocuments from "@/components/MemberDocuments";
import MemberTimeline from "@/components/MemberTimeline";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateForDisplay, todayInputValue } from "@/lib/date";
import QRCode from "qrcode";


interface MemberSimple {
  id: string;
  first_name: string;
  last_name: string;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  emergency_phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  role: string | null;
  status: string | null;
  member_type: string | null;
  member_number: string | null;
  groups: string[] | null;
  marital_status: string | null;
  marriage_date: string | null;
  spouse_name: string | null;
  number_of_children: number | null;
  children_names: string | null;
  civic_status: string | null;
  academic_formation: string | null;
  professional_formation: string | null;
  baptism_status: string | null;
  baptism_date: string | null;
  conversion_date: string | null;
  christian_experience: string | null;
  origin_church: string | null;
  join_date: string | null;
  photo_url: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  transferred: "bg-info/10 text-info border-info/20",
};

export default function MemberDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const memberId = searchParams.get("id") || searchParams.get("memberId");

  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<MemberSimple[]>([]);
  const [memberMinistries, setMemberMinistries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMinistryDialog, setAddMinistryDialog] = useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [ministryRole, setMinistryRole] = useState("member");
  const [joinedDate, setJoinedDate] = useState(todayInputValue());
  const [addingMinistry, setAddingMinistry] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const locale = language === 'en' ? 'en-US' : language === 'ht' ? 'fr-FR' : 'fr-FR';

  useEffect(() => {
    loadAllMembers();
  }, []);

  useEffect(() => {
    if (memberId) {
      loadMemberDetails(memberId);
    }
  }, [memberId]);

  // Generate QR code image from text
  useEffect(() => {
    const generateQrCode = async () => {
      if (member?.qr_code || member?.member_number) {
        try {
          const qrContent = member.qr_code || `MEMBER-${member.id}`;
          const dataUrl = await QRCode.toDataURL(qrContent, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error("Error generating QR code:", error);
          setQrCodeDataUrl(null);
        }
      } else {
        setQrCodeDataUrl(null);
      }
    };
    
    generateQrCode();
  }, [member]);

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .order("first_name");

      if (error) throw error;
      setAllMembers(data || []);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadMemberDetails = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setMember(data);

      // Load member ministries
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministry_members")
        .select(`
          id,
          role,
          joined_date,
          ministry:ministries(id, name, status)
        `)
        .eq("member_id", id);

      if (ministriesError) throw ministriesError;
      setMemberMinistries(ministriesData || []);
    } catch (error) {
      console.error("Error loading details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberChange = (newMemberId: string) => {
    navigate(`/members/details?id=${newMemberId}`);
  };

  const loadAvailableMinistries = async () => {
    if (!memberId) return [];
    
    try {
      const currentMinistryIds = memberMinistries.map(mm => mm.ministry.id);
      
      let query = supabase
        .from("ministries")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      
      if (currentMinistryIds.length > 0) {
        query = query.not("id", "in", `(${currentMinistryIds.join(",")})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error loading ministries:", error);
      return [];
    }
  };

  const { data: availableMinistries = [] } = useQuery({
    queryKey: ["available-ministries", memberId, memberMinistries],
    queryFn: loadAvailableMinistries,
    enabled: addMinistryDialog && !!memberId,
  });

  const handleAddToMinistry = async () => {
    if (!selectedMinistryId || !memberId) return;
    
    setAddingMinistry(true);
    try {
      const { error } = await supabase
        .from("ministry_members")
        .insert([{
          ministry_id: selectedMinistryId,
          member_id: memberId,
          role: ministryRole,
          joined_date: joinedDate,
        }]);

      if (error) throw error;
      
      toast.success(t("memberDetails.memberAddedToMinistry"));
      setAddMinistryDialog(false);
      setSelectedMinistryId("");
      setMinistryRole("member");
      setJoinedDate(new Date().toISOString().split('T')[0]);
      
      loadMemberDetails(memberId);
    } catch (error: any) {
      toast.error(error.message || t("common.error"));
    } finally {
      setAddingMinistry(false);
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-sm whitespace-pre-line">{value}</p>
        </div>
      </div>
    );
  };

  const formatAddress = (addressData: string | null): string | null => {
    if (!addressData) return null;
    
    try {
      const address = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
      
      const parts: string[] = [];
      
      const line1Parts: string[] = [];
      if (address.number) line1Parts.push(address.number);
      if (address.street) line1Parts.push(address.street);
      if (address.apartment) line1Parts.push(`Apt ${address.apartment}`);
      if (line1Parts.length > 0) parts.push(line1Parts.join(' '));
      
      const line2Parts: string[] = [];
      if (address.city) line2Parts.push(address.city);
      if (address.state) line2Parts.push(address.state);
      if (address.zipCode) line2Parts.push(address.zipCode);
      if (line2Parts.length > 0) parts.push(line2Parts.join(', '));
      
      if (address.country) parts.push(address.country);
      
      const formattedAddress = parts.join('\n');
      return formattedAddress || null;
    } catch (e) {
      return addressData;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t("memberDetails.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!member) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate("/members")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("memberDetails.back")}
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{t("memberDetails.noMemberSelected")}</CardTitle>
              <CardDescription>
                {t("memberDetails.selectMemberDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleMemberChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("memberDetails.selectMember")} />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/members")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("memberDetails.back")}
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {t("memberDetails.title")}
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={memberId || ""} onValueChange={handleMemberChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <SignedAvatar
                storedUrl={member.photo_url}
                bucket="member-photos"
                fallbackText={`${member.first_name[0]}${member.last_name[0]}`}
                className="h-24 w-24"
                fallbackClassName="text-2xl"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">
                    {member.first_name} {member.last_name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={statusColors[member.status || "active"]}
                  >
                    {member.status || "active"}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {member.role && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {member.role}
                    </div>
                  )}
                  {member.member_type && (
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{member.member_type}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("memberDetails.generalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label={t("memberDetails.email")} value={member.email} icon={Mail} />
              <InfoRow label={t("memberDetails.phone")} value={member.phone} icon={Phone} />
              <InfoRow label={t("memberDetails.emergencyPhone")} value={member.emergency_phone} icon={Phone} />
              <InfoRow label={t("memberDetails.address")} value={formatAddress(member.address)} icon={MapPin} />
              <InfoRow 
                label={t("memberDetails.dateOfBirth")} 
                value={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString(locale) : null} 
                icon={Calendar} 
              />
              <InfoRow label={t("memberDetails.civilStatus")} value={member.civic_status} />
            </CardContent>
          </Card>

          {/* Family Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                {t("memberDetails.familyInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label={t("memberDetails.maritalStatus")} value={member.marital_status} />
              <InfoRow label={t("memberDetails.spouseName")} value={member.spouse_name} />
              <InfoRow 
                label={t("memberDetails.marriageDate")} 
                value={member.marriage_date ? new Date(member.marriage_date).toLocaleDateString(locale) : null} 
              />
              <InfoRow 
                label={t("memberDetails.numberOfChildren")} 
                value={member.number_of_children?.toString()} 
              />
              <InfoRow label={t("memberDetails.childrenNames")} value={member.children_names} />
            </CardContent>
          </Card>

          {/* Spiritual Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                {t("memberDetails.spiritualInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label={t("memberDetails.baptismStatus")} value={member.baptism_status} />
              <InfoRow 
                label={t("memberDetails.baptismDate")} 
                value={member.baptism_date ? new Date(member.baptism_date).toLocaleDateString(locale) : null} 
              />
              <InfoRow 
                label={t("memberDetails.conversionDate")} 
                value={member.conversion_date ? new Date(member.conversion_date).toLocaleDateString(locale) : null} 
              />
              {member.christian_experience && (
                <div className="py-2">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("memberDetails.christianExperience")}</p>
                  <p className="text-sm whitespace-pre-wrap">{member.christian_experience}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education & Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("memberDetails.formationGroups")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label={t("memberDetails.academicFormation")} value={member.academic_formation} />
              <InfoRow label={t("memberDetails.professionalFormation")} value={member.professional_formation} />
              {member.groups && member.groups.length > 0 && (
                <div className="py-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">{t("memberDetails.groups")}</p>
                  <div className="flex flex-wrap gap-2">
                    {member.groups.map((group, index) => (
                      <Badge key={index} variant="secondary">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t("memberDetails.qrCode")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 border rounded-lg p-2 bg-white"
                />
              ) : (
                <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-muted">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    {t("memberDetails.qrCodeUnavailable")}
                  </p>
                </div>
              )}
              {member.qr_code && (
                <p className="text-sm text-muted-foreground font-mono">
                  {member.qr_code}
                </p>
              )}
              {member.member_number && (
                <Badge variant="outline" className="font-mono">
                  {member.member_number}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        {memberId && (
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t("memberDetails.timeline")}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("memberDetails.attendanceTab")}
              </TabsTrigger>
              <TabsTrigger value="donations" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {t("memberDetails.donationsTab")}
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                {t("memberDetails.documentsTab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <MemberTimeline memberId={memberId} />
            </TabsContent>

            <TabsContent value="attendance" className="mt-6">
              <MemberAttendanceStats memberId={memberId} />
            </TabsContent>

            <TabsContent value="donations" className="mt-6">
              <MemberDonationStats memberId={memberId} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <MemberDocuments memberId={memberId} />
            </TabsContent>
          </Tabs>
        )}

        {/* Ministries Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {t("memberDetails.ministries")}
                </CardTitle>
                <CardDescription>
                  {memberMinistries.length > 0
                    ? t("memberDetails.memberOfMinistries").replace("{count}", String(memberMinistries.length))
                    : t("memberDetails.noMinistryMembership")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setAddMinistryDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("memberDetails.addToMinistry")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {memberMinistries.length > 0 ? (
              <div className="space-y-3">
                {memberMinistries.map((mm: any) => (
                  <div
                    key={mm.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/ministries/details?ministryId=${mm.ministry.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{mm.ministry.name}</p>
                          <Badge
                            variant="outline"
                            className={
                              mm.ministry.status === "active"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground border-border"
                            }
                          >
                            {mm.ministry.status === "active" ? t("memberDetails.active") : t("memberDetails.inactive")}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{t("memberDetails.roleLabel")}: <span className="font-medium">{mm.role}</span></span>
                          <span>•</span>
                          <span>
                            {t("memberDetails.membershipLabel")}: {mm.joined_date
                              ? new Date(mm.joined_date).toLocaleDateString(locale)
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{mm.role}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>{t("memberDetails.noMinistryMessage")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("memberDetails.createdAt")}: {new Date(member.created_at).toLocaleString(locale)}</p>
              <p>{t("memberDetails.updatedAt")}: {new Date(member.updated_at).toLocaleString(locale)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add to Ministry Dialog */}
      <Dialog open={addMinistryDialog} onOpenChange={setAddMinistryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("memberDetails.addToMinistryTitle")}</DialogTitle>
            <DialogDescription>
              {t("memberDetails.addToMinistryDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("memberDetails.ministry")}</Label>
              <Select value={selectedMinistryId} onValueChange={setSelectedMinistryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("memberDetails.selectMinistry")} />
                </SelectTrigger>
                <SelectContent>
                  {availableMinistries.map((ministry: any) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t("memberDetails.role")}</Label>
              <Select value={ministryRole} onValueChange={setMinistryRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("memberDetails.memberRole")}</SelectItem>
                  <SelectItem value="coordinator">{t("memberDetails.coordinatorRole")}</SelectItem>
                  <SelectItem value="assistant">{t("memberDetails.assistantRole")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t("memberDetails.joinDate")}</Label>
              <Input
                type="date"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setAddMinistryDialog(false)}
            >
              {t("memberDetails.cancel")}
            </Button>
            <Button
              onClick={handleAddToMinistry}
              disabled={!selectedMinistryId || addingMinistry}
            >
              {addingMinistry ? t("memberDetails.adding") : t("memberDetails.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
