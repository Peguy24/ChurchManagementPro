import { useState } from "react";
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

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    group: string;
  };
}

export default function MemberDialog({
  open,
  onOpenChange,
  member,
}: MemberDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: member?.name || "",
    email: member?.email || "",
    phone: member?.phone || "",
    status: member?.status || "Aktif",
    group: member?.group || "Kwayan",
    address: "",
    maritalStatus: "",
    civicStatus: "",
    conversionDate: "",
    baptismDate: "",
    academicFormation: "",
    professionalFormation: "",
    christianExperience: "",
    marriageDate: "",
    spouseName: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: member ? "Manm modifye!" : "Manm ajoute!",
      description: `${formData.name} te ${member ? "modifye" : "ajoute"} avèk siksè.`,
    });
    onOpenChange(false);
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
              <div className="grid gap-2">
                <Label htmlFor="name">Non Konple</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jean Pierre"
                  required
                />
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
                <Label htmlFor="address">Adrès Aktyèl</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Antre adrès la"
                />
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
              <div className="grid gap-2">
                <Label htmlFor="group">Gwoup</Label>
                <Select
                  value={formData.group}
                  onValueChange={(value) =>
                    setFormData({ ...formData, group: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kwayan">Kwayan</SelectItem>
                    <SelectItem value="Fanmi">Fanmi</SelectItem>
                    <SelectItem value="Timoun">Timoun</SelectItem>
                    <SelectItem value="Jèn">Jèn</SelectItem>
                  </SelectContent>
                </Select>
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
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anile
            </Button>
            <Button type="submit">Sove</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
