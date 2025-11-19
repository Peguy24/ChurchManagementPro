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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {member ? "Modifye Manm" : "Ajoute Nouvo Manm"}
          </DialogTitle>
          <DialogDescription>
            Ranpli enfòmasyon manm nan. Klike sove lè w fini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                required
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
          </div>
          <DialogFooter>
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
