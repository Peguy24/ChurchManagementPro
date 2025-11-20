import { useState, useEffect } from "react";
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
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    emergencyPhone: "",
    status: "Aktif",
    role: "",
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
        status: member.status || "Aktif",
        role: member.role || "",
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
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        emergencyPhone: "",
        status: "Aktif",
        role: "",
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
        const { error } = await supabase
          .from("members")
          .insert([memberData]);

        if (error) throw error;
      }

      toast({
        title: member ? "Manm modifye!" : "Manm ajoute!",
        description: `${formData.firstName} ${formData.lastName} te ${member ? "modifye" : "ajoute"} avèk siksè.`,
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erè",
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
            {member ? "Modifye Manm" : "Ajoute Nouvo Manm"}
          </DialogTitle>
          <DialogDescription>
            Ranpli enfòmasyon manm nan. Klike sove lè w fini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Jeneral</TabsTrigger>
              <TabsTrigger value="spiritual">Spirityèl</TabsTrigger>
              <TabsTrigger value="family">Fanmi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Prenon</Label>
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
                  <Label htmlFor="lastName">Non</Label>
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
                <Label htmlFor="phone">Telefòn</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+509 1234-5678"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Dat Nesans</Label>
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
                <Label htmlFor="emergencyPhone">Nimewo Ijans</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyPhone: e.target.value })
                  }
                  placeholder="+509 9876-5432"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Estati</Label>
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
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Inaktif">Inaktif</SelectItem>
                    <SelectItem value="Transfere">Transfere</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Adrès Aktyèl</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="addressNumber">#</Label>
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
                    <Label htmlFor="street">Ri</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      placeholder="Lari Prensipal"
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
                    <Label htmlFor="city">Vil</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="Pòtoprens"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">Depatman/Eta</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="Lwès"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      placeholder="HT6120"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="country">Peyi</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="Ayiti"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maritalStatus">Estati Sivil</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maritalStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chwazi estati sivil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Selibatè">Selibatè</SelectItem>
                    <SelectItem value="Marye">Marye</SelectItem>
                    <SelectItem value="Divòse">Divòse</SelectItem>
                    <SelectItem value="Vèf/Vèv">Vèf/Vèv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="civicStatus">Estati Sivik</Label>
                <Input
                  id="civicStatus"
                  value={formData.civicStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, civicStatus: e.target.value })
                  }
                  placeholder="Sitwayen, Rezidan, elatriye"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academicFormation">Fòmasyon Akademik</Label>
                <Textarea
                  id="academicFormation"
                  value={formData.academicFormation}
                  onChange={(e) =>
                    setFormData({ ...formData, academicFormation: e.target.value })
                  }
                  placeholder="Diplòm, sètifika, elatriye"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="professionalFormation">Fòmasyon Pwofesyonèl</Label>
                <Textarea
                  id="professionalFormation"
                  value={formData.professionalFormation}
                  onChange={(e) =>
                    setFormData({ ...formData, professionalFormation: e.target.value })
                  }
                  placeholder="Metye, konpetans, elatriye"
                />
              </div>
            </TabsContent>

            <TabsContent value="spiritual" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="baptismStatus">Gwoup de Manm</Label>
                <Select
                  value={formData.baptismStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, baptismStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chwazi gwoup manm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Batize">Manm Batize</SelectItem>
                    <SelectItem value="PaBatize">Manm Pa Batize</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Wòl</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chwazi wòl" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manm">Manm</SelectItem>
                    <SelectItem value="Dyak">Dyak</SelectItem>
                    <SelectItem value="Ansyen">Ansyen</SelectItem>
                    <SelectItem value="Pastè">Pastè</SelectItem>
                    <SelectItem value="Sekretè">Sekretè</SelectItem>
                    <SelectItem value="Trezorye">Trezorye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="conversionDate">Dat Konvèsyon</Label>
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
                <Label htmlFor="baptismDate">Dat Batèm</Label>
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
                <Label htmlFor="christianExperience">Eksperyans Kretyen/Ministeryèl</Label>
                <Textarea
                  id="christianExperience"
                  value={formData.christianExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, christianExperience: e.target.value })
                  }
                  placeholder="Sèvis nan legliz, responsablite, elatriye"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="family" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="marriageDate">Dat Maryaj</Label>
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
                <Label htmlFor="spouseName">Non Konjwen(t)</Label>
                <Input
                  id="spouseName"
                  value={formData.spouseName}
                  onChange={(e) =>
                    setFormData({ ...formData, spouseName: e.target.value })
                  }
                  placeholder="Non konjwen(t) ou"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="numberOfChildren">Kantite Timoun</Label>
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
                <Label htmlFor="childrenNames">Non Timoun yo</Label>
                <Textarea
                  id="childrenNames"
                  value={formData.childrenNames}
                  onChange={(e) =>
                    setFormData({ ...formData, childrenNames: e.target.value })
                  }
                  placeholder="Non tout timoun yo (separe pa vigil)"
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anile
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Chajman..." : "Sove"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
