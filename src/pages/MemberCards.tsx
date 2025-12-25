import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, UserCircle, Search, Filter, CheckSquare, Square, ClipboardCheck, Calendar, Church, Hash } from "lucide-react";
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
import { fr } from "date-fns/locale";

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

  // Initialize selected members when members change
  useEffect(() => {
    if (members.length > 0 && selectedMembers.size === 0) {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
  }, [members.length]);

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
          title: "Codes QR créés !",
          description: `${membersNeedingQR.length} codes QR ont été créés pour les membres.`,
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

  const downloadAllCards = () => {
    toast({
      title: "Fonction bientôt disponible",
      description: "Le téléchargement de toutes les cartes sera bientôt disponible.",
    });
  };

  const handleMarkAttendance = async () => {
    if (!eventType || !eventDate) {
      toast({
        title: "Erreur",
        description: "Veuillez choisir le type d'événement et la date.",
        variant: "destructive",
      });
      return;
    }

    const selectedMemberIds = Array.from(selectedMembers).filter((id) =>
      members.some((m) => m.id === id)
    );

    if (selectedMemberIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un membre.",
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
        title: "Succès !",
        description: `Présence de ${selectedMemberIds.length} membres enregistrée.`,
      });

      setAttendanceDialogOpen(false);
      setEventType("");
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Erreur",
        description: "Problème lors de l'enregistrement des présences.",
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
              {generatingQRs ? "Génération des codes QR..." : "Chargement des membres..."}
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
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h1 className="text-3xl font-bold">Cartes des Membres</h1>
            <p className="text-muted-foreground">
              {selectedCount} cartes à imprimer / {members.length} filtrés / {allMembers.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={() => setAttendanceDialogOpen(true)}
              disabled={selectedCount === 0}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Marquer Présence ({selectedCount})
            </Button>
            <Button variant="outline" onClick={downloadAllCards}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button onClick={handlePrint} disabled={selectedCount === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer ({selectedCount})
            </Button>
          </div>
        </div>

        {/* Filters Section - Hidden when printing */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filtres et Recherche</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Rechercher un Membre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Tapez un nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="membre">Membre</SelectItem>
                    <SelectItem value="diacre">Diacre</SelectItem>
                    <SelectItem value="ancien">Ancien</SelectItem>
                    <SelectItem value="pasteur">Pasteur</SelectItem>
                    <SelectItem value="dirigeant">Dirigeant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Baptism Filter */}
              <div className="space-y-2">
                <Label htmlFor="baptism">Statut Baptême</Label>
                <Select value={baptismFilter} onValueChange={setBaptismFilter}>
                  <SelectTrigger id="baptism">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="baptise">Baptisé</SelectItem>
                    <SelectItem value="nonbaptise">Non Baptisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="mt-4 flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCount === members.length}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tout Sélectionner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Tout Désélectionner
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
                  Effacer les Filtres
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {members.map((member) => {
            const isSelected = selectedMembers.has(member.id);
            const shouldPrint = isSelected;
            
            const formatDate = (dateStr: string | null) => {
              if (!dateStr) return "Non défini";
              try {
                return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
              } catch {
                return "Non défini";
              }
            };
            
            return (
              <Card
                key={member.id}
                className={`overflow-hidden border-2 border-primary/20 print:break-inside-avoid print:mb-4 relative bg-gradient-to-br from-background to-muted/30 ${
                  shouldPrint ? "" : "print:hidden"
                } ${!isSelected ? "opacity-50" : ""}`}
              >
                {/* Selection Checkbox - Hidden when printing */}
                <div className="absolute top-2 right-2 z-10 print:hidden">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                    className="h-5 w-5 bg-background border-2"
                  />
                </div>
                
                {/* Card Header with gradient */}
                <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm uppercase tracking-wide">Carte de Membre</h4>
                    {member.member_number && (
                      <span className="text-xs font-mono bg-primary-foreground/20 px-2 py-0.5 rounded">
                        {member.member_number}
                      </span>
                    )}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  {/* Photo and Name Section */}
                  <div className="flex gap-4 mb-4">
                    {/* Photo */}
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border-2 border-primary/20 shadow-md">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <UserCircle className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name and Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-bold text-lg leading-tight">
                        {member.first_name}
                      </h3>
                      <h3 className="font-bold text-lg leading-tight text-primary">
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
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">Né(e) le:</span>
                      <span>{formatDate(member.date_of_birth)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Church className="h-4 w-4 text-primary" />
                      <span className="font-medium">Membre depuis:</span>
                      <span>{formatDate(member.join_date)}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-4 w-4 text-primary" />
                        <span className="font-medium">Tél:</span>
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code Section */}
                  <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                    <div className="text-center">
                      <div className="bg-white p-2 rounded-lg border border-muted shadow-sm">
                        {qrCodes[member.id] ? (
                          <img
                            src={qrCodes[member.id]}
                            alt={`QR Code - ${member.first_name} ${member.last_name}`}
                            className="w-20 h-20"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted animate-pulse rounded"></div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        {member.qr_code || `MEMBER-${member.id.slice(0, 8)}`}
                      </p>
                    </div>
                    
                    {/* Church Branding */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">ÉgliseApp</p>
                      <p className="text-[10px] text-muted-foreground">Membre Actif</p>
                      {member.baptism_status === "baptise" && (
                        <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Baptisé
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
                Aucun membre actif
              </p>
              <p className="text-sm text-muted-foreground">
                Ajoutez des membres pour créer leurs cartes
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer la Présence</DialogTitle>
            <DialogDescription>
              Marquer la présence pour {selectedCount} membres sélectionnés
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Type d'Événement</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Choisir un événement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service Dimanche">Service du Dimanche</SelectItem>
                  <SelectItem value="Etude Biblique">Étude Biblique</SelectItem>
                  <SelectItem value="Reunion Priere">Réunion de Prière</SelectItem>
                  <SelectItem value="Groupe Jeunesse">Groupe Jeunesse</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">Dat</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttendanceDialogOpen(false)}
              disabled={submittingAttendance}
            >
              Annuler
            </Button>
            <Button
              onClick={handleMarkAttendance}
              disabled={submittingAttendance || !eventType}
            >
              {submittingAttendance ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
