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
import { Checkbox } from "@/components/ui/checkbox";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockMembers = [
  { id: 1, name: "Jean Pierre" },
  { id: 2, name: "Marie Duval" },
  { id: 3, name: "Paul Joseph" },
  { id: 4, name: "Sophie Laurent" },
  { id: 5, name: "Marc Etienne" },
];

export default function AttendanceDialog({
  open,
  onOpenChange,
}: AttendanceDialogProps) {
  const { toast } = useToast();
  const [eventType, setEventType] = useState("Sèvis Dimanch");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkedMembers, setCheckedMembers] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Prezans anrejistre!",
      description: `${checkedMembers.length} manm make prezan pou ${eventType}.`,
    });
    onOpenChange(false);
  };

  const toggleMember = (memberId: number) => {
    setCheckedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Anrejistre Prezans</DialogTitle>
          <DialogDescription>
            Chwazi rankont la epi make manm ki prezan yo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event">Tip Rankont</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sèvis Dimanch">Sèvis Dimanch</SelectItem>
                  <SelectItem value="Etid Biblik">Etid Biblik</SelectItem>
                  <SelectItem value="Rankont Priyè">Rankont Priyè</SelectItem>
                  <SelectItem value="Rankont Jèn">Rankont Jèn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Dat</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Lis Prezans</Label>
              <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-4">
                {mockMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 rounded-lg p-2 hover:bg-muted"
                  >
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={checkedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <label
                      htmlFor={`member-${member.id}`}
                      className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {member.name}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {checkedMembers.length} manm seleksyone
              </p>
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
            <Button type="submit">Anrejistre</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
