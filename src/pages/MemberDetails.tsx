import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, Calendar, Users, Book, Heart, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
  const memberId = searchParams.get("memberId");

  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<MemberSimple[]>([]);
  const [memberMinistries, setMemberMinistries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMembers();
  }, []);

  useEffect(() => {
    if (memberId) {
      loadMemberDetails(memberId);
    }
  }, [memberId]);

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .order("first_name");

      if (error) throw error;
      setAllMembers(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
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
      console.error("Erreur lors du chargement des détails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberChange = (newMemberId: string) => {
    navigate(`/members/details?memberId=${newMemberId}`);
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Chargement...</p>
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
            Retour
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Aucun membre sélectionné</CardTitle>
              <CardDescription>
                Veuillez sélectionner un membre pour voir ses informations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleMemberChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
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
              Retour
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Détails du Membre
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
              <Avatar className="h-24 w-24">
                <AvatarImage src={member.photo_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {member.first_name[0]}{member.last_name[0]}
                </AvatarFallback>
              </Avatar>
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
          {/* Informations Générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations Générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Email" value={member.email} icon={Mail} />
              <InfoRow label="Téléphone" value={member.phone} icon={Phone} />
              <InfoRow label="Téléphone d'urgence" value={member.emergency_phone} icon={Phone} />
              <InfoRow label="Adresse" value={member.address} icon={MapPin} />
              <InfoRow 
                label="Date de naissance" 
                value={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('fr-FR') : null} 
                icon={Calendar} 
              />
              <InfoRow label="Statut civil" value={member.civic_status} />
            </CardContent>
          </Card>

          {/* Informations Familiales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Informations Familiales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Statut marital" value={member.marital_status} />
              <InfoRow label="Nom du conjoint" value={member.spouse_name} />
              <InfoRow 
                label="Date de mariage" 
                value={member.marriage_date ? new Date(member.marriage_date).toLocaleDateString('fr-FR') : null} 
              />
              <InfoRow 
                label="Nombre d'enfants" 
                value={member.number_of_children?.toString()} 
              />
              <InfoRow label="Noms des enfants" value={member.children_names} />
            </CardContent>
          </Card>

          {/* Informations Spirituelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Informations Spirituelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Statut de baptême" value={member.baptism_status} />
              <InfoRow 
                label="Date de baptême" 
                value={member.baptism_date ? new Date(member.baptism_date).toLocaleDateString('fr-FR') : null} 
              />
              <InfoRow 
                label="Date de conversion" 
                value={member.conversion_date ? new Date(member.conversion_date).toLocaleDateString('fr-FR') : null} 
              />
              {member.christian_experience && (
                <div className="py-2">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Expérience chrétienne</p>
                  <p className="text-sm whitespace-pre-wrap">{member.christian_experience}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formation & Groupes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Formation & Groupes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Formation académique" value={member.academic_formation} />
              <InfoRow label="Formation professionnelle" value={member.professional_formation} />
              {member.groups && member.groups.length > 0 && (
                <div className="py-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Groupes</p>
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
        {member.qr_code && (
          <Card>
            <CardHeader>
              <CardTitle>Code QR du Membre</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <img 
                src={member.qr_code} 
                alt="QR Code" 
                className="w-48 h-48"
              />
            </CardContent>
          </Card>
        )}

        {/* Ministries Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Ministè yo
            </CardTitle>
            <CardDescription>
              {memberMinistries.length > 0
                ? `Manm nan ${memberMinistries.length} ministè`
                : "Pa nan okenn ministè"}
            </CardDescription>
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
                            {mm.ministry.status === "active" ? "Aktif" : "Inaktif"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>Wòl: <span className="font-medium">{mm.role}</span></span>
                          <span>•</span>
                          <span>
                            Rantre: {mm.joined_date
                              ? new Date(mm.joined_date).toLocaleDateString("fr-FR")
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
                <p>Manm sa a pa nan okenn ministè</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Créé le: {new Date(member.created_at).toLocaleString('fr-FR')}</p>
              <p>Modifié le: {new Date(member.updated_at).toLocaleString('fr-FR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
