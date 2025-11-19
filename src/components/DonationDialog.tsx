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

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DonationDialog({
  open,
  onOpenChange,
}: DonationDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    member: "",
    amount: "",
    category: "Dim",
    method: "Lajan",
    date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Don anrejistre!",
      description: `Don $${formData.amount} te anrejistre avèk siksè.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Anrejistre Don</DialogTitle>
          <DialogDescription>
            Ranpli detay don an. Yon resi pral kreye otomatikman.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member">Non Donatè</Label>
              <Input
                id="member"
                value={formData.member}
                onChange={(e) =>
                  setFormData({ ...formData, member: e.target.value })
                }
                placeholder="Jean Pierre"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Montan ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="100.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dim">Dim (Tithe)</SelectItem>
                  <SelectItem value="Ofwann">Ofwann</SelectItem>
                  <SelectItem value="Misyon">Misyon</SelectItem>
                  <SelectItem value="Konstriksyon">Konstriksyon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method">Metòd Peman</Label>
              <Select
                value={formData.method}
                onValueChange={(value) =>
                  setFormData({ ...formData, method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lajan">Lajan Kach</SelectItem>
                  <SelectItem value="Chèk">Chèk</SelectItem>
                  <SelectItem value="Transfè">Transfè</SelectItem>
                  <SelectItem value="Mobil">Peman Mobil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Dat</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
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
            <Button type="submit">Anrejistre & Kreye Resi</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
