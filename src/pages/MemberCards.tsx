import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, UserCircle, Search, Filter } from "lucide-react";
import QRCode from "qrcode";

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
}

export default function MemberCards() {
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [baptismFilter, setBaptismFilter] = useState<string>("all");

  const { data: allMembers = [], isLoading, refetch } = useQuery({
    queryKey: ["member-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, qr_code, photo_url, phone, email, role, baptism_status")
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
          title: "Kòd QR kreye!",
          description: `${membersNeedingQR.length} kòd QR te kreye pou manm yo.`,
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
      title: "Fonksyon bientò disponib",
      description: "Telechajman tout kat yo pral disponib byento.",
    });
  };

  if (isLoading || generatingQRs) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">
              {generatingQRs ? "Jenerasyon kòd QR yo..." : "Chajman manm yo..."}
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
            <h1 className="text-3xl font-bold">Kat Manm</h1>
            <p className="text-muted-foreground">
              {members.length} kat seleksyone / {allMembers.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadAllCards}>
              <Download className="mr-2 h-4 w-4" />
              Telechaje
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Enprime
            </Button>
          </div>
        </div>

        {/* Filters Section - Hidden when printing */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filtè ak Rechèch</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Chèche Manm</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Tape non..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label htmlFor="role">Wòl</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Tout wòl yo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout wòl yo</SelectItem>
                    <SelectItem value="manm">Manm</SelectItem>
                    <SelectItem value="dyak">Dyak</SelectItem>
                    <SelectItem value="ansyen">Ansyen</SelectItem>
                    <SelectItem value="pastè">Pastè</SelectItem>
                    <SelectItem value="dirijan">Dirijan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Baptism Filter */}
              <div className="space-y-2">
                <Label htmlFor="baptism">Estati Batèm</Label>
                <Select value={baptismFilter} onValueChange={setBaptismFilter}>
                  <SelectTrigger id="baptism">
                    <SelectValue placeholder="Tout estati" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout estati</SelectItem>
                    <SelectItem value="batize">Batize</SelectItem>
                    <SelectItem value="pabatize">Pa Batize</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reset Filters */}
            {(searchQuery || roleFilter !== "all" || baptismFilter !== "all") && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                    setBaptismFilter("all");
                  }}
                >
                  Efase Filtè
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="overflow-hidden border-2 print:break-inside-avoid print:mb-4"
            >
              <CardContent className="p-6">
                {/* Header with Photo */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={`${member.first_name} ${member.last_name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {member.first_name} {member.last_name}
                    </h3>
                    {member.phone && (
                      <p className="text-sm text-muted-foreground truncate">
                        {member.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-white p-3 rounded-lg border-2 border-muted">
                    {qrCodes[member.id] ? (
                      <img
                        src={qrCodes[member.id]}
                        alt={`QR Code - ${member.first_name} ${member.last_name}`}
                        className="w-32 h-32"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-muted animate-pulse rounded"></div>
                    )}
                  </div>
                  <p className="text-xs text-center text-muted-oreground font-mono">
                    ID: {member.id.slice(0, 8)}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-xs font-semibold text-primary">
                    EglizApp - Manm Aktif
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {members.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Pa gen manm aktif
              </p>
              <p className="text-sm text-muted-foreground">
                Ajoute manm yo pou kreye kat yo
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
    </Layout>
  );
}
