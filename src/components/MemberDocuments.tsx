import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Upload, Download, Trash2, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { todayInputValue, parseDateOnly } from "@/lib/date";
import { format } from "date-fns";
import { fr } from "date-fns/locale";


interface MemberDocumentsProps {
  memberId: string;
}

interface Document {
  id: string;
  member_id: string;
  document_type: string;
  document_name: string;
  document_url: string | null;
  notes: string | null;
  document_date: string;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: "adhesion", label: "Formulaire d'adhésion" },
  { value: "bapteme", label: "Certificat de baptême" },
  { value: "mariage", label: "Certificat de mariage" },
  { value: "transfert", label: "Lettre de transfert" },
  { value: "engagement", label: "Engagement de service" },
  { value: "formation", label: "Attestation de formation" },
  { value: "identite", label: "Pièce d'identité" },
  { value: "autre", label: "Autre document" },
];

export default function MemberDocuments({ memberId }: MemberDocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    documentType: "",
    documentName: "",
    documentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["member-documents", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_documents")
        .select("*")
        .eq("member_id", memberId)
        .order("document_date", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!memberId,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier ne doit pas dépasser 10 Mo.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      if (!formData.documentName) {
        setFormData({ ...formData, documentName: file.name.split(".")[0] });
      }
    }
  };

  const uploadDocument = async () => {
    if (!formData.documentType || !formData.documentName) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le type et le nom du document.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let documentUrl = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${memberId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("member-documents")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Get signed URL (private bucket)
        const { data: signedData } = await supabase.storage
          .from("member-documents")
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

        documentUrl = signedData?.signedUrl || fileName;
      }

      // Insert document record
      const { error } = await supabase.from("member_documents").insert([
        {
          member_id: memberId,
          document_type: formData.documentType,
          document_name: formData.documentName,
          document_url: documentUrl,
          document_date: formData.documentDate,
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Document ajouté",
        description: "Le document a été enregistré avec succès.",
      });

      // Reset form
      setFormData({
        documentType: "",
        documentName: "",
        documentDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAddDialogOpen(false);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["member-documents", memberId] });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le document.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      const { error } = await supabase
        .from("member_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé.",
      });

      queryClient.invalidateQueries({ queryKey: ["member-documents", memberId] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le document.",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      adhesion: "bg-blue-100 text-blue-800",
      bapteme: "bg-purple-100 text-purple-800",
      mariage: "bg-pink-100 text-pink-800",
      transfert: "bg-orange-100 text-orange-800",
      engagement: "bg-green-100 text-green-800",
      formation: "bg-yellow-100 text-yellow-800",
      identite: "bg-gray-100 text-gray-800",
      autre: "bg-slate-100 text-slate-800",
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              {documents.length} document(s) enregistré(s)
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un document
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun document enregistré</p>
            <p className="text-sm">Cliquez sur "Ajouter un document" pour commencer</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getDocumentTypeBadgeColor(doc.document_type)}
                    >
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{doc.document_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(doc.document_date), "dd MMM yyyy", { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {doc.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.document_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.document_url!, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Document Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Document</DialogTitle>
            <DialogDescription>
              Enregistrez un document lié au membre
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type de document *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData({ ...formData, documentType: value })
                }
              >
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-name">Nom du document *</Label>
              <Input
                id="doc-name"
                value={formData.documentName}
                onChange={(e) =>
                  setFormData({ ...formData, documentName: e.target.value })
                }
                placeholder="Ex: Formulaire d'adhésion signé"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-date">Date du document</Label>
              <Input
                id="doc-date"
                type="date"
                value={formData.documentDate}
                onChange={(e) =>
                  setFormData({ ...formData, documentDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fichier (optionnel)</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="doc-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Choisir un fichier"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF ou image, max 10 Mo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-notes">Notes</Label>
              <Textarea
                id="doc-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Informations supplémentaires..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button onClick={uploadDocument} disabled={uploading}>
              {uploading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
