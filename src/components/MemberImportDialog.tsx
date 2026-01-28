import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface MemberImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
}

interface ColumnMapping {
  [sourceColumn: string]: string;
}

const TARGET_FIELDS = [
  { key: "ignore", label: "Ignorer" },
  { key: "first_name", label: "Prénom", required: true },
  { key: "last_name", label: "Nom", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "gender", label: "Sexe" },
  { key: "date_of_birth", label: "Date de naissance" },
  { key: "address", label: "Adresse" },
  { key: "status", label: "Statut" },
  { key: "join_date", label: "Date d'entrée" },
  { key: "baptism_status", label: "Statut baptême" },
  { key: "baptism_date", label: "Date de baptême" },
  { key: "marital_status", label: "État civil" },
  { key: "spouse_name", label: "Nom du conjoint" },
  { key: "number_of_children", label: "Nombre d'enfants" },
  { key: "origin_church", label: "Église d'origine" },
  { key: "role", label: "Rôle" },
  { key: "emergency_phone", label: "Contact d'urgence" },
];

// Auto-mapping based on common column names
const AUTO_MAPPING: Record<string, string> = {
  "prénom": "first_name",
  "prenom": "first_name",
  "first name": "first_name",
  "firstname": "first_name",
  "nom": "last_name",
  "last name": "last_name",
  "lastname": "last_name",
  "email": "email",
  "e-mail": "email",
  "téléphone": "phone",
  "telephone": "phone",
  "phone": "phone",
  "tel": "phone",
  "sexe": "gender",
  "gender": "gender",
  "date de naissance": "date_of_birth",
  "birth date": "date_of_birth",
  "date of birth": "date_of_birth",
  "birthdate": "date_of_birth",
  "adresse": "address",
  "address": "address",
  "statut": "status",
  "status": "status",
  "date d'entrée": "join_date",
  "join date": "join_date",
  "date entrée": "join_date",
  "baptisé": "baptism_status",
  "baptism": "baptism_status",
  "baptized": "baptism_status",
  "date baptême": "baptism_date",
  "baptism date": "baptism_date",
  "état civil": "marital_status",
  "marital status": "marital_status",
  "conjoint": "spouse_name",
  "spouse": "spouse_name",
  "enfants": "number_of_children",
  "children": "number_of_children",
  "église d'origine": "origin_church",
  "origin church": "origin_church",
  "rôle": "role",
  "role": "role",
  "urgence": "emergency_phone",
  "emergency": "emergency_phone",
};

