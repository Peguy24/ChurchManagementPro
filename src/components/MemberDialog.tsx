import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { Download, QrCode as QrCodeIcon } from "lucide-react";

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: any;
  onSuccess?: () => void;
}

export default function MemberDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: MemberDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    emergencyPhone: "",
    status: "active",
    role: "",
    branchId: "",
    addressNumber: "",
    street: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    maritalStatus: "",
    civicStatus: "",
    conversionDate: "",
    baptismDate: "",
    baptismStatus: "",
    academicFormation: "",
    professionalFormation: "",
    christianExperience: "",
    marriageDate: "",
    spouseName: "",
    numberOfChildren: "",
    childrenNames: "",
  });

  const { data: branches } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (member) {
      const address = typeof member.address === 'string' 
        ? JSON.parse(member.address || '{}') 
        : member.address || {};
      
      setFormData({
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        email: member.email || "",
        phone: member.phone || "",
        dateOfBirth: member.date_of_birth || "",
        emergencyPhone: member.emergency_phone || "",
        status: member.status || "active",
        role: member.role || "",
        branchId: member.branch_id || "",
        addressNumber: address.number || "",
        street: address.street || "",
        apartment: address.apartment || "",
        city: address.city || "",
        state: address.state || "",
        zipCode: address.zipCode || "",
        country: address.country || "",
        maritalStatus: member.marital_status || "",
        civicStatus: member.civic_status || "",
        conversionDate: member.conversion_date || "",
        baptismDate: member.baptism_date || "",
        baptismStatus: member.baptism_status || "",
        academicFormation: member.academic_formation || "",
        professionalFormation: member.professional_formation || "",
        christianExperience: member.christian_experience || "",
        marriageDate: member.marriage_date || "",
        spouseName: member.spouse_name || "",
        numberOfChildren: member.number_of_children?.toString() || "",
        childrenNames: member.children_names || "",
      });

      // Generate QR code for existing member
      if (member.qr_code) {
        generateQRCode(member.qr_code);
      }
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        emergencyPhone: "",
        status: "active",
        role: "",
        branchId: "",
        addressNumber: "",
        street: "",
        apartment: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        maritalStatus: "",
        civicStatus: "",
        conversionDate: "",
        baptismDate: "",
        baptismStatus: "",
        academicFormation: "",
        professionalFormation: "",
        christianExperience: "",
        marriageDate: "",
        spouseName: "",
        numberOfChildren: "",
        childrenNames: "",
      });
    }
  }, [member]);

  const generateQRCode = async (qrCodeData: string) => {
    try {
      const url = await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.download = `QR-${formData.firstName}-${formData.lastName}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const addressData = {
        number: formData.addressNumber,
        street: formData.street,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };

      const memberData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        date_of_birth: formData.dateOfBirth || null,
        emergency_phone: formData.emergencyPhone || null,
        status: formData.status,
        role: formData.role || null,
        branch_id: formData.branchId || null,
        address: JSON.stringify(addressData),
        marital_status: formData.maritalStatus || null,
        civic_status: formData.civicStatus || null,
        conversion_date: formData.conversionDate || null,
        baptism_date: formData.baptismDate || null,
        baptism_status: formData.baptismStatus || null,
        academic_formation: formData.academicFormation || null,
        professional_formation: formData.professionalFormation || null,
        christian_experience: formData.christianExperience || null,
        marriage_date: formData.marriageDate || null,
        spouse_name: formData.spouseName || null,
        number_of_children: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : null,
        children_names: formData.childrenNames || null,
      };

      if (member?.id) {
        const { error } = await supabase
          .from("members")
          .update(memberData)
          .eq("id", member.id);

        if (error) throw error;
      } else {
        // For new members, insert and get the ID to generate QR code
        const { data, error } = await supabase
          .from("members")
          .insert([memberData])
          .select()
          .single();

        if (error) throw error;

        // Generate and update QR code with the member ID
        if (data) {
          const qrCodeData = `MEMBER-${data.id}`;
          const { error: updateError } = await supabase
            .from("members")
            .update({ qr_code: qrCodeData })
            .eq("id", data.id);

          if (updateError) throw updateError;

          // Generate QR code image for display
          await generateQRCode(qrCodeData);

          // Send welcome email to new member
          if (formData.email) {
            try {
              await supabase.functions.invoke("send-welcome-email", {
                body: {
                  memberId: data.id,
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  email: formData.email,
                },
              });
              console.log("Welcome email sent successfully");
            } catch (emailError) {
              console.error("Error sending welcome email:", emailError);
              // Don't throw error here - we don't want to fail member creation if email fails
            }
          }
        }
      }

      toast({
        title: member ? "Membre modifié!" : "Membre ajouté!",
        description: `${formData.firstName} ${formData.lastName} a été ${member ? "modifié" : "ajouté"} avec succès.`,
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member ? "Modifier le Membre" : "Ajouter un Nouveau Membre"}
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations du membre. Cliquez sur enregistrer quand vous avez terminé.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="spiritual">Spirituel</TabsTrigger>
              <TabsTrigger value="family">Famille</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Jean"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Pierre"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jean@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+33 1 23 45 67 89"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Date de Naissance</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergencyPhone">Numéro d'Urgence</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyPhone: e.target.value })
                  }
                  placeholder="+33 1 98 76 54 32"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="transferred">Transféré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branche</Label>
                <Select
                  value={formData.branchId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une branche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {branches?.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Adresse Actuelle</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="addressNumber">N°</Label>
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, addressNumber: e.target.value })
                      }
                      placeholder="123"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="street">Rue</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      placeholder="Rue Principale"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apartment">Apt</Label>
                    <Input
                      id="apartment"
                      value={formData.apartment}
                      onChange={(e) =>
                        setFormData({ ...formData, apartment: e.target.value })
                      }
                      placeholder="A-12"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="Paris"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">Département/Région</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="Île-de-France"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">Code Postal</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      placeholder="75001"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="France"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maritalStatus">État Civil</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maritalStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir l'état civil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Célibataire">Célibataire</SelectItem>
                    <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                    <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                    <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="civicStatus">Statut Civique</Label>
                <Input
                  id="civicStatus"
                  value={formData.civicStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, civicStatus: e.target.value })
                  }
                  placeholder="Citoyen, Résident, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academicFormation">Formation Académique</Label>
                <Textarea
                  id="academicFormation"
                  value={formData.academicFormation}
                  onChange={(e) =>
                    setFormData({ ...formData, academicFormation: e.target.value })
                  }
                  placeholder="Diplômes, certificats, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="professionalFormation">Formation Professionnelle</Label>
                <Textarea
                  id="professionalFormation"
                  value={formData.professionalFormation}
                  onChange={(e) =>
                    setFormData({ ...formData, professionalFormation: e.target.value })
                  }
                  placeholder="Métier, compétences, etc."
                />
              </div>
            </TabsContent>

            <TabsContent value="spiritual" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="baptismStatus">Groupe de Membre</Label>
                <Select
                  value={formData.baptismStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, baptismStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baptisé">Membre Baptisé</SelectItem>
                    <SelectItem value="NonBaptisé">Membre Non Baptisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membre">Membre</SelectItem>
                    <SelectItem value="Diacre">Diacre</SelectItem>
                    <SelectItem value="Ancien">Ancien</SelectItem>
                    <SelectItem value="Pasteur">Pasteur</SelectItem>
                    <SelectItem value="Secrétaire">Secrétaire</SelectItem>
                    <SelectItem value="Trésorier">Trésorier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="conversionDate">Date de Conversion</Label>
                <Input
                  id="conversionDate"
                  type="date"
                  value={formData.conversionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, conversionDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baptismDate">Date de Baptême</Label>
                <Input
                  id="baptismDate"
                  type="date"
                  value={formData.baptismDate}
                  onChange={(e) =>
                    setFormData({ ...formData, baptismDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="christianExperience">Expérience Chrétienne/Ministérielle</Label>
                <Textarea
                  id="christianExperience"
                  value={formData.christianExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, christianExperience: e.target.value })
                  }
                  placeholder="Service dans l'église, responsabilités, etc."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="family" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="marriageDate">Date de Mariage</Label>
                <Input
                  id="marriageDate"
                  type="date"
                  value={formData.marriageDate}
                  onChange={(e) =>
                    setFormData({ ...formData, marriageDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="spouseName">Nom du Conjoint(e)</Label>
                <Input
                  id="spouseName"
                  value={formData.spouseName}
                  onChange={(e) =>
                    setFormData({ ...formData, spouseName: e.target.value })
                  }
                  placeholder="Nom de votre conjoint(e)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="numberOfChildren">Nombre d'Enfants</Label>
                <Input
                  id="numberOfChildren"
                  type="number"
                  value={formData.numberOfChildren}
                  onChange={(e) =>
                    setFormData({ ...formData, numberOfChildren: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="childrenNames">Noms des Enfants</Label>
                <Textarea
                  id="childrenNames"
                  value={formData.childrenNames}
                  onChange={(e) =>
                    setFormData({ ...formData, childrenNames: e.target.value })
                  }
                  placeholder="Noms de tous les enfants (séparés par une virgule)"
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* QR Code Section - Only show for existing members with QR code */}
          {member && qrCodeUrl && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50 mt-6">
              <div className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                <Label className="text-base font-semibold">QR Code du Membre</Label>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border-2 border-primary/20 p-4 bg-background">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Imprimez ce QR code pour que le membre puisse l'utiliser pour marquer sa présence
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadQRCode}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le QR Code
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Chargement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
