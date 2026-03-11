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
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
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

const TARGET_FIELDS_I18N: Record<Language, { key: string; label: string; required?: boolean }[]> = {
  fr: [
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
    { key: "conversion_date", label: "Date de conversion" },
    { key: "marital_status", label: "État civil" },
    { key: "marriage_date", label: "Date de mariage" },
    { key: "spouse_name", label: "Nom du conjoint" },
    { key: "number_of_children", label: "Nombre d'enfants" },
    { key: "children_names", label: "Noms des enfants" },
    { key: "origin_church", label: "Église d'origine" },
    { key: "christian_experience", label: "Expérience chrétienne" },
    { key: "academic_formation", label: "Formation académique" },
    { key: "professional_formation", label: "Formation professionnelle" },
    { key: "role", label: "Rôle" },
    { key: "emergency_phone", label: "Contact d'urgence" },
  ],
  en: [
    { key: "ignore", label: "Ignore" },
    { key: "first_name", label: "First Name", required: true },
    { key: "last_name", label: "Last Name", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "gender", label: "Gender" },
    { key: "date_of_birth", label: "Date of Birth" },
    { key: "address", label: "Address" },
    { key: "status", label: "Status" },
    { key: "join_date", label: "Join Date" },
    { key: "baptism_status", label: "Baptism Status" },
    { key: "baptism_date", label: "Baptism Date" },
    { key: "conversion_date", label: "Conversion Date" },
    { key: "marital_status", label: "Marital Status" },
    { key: "marriage_date", label: "Marriage Date" },
    { key: "spouse_name", label: "Spouse Name" },
    { key: "number_of_children", label: "Number of Children" },
    { key: "children_names", label: "Children Names" },
    { key: "origin_church", label: "Origin Church" },
    { key: "christian_experience", label: "Christian Experience" },
    { key: "academic_formation", label: "Academic Education" },
    { key: "professional_formation", label: "Professional Training" },
    { key: "role", label: "Role" },
    { key: "emergency_phone", label: "Emergency Contact" },
  ],
  ht: [
    { key: "ignore", label: "Inyore" },
    { key: "first_name", label: "Prenon", required: true },
    { key: "last_name", label: "Non", required: true },
    { key: "email", label: "Imèl" },
    { key: "phone", label: "Telefòn" },
    { key: "gender", label: "Sèks" },
    { key: "date_of_birth", label: "Dat nesans" },
    { key: "address", label: "Adrès" },
    { key: "status", label: "Estati" },
    { key: "join_date", label: "Dat antre" },
    { key: "baptism_status", label: "Estati batèm" },
    { key: "baptism_date", label: "Dat batèm" },
    { key: "conversion_date", label: "Dat konvèsyon" },
    { key: "marital_status", label: "Eta sivil" },
    { key: "marriage_date", label: "Dat maryaj" },
    { key: "spouse_name", label: "Non konjwen" },
    { key: "number_of_children", label: "Kantite timoun" },
    { key: "children_names", label: "Non timoun yo" },
    { key: "origin_church", label: "Legliz orijin" },
    { key: "christian_experience", label: "Eksperyans kretyen" },
    { key: "academic_formation", label: "Fòmasyon akademik" },
    { key: "professional_formation", label: "Fòmasyon pwofesyonèl" },
    { key: "role", label: "Wòl" },
    { key: "emergency_phone", label: "Kontak ijans" },
  ],
};

// Auto-mapping based on common column names (all languages)
const AUTO_MAPPING: Record<string, string> = {
  "prénom": "first_name", "prenom": "first_name", "first name": "first_name", "firstname": "first_name", "prenon": "first_name",
  "nom": "last_name", "last name": "last_name", "lastname": "last_name", "non": "last_name",
  "email": "email", "e-mail": "email", "imèl": "email",
  "téléphone": "phone", "telephone": "phone", "phone": "phone", "tel": "phone", "telefòn": "phone",
  "sexe": "gender", "gender": "gender", "sèks": "gender",
  "date de naissance": "date_of_birth", "birth date": "date_of_birth", "date of birth": "date_of_birth", "birthdate": "date_of_birth", "dat nesans": "date_of_birth",
  "adresse": "address", "address": "address", "adrès": "address",
  "statut": "status", "status": "status", "estati": "status",
  "date d'entrée": "join_date", "join date": "join_date", "date entrée": "join_date", "dat antre": "join_date",
  "baptisé": "baptism_status", "baptism": "baptism_status", "baptized": "baptism_status", "baptism status": "baptism_status", "estati batèm": "baptism_status",
  "date baptême": "baptism_date", "baptism date": "baptism_date", "dat batèm": "baptism_date",
  "date de conversion": "conversion_date", "conversion date": "conversion_date", "dat konvèsyon": "conversion_date",
  "état civil": "marital_status", "marital status": "marital_status", "eta sivil": "marital_status",
  "date de mariage": "marriage_date", "marriage date": "marriage_date", "dat maryaj": "marriage_date",
  "conjoint": "spouse_name", "spouse": "spouse_name", "spouse name": "spouse_name", "non konjwen": "spouse_name",
  "enfants": "number_of_children", "children": "number_of_children", "number of children": "number_of_children", "nombre d'enfants": "number_of_children", "kantite timoun": "number_of_children",
  "noms des enfants": "children_names", "children names": "children_names", "non timoun yo": "children_names",
  "église d'origine": "origin_church", "origin church": "origin_church", "legliz orijin": "origin_church",
  "expérience chrétienne": "christian_experience", "christian experience": "christian_experience", "eksperyans kretyen": "christian_experience",
  "formation académique": "academic_formation", "academic education": "academic_formation", "fòmasyon akademik": "academic_formation",
  "formation professionnelle": "professional_formation", "professional training": "professional_formation", "fòmasyon pwofesyonèl": "professional_formation",
  "rôle": "role", "role": "role", "wòl": "role",
  "urgence": "emergency_phone", "emergency": "emergency_phone", "emergency contact": "emergency_phone", "contact d'urgence": "emergency_phone", "kontak ijans": "emergency_phone",
};

