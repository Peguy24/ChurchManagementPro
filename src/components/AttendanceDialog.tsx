import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Html5QrcodeScanner } from "html5-qrcode";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  qr_code: string | null;
  status: string;
}

export default function AttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: AttendanceDialogProps) {
  const { toast } = useToast();
  const [eventType, setEventType] = useState("Sèvis Dimanch");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkedMembers, setCheckedMembers] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Load members from database
  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  // Filter members based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          (member) =>
            member.first_name.toLowerCase().includes(query) ||
            member.last_name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, members]);

  // Cleanup QR scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, qr_code, status")
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error("Error loading members:", error);
      toast({
        title: "Erè",
        description: "Pa kapab chaje manm yo.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkedMembers.length === 0) {
      toast({
        title: "Erè",
        description: "Ou dwe chwazi omwen yon manm.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const attendanceRecords = checkedMembers.map((memberId) => ({
        event_type: eventType,
        event_date: date,
        member_id: memberId,
        marked_by: user?.id,
        scan_method: "manual",
      }));

      const { error } = await supabase
        .from("attendance_records")
        .insert(attendanceRecords);

      if (error) throw error;

      toast({
        title: "Prezans anrejistre!",
        description: `${checkedMembers.length} manm make prezan pou ${eventType}.`,
      });
      
      setCheckedMembers([]);
      setSearchQuery("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Erè",
        description: "Pa kapab anrejistre prezans.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setCheckedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const startQRScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      if (qrReaderRef.current && !scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            handleQRScan(decodedText);
          },
          (error) => {
            // Silently handle scan errors
          }
        );
      }
    }, 100);
  };

  const stopQRScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      const member = members.find((m) => m.qr_code === qrCode);
      
      if (!member) {
        toast({
          title: "Erè",
          description: "Kòd QR sa a pa konn.",
          variant: "destructive",
        });
        return;
      }

      if (checkedMembers.includes(member.id)) {
        toast({
          title: "Atansyon",
          description: `${member.first_name} ${member.last_name} deja make prezan.`,
        });
        return;
      }

      setCheckedMembers((prev) => [...prev, member.id]);
      toast({
        title: "Siksè!",
        description: `${member.first_name} ${member.last_name} make prezan.`,
      });
    } catch (error) {
      console.error("Error processing QR scan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
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
            
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                  <Search className="mr-2 h-4 w-4" />
                  Mannyèl
                </TabsTrigger>
                <TabsTrigger value="qr" onClick={startQRScanner}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Chèche Manm</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tape non manm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Lis Prezans</Label>
                  <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-4">
                    {filteredMembers.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {members.length === 0 ? "Pa gen manm nan baz done a." : "Pa gen rezilta."}
                      </p>
                    ) : (
                      filteredMembers.map((member) => (
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
                            {member.first_name} {member.last_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {checkedMembers.length} manm seleksyone
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Skannen Kòd QR Manm</Label>
                  <div className="rounded-lg border p-4">
                    {scannerActive ? (
                      <>
                        <div id="qr-reader" ref={qrReaderRef}></div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full"
                          onClick={stopQRScanner}
                        >
                          Sispann Scanner
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Klike sou tab "Scan QR" pou kòmanse
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {checkedMembers.length} manm make prezan
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopQRScanner();
                onOpenChange(false);
              }}
            >
              Anile
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ap anrejistre..." : "Anrejistre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