export default function MemberImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: MemberImportDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setImporting(false);
    setImportProgress(0);
    setFileName("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let data: string[][] = [];

      if (extension === 'csv') {
        const text = await file.text();
        data = parseCSV(text);
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
      } else {
        throw new Error("Format non supporté");
      }

      if (data.length < 2) {
        throw new Error("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
      }

      const fileHeaders = data[0].map(h => String(h || '').trim());
      const rows = data.slice(1).filter(row => row.some(cell => cell));

      setHeaders(fileHeaders);
      setRawData(rows);

      // Auto-map columns
      const autoMapping: ColumnMapping = {};
      fileHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        if (AUTO_MAPPING[normalizedHeader]) {
          autoMapping[header] = AUTO_MAPPING[normalizedHeader];
        }
      });
      setColumnMapping(autoMapping);

      setStep("mapping");
    } catch (error: any) {
      toast({
        title: t("members.parseError"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const processRows = () => {
    const processed: ParsedRow[] = rawData.map((row, index) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];

      headers.forEach((header, colIndex) => {
        const targetField = columnMapping[header];
        if (targetField && targetField !== "ignore") {
          data[targetField] = String(row[colIndex] || '').trim();
        }
      });

      // Validate required fields
      if (!data.first_name) {
        errors.push(t("members.firstName") + " " + t("members.requiredFields").toLowerCase());
      }
      if (!data.last_name) {
        errors.push(t("members.lastName") + " " + t("members.requiredFields").toLowerCase());
      }

      // Validate email format if provided
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push("Format email invalide");
      }

      // Normalize gender
      if (data.gender) {
        const g = data.gender.toLowerCase();
        if (g.includes('m') || g.includes('homme') || g.includes('male')) {
          data.gender = 'M';
        } else if (g.includes('f') || g.includes('femme') || g.includes('female')) {
          data.gender = 'F';
        }
      }

      // Normalize status
      if (data.status) {
        const s = data.status.toLowerCase();
        if (s.includes('actif') || s.includes('active')) {
          data.status = 'active';
        } else if (s.includes('inactif') || s.includes('inactive')) {
          data.status = 'inactive';
        }
      } else {
        data.status = 'active';
      }

      return {
        rowNumber: index + 2, // +2 because row 1 is header, and we're 0-indexed
        data,
        errors,
        isValid: errors.length === 0,
      };
    });

    setParsedRows(processed);
    setStep("preview");
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({
        title: t("members.importError"),
        description: t("members.noValidRows"),
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setStep("importing");
    let imported = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        const memberData = {
          first_name: row.data.first_name,
          last_name: row.data.last_name,
          email: row.data.email || null,
          phone: row.data.phone || null,
          gender: row.data.gender || null,
          date_of_birth: row.data.date_of_birth || null,
          address: row.data.address || null,
          status: row.data.status || 'active',
          join_date: row.data.join_date || null,
          baptism_status: row.data.baptism_status || null,
          baptism_date: row.data.baptism_date || null,
          marital_status: row.data.marital_status || null,
          spouse_name: row.data.spouse_name || null,
          number_of_children: row.data.number_of_children ? parseInt(row.data.number_of_children) : null,
          origin_church: row.data.origin_church || null,
          role: row.data.role || null,
          emergency_phone: row.data.emergency_phone || null,
        };

        const { data, error } = await supabase
          .from("members")
          .insert([memberData])
          .select()
          .single();

        if (error) {
          console.error(`Error importing row ${row.rowNumber}:`, error);
        } else if (data) {
          // Update with QR code
          const qrCodeData = `MEMBER-${data.id}`;
          await supabase
            .from("members")
            .update({ qr_code: qrCodeData })
            .eq("id", data.id);
          imported++;
        }

        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      toast({
        title: t("common.confirm"),
        description: `${imported} ${t("members.importSuccess")}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({
        title: t("members.importError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Prénom", "Nom", "Email", "Téléphone", "Sexe", "Date de naissance", "Adresse", "Statut", "Date d'entrée", "Baptisé", "État civil"],
      ["Jean", "Dupont", "jean@exemple.com", "+509 1234-5678", "M", "1990-01-15", "123 Rue Example", "Actif", "2020-01-01", "Oui", "Marié"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "modele_import_membres.xlsx");
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(open) => { 
      if (!open) resetState(); 
      onOpenChange(open); 
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t("members.importMembers")}
          </DialogTitle>
          <DialogDescription>
            {t("members.importMembersDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("members.dragDropFile")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("members.supportedFormats")}
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("members.downloadTemplate")}
                </Button>
              </div>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {rawData.length} {t("members.rowsDetected")} - {t("members.requiredFields")}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground mb-2">
                {fileName}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-3">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center gap-4">
                      <Label className="w-1/3 truncate" title={header}>
                        {header}
                      </Label>
                      <Select
                        value={columnMapping[header] || "ignore"}
                        onValueChange={(value) => handleMappingChange(header, value)}
                      >
                        <SelectTrigger className="w-2/3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="outline" className="text-sm">
                  <CheckCircle className="h-4 w-4 mr-1 text-success" />
                  {validCount} {t("members.validRows")}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-sm">
                    <XCircle className="h-4 w-4 mr-1 text-destructive" />
                    {invalidCount} {t("members.invalidRows")}
                  </Badge>
                )}
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t("members.skipInvalidRows")}
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("members.rowNumber")}</TableHead>
                      <TableHead>{t("members.firstName")}</TableHead>
                      <TableHead>{t("members.lastName")}</TableHead>
                      <TableHead>{t("common.email")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row) => (
                      <TableRow key={row.rowNumber} className={!row.isValid ? "bg-destructive/10" : ""}>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{row.data.first_name || "-"}</TableCell>
                        <TableCell>{row.data.last_name || "-"}</TableCell>
                        <TableCell>{row.data.email || "-"}</TableCell>
                        <TableCell>
                          {!row.isValid && (
                            <span className="text-xs text-destructive">
                              {row.errors.join(", ")}
                            </span>
                          )}
                          {row.isValid && row.data.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center text-lg font-medium">
                {t("members.importing")}
              </p>
              <Progress value={importProgress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {importProgress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                {t("common.cancel")}
              </Button>
              <Button onClick={processRows}>
                {t("members.preview")}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                {t("members.importNow")} ({validCount})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}