// Normalize dates from various formats to ISO YYYY-MM-DD
function normalizeDate(value: string): string {
  if (!value || !value.trim()) return '';
  const v = value.trim();
  
  // Already ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  
  // DD/MM/YYYY or DD-MM-YYYY
  let match = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // MM/DD/YYYY (if month > 12, swap)
  // YYYY/MM/DD
  match = v.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try JS Date parse as fallback
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return ''; // Invalid date - return empty to avoid DB error
}

export default function MemberImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: MemberImportDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { tenantId } = useCurrentTenant();
  const TARGET_FIELDS = TARGET_FIELDS_I18N[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputKey, setInputKey] = useState(0);
  
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: { rowNumber: number; error: string; data: Record<string, string> }[] } | null>(null);

  const resetState = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setImporting(false);
    setImportProgress(0);
    setFileName("");
    setInputKey(prev => prev + 1);
    setImportResult(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const fileSize = file.size;
    const fileNameLocal = file.name;
    const extension = fileNameLocal.split('.').pop()?.toLowerCase();
    
    console.log('[IMPORT DEBUG] File selected:', fileNameLocal, 'Size:', fileSize, 'bytes, Type:', file.type);
    
    // Read the raw bytes into memory immediately using FileReader for max compatibility
    let rawBytes: ArrayBuffer;
    try {
      rawBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    } catch (err: any) {
      toast({
        title: t("members.parseError"),
        description: err.message || "Failed to read file",
        variant: "destructive",
      });
      return;
    }

    console.log('[IMPORT DEBUG] Raw bytes read:', rawBytes.byteLength);

    let readData: string[][] = [];
    
    try {
      if (extension === 'csv') {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(rawBytes);
        console.log('[IMPORT DEBUG] CSV text length:', text.length, 'First 200 chars:', text.substring(0, 200));
        readData = parseCSV(text);
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        const workbook = XLSX.read(new Uint8Array(rawBytes), { type: 'array' });
        console.log('[IMPORT DEBUG] Excel sheets:', workbook.SheetNames);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        readData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][];
      } else {
        throw new Error("Format non supporté");
      }
    } catch (err: any) {
      toast({
        title: t("members.parseError"),
        description: err.message || "Failed to read file",
        variant: "destructive",
      });
      return;
    }

    console.log('[IMPORT DEBUG] Total rows parsed (including header):', readData.length);
    if (readData.length > 0) {
      console.log('[IMPORT DEBUG] Header row:', readData[0]);
    }
    if (readData.length > 1) {
      console.log('[IMPORT DEBUG] First data row:', readData[1]);
    }
    if (readData.length > 2) {
      console.log('[IMPORT DEBUG] Second data row:', readData[2]);
    }

    // Force new input element for next selection
    setInputKey(prev => prev + 1);
    setFileName(fileNameLocal);

    const data = readData;

    if (data.length < 2) {
      toast({
        title: t("members.parseError"),
        description: "The file must contain at least a header row and one data row",
        variant: "destructive",
      });
      return;
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
  };

  const parseCSV = (text: string): string[][] => {
    // Normalize all line endings to \n
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(line => line.trim().length > 0);
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

      // Normalize date fields to ISO format (YYYY-MM-DD)
      const dateFields = ['date_of_birth', 'join_date', 'baptism_date', 'conversion_date', 'marriage_date'];
      dateFields.forEach(field => {
        if (data[field]) {
          data[field] = normalizeDate(data[field]);
        }
      });

      // Normalize number_of_children
      if (data.number_of_children) {
        const num = parseInt(data.number_of_children);
        data.number_of_children = isNaN(num) ? '' : String(num);
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
      const failedRows: { row: number; error: string }[] = [];
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        const memberData: Record<string, any> = {
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
          conversion_date: row.data.conversion_date || null,
          marital_status: row.data.marital_status || null,
          marriage_date: row.data.marriage_date || null,
          spouse_name: row.data.spouse_name || null,
          number_of_children: row.data.number_of_children ? (isNaN(parseInt(row.data.number_of_children)) ? null : parseInt(row.data.number_of_children)) : null,
          children_names: row.data.children_names || null,
          origin_church: row.data.origin_church || null,
          christian_experience: row.data.christian_experience || null,
          academic_formation: row.data.academic_formation || null,
          professional_formation: row.data.professional_formation || null,
          role: row.data.role || null,
          emergency_phone: row.data.emergency_phone || null,
        };
        if (tenantId) memberData.tenant_id = tenantId;

        const { data, error } = await supabase
          .from("members")
          .insert([memberData as any])
          .select()
          .single();

        if (error) {
          console.error(`Error importing row ${row.rowNumber}:`, error, 'Data:', JSON.stringify(memberData));
          failedRows.push({ row: row.rowNumber, error: error.message });
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

      const failedCount = failedRows.length;
      if (failedCount > 0) {
        console.warn(`[IMPORT] ${failedCount} rows failed:`, failedRows);
      }

      toast({
        title: t("common.confirm"),
        description: `${imported} ${t("members.importSuccess")}${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
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
    const headersMap: Record<Language, string[]> = {
      fr: ["Prénom", "Nom", "Email", "Téléphone", "Sexe", "Date de naissance", "Adresse", "Statut", "Date d'entrée", "Statut baptême", "Date de baptême", "Date de conversion", "État civil", "Date de mariage", "Nom du conjoint", "Nombre d'enfants", "Noms des enfants", "Église d'origine", "Expérience chrétienne", "Formation académique", "Formation professionnelle", "Rôle", "Contact d'urgence"],
      en: ["First Name", "Last Name", "Email", "Phone", "Gender", "Date of Birth", "Address", "Status", "Join Date", "Baptism Status", "Baptism Date", "Conversion Date", "Marital Status", "Marriage Date", "Spouse Name", "Number of Children", "Children Names", "Origin Church", "Christian Experience", "Academic Education", "Professional Training", "Role", "Emergency Contact"],
      ht: ["Prenon", "Non", "Imèl", "Telefòn", "Sèks", "Dat nesans", "Adrès", "Estati", "Dat antre", "Estati batèm", "Dat batèm", "Dat konvèsyon", "Eta sivil", "Dat maryaj", "Non konjwen", "Kantite timoun", "Non timoun yo", "Legliz orijin", "Eksperyans kretyen", "Fòmasyon akademik", "Fòmasyon pwofesyonèl", "Wòl", "Kontak ijans"],
    };
    const samplesMap: Record<Language, string[]> = {
      fr: ["Jean", "Dupont", "jean@exemple.com", "+1 (555) 123-4567", "M", "1990-01-15", "123 Main Street, New York, NY 10001", "Actif", "2020-01-01", "Oui", "2015-06-20", "2010-03-10", "Marié", "2018-07-14", "Marie Dupont", "2", "Pierre, Sophie", "First Baptist Church", "5 ans", "Licence en Théologie", "Enseignant", "Membre", "+1 (555) 987-6543"],
      en: ["John", "Smith", "john@example.com", "+1 (555) 123-4567", "M", "1990-01-15", "123 Main Street, New York, NY 10001", "Active", "2020-01-01", "Yes", "2015-06-20", "2010-03-10", "Married", "2018-07-14", "Jane Smith", "2", "Peter, Sophie", "First Baptist Church", "5 years", "Bachelor in Theology", "Teacher", "Member", "+1 (555) 987-6543"],
      ht: ["Jean", "Dupont", "jean@egzanp.com", "+1 (555) 123-4567", "M", "1990-01-15", "123 Main Street, New York, NY 10001", "Aktif", "2020-01-01", "Wi", "2015-06-20", "2010-03-10", "Marye", "2018-07-14", "Marie Dupont", "2", "Pierre, Sophie", "Premye Legliz Batis", "5 ane", "Lisans nan Teyoloji", "Pwofesè", "Manm", "+1 (555) 987-6543"],
    };
    const templateData = [headersMap[language], samplesMap[language]];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    // Auto-size columns
    const colWidths = templateData[0].map((h, i) => Math.max(h.length, (templateData[1][i] || "").length) + 2);
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const fileNames: Record<Language, string> = { fr: "modele_import_membres.xlsx", en: "member_import_template.xlsx", ht: "modèl_enpòte_manm.xlsx" };
    XLSX.writeFile(wb, fileNames[language]);
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
                  key={inputKey}
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
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