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
import { FileText, Plus, Upload, Trash2, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { todayInputValue, parseDateOnly } from "@/lib/date";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";


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

export default function MemberDocuments({ memberId }: MemberDocumentsProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    documentType: "",
    documentName: "",
    documentDate: todayInputValue(),
    notes: "",
  });

  // Local translation map for caching mitigation
  const lt = {
    title: language === "fr" ? "Documents" : language === "ht" ? "Dokiman" : "Documents",
    count: language === "fr" ? "document(s) enregistré(s)" : language === "ht" ? "dokiman(s) anrejistre" : "document(s) registered",
    addButton: language === "fr" ? "Ajouter un document" : language === "ht" ? "Ajoute yon dokiman" : "Add a document",
    noDocuments: language === "fr" ? "Aucun document enregistré" : language === "ht" ? "Pa gen dokiman anrejistre" : "No documents registered",
    noDocumentsHint: language === "fr" ? 'Cliquez sur "Ajouter un document" pour commencer' : language === "ht" ? 'Klike "Ajoute yon dokiman" pou kòmanse' : 'Click "Add a document" to start',
    addDialogTitle: language === "fr" ? "Ajouter un Document" : language === "ht" ? "Ajoute yon Dokiman" : "Add Document",
    addDialogDesc: language === "fr" ? "Enregistrez un document lié au membre" : language === "ht" ? "Anrejistre yon dokiman ki gen rapò ak manm nan" : "Register a document related to the member",
    type: language === "fr" ? "Type" : language === "ht" ? "Kalite" : "Type",
    name: language === "fr" ? "Nom" : language === "ht" ? "Non" : "Name",
    date: language === "fr" ? "Date" : language === "ht" ? "Dat" : "Date",
    notes: language === "fr" ? "Notes" : language === "ht" ? "Nòt" : "Notes",
    file: language === "fr" ? "Fichier" : language === "ht" ? "Fichye" : "File",
    fileHint: language === "fr" ? "PDF ou image, max 10 Mo" : language === "ht" ? "PDF oswa imaj, max 10 Mo" : "PDF or image, max 10 MB",
    filePlaceholder: language === "fr" ? "Choisir un fichier" : language === "ht" ? "Chwazi yon fichye" : "Choose a file",
    typeRequired: language === "fr" ? "Type de document *" : language === "ht" ? "Kalite dokiman *" : "Document type *",
    nameRequired: language === "fr" ? "Nom du document *" : language === "ht" ? "Non dokiman *" : "Document name *",
    selectType: language === "fr" ? "Sélectionner un type" : language === "ht" ? "Chwazi yon kalite" : "Select a type",
    documentNamePlaceholder: language === "fr" ? "Ex: Formulaire d'adhésion signé" : language === "ht" ? "Egz: Fòmilè adhesyon siyen" : "e.g. Signed membership form",
    notesPlaceholder: language === "fr" ? "Informations supplémentaires..." : language === "ht" ? "Enfòmasyon siplementè..." : "Additional information...",
    cancel: language === "fr" ? "Annuler" : language === "ht" ? "Anile" : "Cancel",
    save: language === "fr" ? "Enregistrer" : language === "ht" ? "Anrejistre" : "Save",
    saving: language === "fr" ? "Enregistrement..." : language === "ht" ? "Anrejistreman..." : "Saving...",
    view: language === "fr" ? "Voir" : language === "ht" ? "Gade" : "View",
    confirmDelete: language === "fr" ? "Êtes-vous sûr de vouloir supprimer ce document ?" : language === "ht" ? "Èske ou sè ke ou vle siprime dokiman sa a?" : "Are you sure you want to delete this document?",
    deletedSuccess: language === "fr" ? "Document supprimé" : language === "ht" ? "Dokiman siprime" : "Document deleted",
    deletedDesc: language === "fr" ? "Le document a été supprimé." : language === "ht" ? "Dokiman an te siprime." : "The document has been deleted.",
    addedSuccess: language === "fr" ? "Document ajouté" : language === "ht" ? "Dokiman ajoute" : "Document added",
    addedDesc: language === "fr" ? "Le document a été enregistré avec succès." : language === "ht" ? "Dokiman an anrejistre avèk siksè." : "The document has been successfully saved.",
    errorTitle: language === "fr" ? "Erreur" : language === "ht" ? "Erè" : "Error",
    fileTooLarge: language === "fr" ? "Fichier trop volumineux" : language === "ht" ? "Fichye twò gwo" : "File too large",
    fileTooLargeDesc: language === "fr" ? "Le fichier ne doit pas dépasser 10 Mo." : language === "ht" ? "Fichye a pa dwe depase 10 Mo." : "The file must not exceed 10 MB.",
    requiredFields: language === "fr" ? "Champs requis" : language === "ht" ? "Champs obligatwa" : "Required fields",
    requiredFieldsDesc: language === "fr" ? "Veuillez remplir le type et le nom du document." : language === "ht" ? "Tanpri ranpli kalite ak non dokiman an." : "Please fill in the document type and name.",
    actions: language === "fr" ? "Actions" : language === "ht" ? "Aksyon" : "Actions",
  };

  // Document types translations
  const DOCUMENT_TYPES = [
    { value: "adhesion", label: language === "fr" ? "Formulaire d'adhésion" : language === "ht" ? "Fòmilè Adhesyon" : "Membership Form" },
    { value: "bapteme", label: language === "fr" ? "Certificat de baptême" : language === "ht" ? "Sètifika Batèm" : "Baptism Certificate" },
    { value: "mariage", label: language === "fr" ? "Certificat de mariage" : language === "ht" ? "Sètifika Maryaj" : "Marriage Certificate" },
    { value: "transfert", label: language === "fr" ? "Lettre de transfert" : language === "ht" ? "Lèt Transfè" : "Transfer Letter" },
    { value: "engagement", label: language === "fr" ? "Engagement de service" : language === "ht" ? "Angajman Sèvis" : "Service Commitment" },
    { value: "formation", label: language === "fr" ? "Attestation de formation" : language === "ht" ? "Sètifika Fòmasyon" : "Training Certificate" },
    { value: "identite", label: language === "fr" ? "Pièce d'identité" : language === "ht" ? "Dokiman Idantite" : "ID Document" },
    { value: "autre", label: language === "fr" ? "Autre document" : language === "ht" ? "Lòt Dokiman" : "Other Document" },
  ];

  const dateFnsLocale = language === "fr" ? fr : enUS;

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
          title: lt.fileTooLarge,
          description: lt.fileTooLargeDesc,
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
        title: lt.requiredFields,
        description: lt.requiredFieldsDesc,
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
        title: lt.addedSuccess,
        description: lt.addedDesc,
      });

      // Reset form
      setFormData({
        documentType: "",
        documentName: "",
        documentDate: todayInputValue(),
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
        title: lt.errorTitle,
        description: error.message || "Impossible d'ajouter le document.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm(lt.confirmDelete)) return;

    try {
      const { error } = await supabase
        .from("member_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: lt.deletedSuccess,
        description: lt.deletedDesc,
      });

      queryClient.invalidateQueries({ queryKey: ["member-documents", memberId] });
    } catch (error: any) {
      toast({
        title: lt.errorTitle,
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
              {lt.title}
            </CardTitle>
            <CardDescription>
              {documents.length} {lt.count}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {lt.addButton}
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
            <p>{lt.noDocuments}</p>
            <p className="text-sm">{lt.noDocumentsHint}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lt.type}</TableHead>
                <TableHead>{lt.name}</TableHead>
                <TableHead>{lt.date}</TableHead>
                <TableHead>{lt.notes}</TableHead>
                <TableHead className="text-right">{lt.actions}</TableHead>
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
                      {format(parseDateOnly(doc.document_date) ?? new Date(doc.document_date), "dd MMM yyyy", { locale: dateFnsLocale })}
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
                          title={lt.view}
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
            <DialogTitle>{lt.addDialogTitle}</DialogTitle>
            <DialogDescription>
              {lt.addDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">{lt.typeRequired}</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData({ ...formData, documentType: value })
                }
              >
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder={lt.selectType} />
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
              <Label htmlFor="doc-name">{lt.nameRequired}</Label>
              <Input
                id="doc-name"
                value={formData.documentName}
                onChange={(e) =>
                  setFormData({ ...formData, documentName: e.target.value })
                }
                placeholder={lt.documentNamePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-date">{lt.date}</Label>
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
              <Label>{lt.file}</Label>
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
                  {selectedFile ? selectedFile.name : lt.filePlaceholder}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {lt.fileHint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-notes">{lt.notes}</Label>
              <Textarea
                id="doc-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder={lt.notesPlaceholder}
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
              {lt.cancel}
            </Button>
            <Button onClick={uploadDocument} disabled={uploading}>
              {uploading ? lt.saving : lt.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}