import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Upload, Edit, BarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MemberDialog from "@/components/MemberDialog";
import { supabase } from "@/integrations/supabase/client";

const mockMembers = [
  {
    id: 1,
    name: "Jean Pierre",
    email: "jean@example.com",
    phone: "+509 1234-5678",
    status: "Aktif",
    joined: "2023-05-20",
    group: "Kwayan",
  },
  {
    id: 2,
    name: "Marie Duval",
    email: "marie@example.com",
    phone: "+509 2345-6789",
    status: "Aktif",
    joined: "2024-01-15",
    group: "Fanmi",
  },
  {
    id: 3,
    name: "Paul Joseph",
    email: "paul@example.com",
    phone: "+509 3456-7890",
    status: "Inaktif",
    joined: "2022-08-10",
    group: "Kwayan",
  },
  {
    id: 4,
    name: "Sophie Laurent",
    email: "sophie@example.com",
    phone: "+509 4567-8901",
    status: "Aktif",
    joined: "2024-11-03",
    group: "Timoun",
  },
  {
    id: 5,
    name: "Marc Etienne",
    email: "marc@example.com",
    phone: "+509 5678-9012",
    status: "Transfere",
    joined: "2021-03-12",
    group: "Kwayan",
  },
];

const statusColors: Record<string, string> = {
  Aktif: "bg-success/10 text-success border-success/20",
  Inaktif: "bg-muted text-muted-foreground border-border",
  Transfere: "bg-info/10 text-info border-info/20",
};

export default function Members() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>();

  const { data: members = [], refetch } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredMembers = members.filter(
    (member: any) =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Jesyon Manm</h2>
            <p className="text-muted-foreground">
              Jere tout manm legliz ou
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Enpòte
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Ekspòte
            </Button>
            <Button size="sm" onClick={() => {
              setSelectedMember(undefined);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Ajoute Manm
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lis Manm</CardTitle>
            <CardDescription>
              Total: {members.length} manm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Chèche manm..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Non</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefòn</TableHead>
                    <TableHead>Gwoup</TableHead>
                    <TableHead>Estati</TableHead>
                    <TableHead>Dat Rantre</TableHead>
                    <TableHead className="text-right">Aksyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>{member.groups?.[0] || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[member.status || "Aktif"]}
                        >
                          {member.status || "Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/attendance/stats?memberId=${member.id}`)}
                            title="Voir les statistiques de présence"
                          >
                            <BarChart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
        <MemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={selectedMember}
          onSuccess={refetch}
        />
    </Layout>
  );
}
