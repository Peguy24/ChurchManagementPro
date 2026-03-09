/**
 * Configuration for clean, human-readable data backup exports.
 * Defines which columns to include, their display headers, and formatters.
 */

export interface ExportColumn {
  key: string;
  fr: string;
  en: string;
  ht: string;
  formatter?: (value: any) => string;
}

// Columns to always exclude from exports
const EXCLUDED_COLUMNS = new Set([
  "id", "tenant_id", "created_by", "updated_at", "marked_by",
  "approved_by", "branch_id", "member_id", "category_id",
  "event_id", "bank_account_id", "cash_register_id",
  "employee_id", "parent_branch_id", "leader_id",
  "parent_category_id", "created_at",
]);

const formatDate = (v: any) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    return d.toLocaleDateString("fr-FR");
  } catch { return String(v); }
};

const formatBoolean = (v: any, lang: string) => {
  if (v === null || v === undefined) return "";
  const yes = lang === "fr" ? "Oui" : lang === "ht" ? "Wi" : "Yes";
  const no = lang === "fr" ? "Non" : lang === "ht" ? "Non" : "No";
  return v ? yes : no;
};

const formatAmount = (v: any) => {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toFixed(2);
};

export const MODULE_COLUMNS: Record<string, ExportColumn[]> = {
  members: [
    { key: "first_name", fr: "Prénom", en: "First Name", ht: "Prenon" },
    { key: "last_name", fr: "Nom", en: "Last Name", ht: "Non" },
    { key: "email", fr: "Email", en: "Email", ht: "Imèl" },
    { key: "phone", fr: "Téléphone", en: "Phone", ht: "Telefòn" },
    { key: "gender", fr: "Genre", en: "Gender", ht: "Sèks" },
    { key: "date_of_birth", fr: "Date de naissance", en: "Date of Birth", ht: "Dat nesans", formatter: formatDate },
    { key: "marital_status", fr: "État civil", en: "Marital Status", ht: "Eta sivil" },
    { key: "address", fr: "Adresse", en: "Address", ht: "Adrès" },
    { key: "city", fr: "Ville", en: "City", ht: "Vil" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
    { key: "branch_name", fr: "Branche", en: "Branch", ht: "Branch" },
    { key: "membership_date", fr: "Date d'adhésion", en: "Membership Date", ht: "Dat manm", formatter: formatDate },
    { key: "baptism_date", fr: "Date de baptême", en: "Baptism Date", ht: "Dat batèm", formatter: formatDate },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
  donations: [
    { key: "donation_date", fr: "Date", en: "Date", ht: "Dat", formatter: formatDate },
    { key: "member_first_name", fr: "Prénom du membre", en: "Member First Name", ht: "Prenon manm" },
    { key: "member_last_name", fr: "Nom du membre", en: "Member Last Name", ht: "Non manm" },
    { key: "amount", fr: "Montant", en: "Amount", ht: "Montan", formatter: formatAmount },
    { key: "donation_type", fr: "Type de don", en: "Donation Type", ht: "Tip don" },
    { key: "payment_method", fr: "Mode de paiement", en: "Payment Method", ht: "Metòd pèman" },
    { key: "category_name", fr: "Catégorie", en: "Category", ht: "Kategori" },
    { key: "branch_name", fr: "Branche", en: "Branch", ht: "Branch" },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
  expenses: [
    { key: "expense_date", fr: "Date", en: "Date", ht: "Dat", formatter: formatDate },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "amount", fr: "Montant", en: "Amount", ht: "Montan", formatter: formatAmount },
    { key: "category_name", fr: "Catégorie", en: "Category", ht: "Kategori" },
    { key: "vendor", fr: "Fournisseur", en: "Vendor", ht: "Founisè" },
    { key: "payment_method", fr: "Mode de paiement", en: "Payment Method", ht: "Metòd pèman" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
    { key: "branch_name", fr: "Branche", en: "Branch", ht: "Branch" },
    { key: "reference_number", fr: "N° Référence", en: "Reference #", ht: "# Referans" },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
  attendance: [
    { key: "event_date", fr: "Date", en: "Date", ht: "Dat", formatter: formatDate },
    { key: "event_type", fr: "Type d'événement", en: "Event Type", ht: "Tip evènman" },
    { key: "member_first_name", fr: "Prénom", en: "First Name", ht: "Prenon" },
    { key: "member_last_name", fr: "Nom", en: "Last Name", ht: "Non" },
    { key: "scan_method", fr: "Méthode", en: "Method", ht: "Metòd" },
    { key: "marked_at", fr: "Marqué à", en: "Marked At", ht: "Make a", formatter: formatDate },
  ],
  events: [
    { key: "name", fr: "Nom", en: "Name", ht: "Non" },
    { key: "event_date", fr: "Date", en: "Date", ht: "Dat", formatter: formatDate },
    { key: "event_time", fr: "Heure", en: "Time", ht: "Lè" },
    { key: "end_date", fr: "Date de fin", en: "End Date", ht: "Dat fen", formatter: formatDate },
    { key: "location", fr: "Lieu", en: "Location", ht: "Kote" },
    { key: "event_category", fr: "Catégorie", en: "Category", ht: "Kategori" },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "expected_attendees", fr: "Participants prévus", en: "Expected Attendees", ht: "Patisipan prevwa" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
    { key: "branch_name", fr: "Branche", en: "Branch", ht: "Branch" },
  ],
  branches: [
    { key: "name", fr: "Nom", en: "Name", ht: "Non" },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "address", fr: "Adresse", en: "Address", ht: "Adrès" },
    { key: "phone", fr: "Téléphone", en: "Phone", ht: "Telefòn" },
    { key: "email", fr: "Email", en: "Email", ht: "Imèl" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
  ],
  ministries: [
    { key: "name", fr: "Nom", en: "Name", ht: "Non" },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "leader_name", fr: "Responsable", en: "Leader", ht: "Responsab" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
  ],
  inventory: [
    { key: "name", fr: "Nom", en: "Name", ht: "Non" },
    { key: "category", fr: "Catégorie", en: "Category", ht: "Kategori" },
    { key: "description", fr: "Description", en: "Description", ht: "Deskripsyon" },
    { key: "quantity", fr: "Quantité", en: "Quantity", ht: "Kantite" },
    { key: "condition", fr: "État", en: "Condition", ht: "Eta" },
    { key: "location", fr: "Emplacement", en: "Location", ht: "Anplasman" },
    { key: "purchase_price", fr: "Prix d'achat", en: "Purchase Price", ht: "Pri acha", formatter: formatAmount },
    { key: "current_value", fr: "Valeur actuelle", en: "Current Value", ht: "Valè aktyèl", formatter: formatAmount },
    { key: "purchase_date", fr: "Date d'achat", en: "Purchase Date", ht: "Dat acha", formatter: formatDate },
    { key: "serial_number", fr: "N° Série", en: "Serial #", ht: "# Seri" },
    { key: "barcode", fr: "Code-barres", en: "Barcode", ht: "Kòd ba" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
  ],
  budgets: [
    { key: "name", fr: "Nom", en: "Name", ht: "Non" },
    { key: "fiscal_year", fr: "Année fiscale", en: "Fiscal Year", ht: "Ane fiskal" },
    { key: "planned_amount", fr: "Montant planifié", en: "Planned Amount", ht: "Montan planifye", formatter: formatAmount },
    { key: "category_name", fr: "Catégorie", en: "Category", ht: "Kategori" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
  employees: [
    { key: "first_name", fr: "Prénom", en: "First Name", ht: "Prenon" },
    { key: "last_name", fr: "Nom", en: "Last Name", ht: "Non" },
    { key: "position", fr: "Poste", en: "Position", ht: "Pozisyon" },
    { key: "email", fr: "Email", en: "Email", ht: "Imèl" },
    { key: "phone", fr: "Téléphone", en: "Phone", ht: "Telefòn" },
    { key: "salary_amount", fr: "Salaire", en: "Salary", ht: "Salè", formatter: formatAmount },
    { key: "payment_frequency", fr: "Fréquence de paiement", en: "Payment Frequency", ht: "Frekans pèman" },
    { key: "hire_date", fr: "Date d'embauche", en: "Hire Date", ht: "Dat travay", formatter: formatDate },
    { key: "is_active", fr: "Actif", en: "Active", ht: "Aktif" },
  ],
  salaryPayments: [
    { key: "employee_first_name", fr: "Prénom employé", en: "Employee First Name", ht: "Prenon anplwaye" },
    { key: "employee_last_name", fr: "Nom employé", en: "Employee Last Name", ht: "Non anplwaye" },
    { key: "amount", fr: "Montant", en: "Amount", ht: "Montan", formatter: formatAmount },
    { key: "payment_date", fr: "Date de paiement", en: "Payment Date", ht: "Dat pèman", formatter: formatDate },
    { key: "period_start", fr: "Début période", en: "Period Start", ht: "Komansman peryòd", formatter: formatDate },
    { key: "period_end", fr: "Fin période", en: "Period End", ht: "Fen peryòd", formatter: formatDate },
    { key: "payment_method", fr: "Mode de paiement", en: "Payment Method", ht: "Metòd pèman" },
    { key: "status", fr: "Statut", en: "Status", ht: "Estati" },
    { key: "reference_number", fr: "N° Référence", en: "Reference #", ht: "# Referans" },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
  bankAccounts: [
    { key: "name", fr: "Nom du compte", en: "Account Name", ht: "Non kont" },
    { key: "bank_name", fr: "Banque", en: "Bank", ht: "Bank" },
    { key: "account_number", fr: "N° de compte", en: "Account #", ht: "# Kont" },
    { key: "current_balance", fr: "Solde actuel", en: "Current Balance", ht: "Balans aktyèl", formatter: formatAmount },
    { key: "is_active", fr: "Actif", en: "Active", ht: "Aktif" },
  ],
  visitors: [
    { key: "first_name", fr: "Prénom", en: "First Name", ht: "Prenon" },
    { key: "last_name", fr: "Nom", en: "Last Name", ht: "Non" },
    { key: "email", fr: "Email", en: "Email", ht: "Imèl" },
    { key: "phone", fr: "Téléphone", en: "Phone", ht: "Telefòn" },
    { key: "visit_date", fr: "Date de visite", en: "Visit Date", ht: "Dat vizit", formatter: formatDate },
    { key: "how_heard", fr: "Comment connu", en: "How Heard", ht: "Kijan konnen" },
    { key: "notes", fr: "Notes", en: "Notes", ht: "Nòt" },
  ],
};

/**
 * Flatten a row, extracting nested relation objects into prefixed keys.
 * e.g. { member: { first_name: "John" } } => { member_first_name: "John" }
 */
export function flattenRow(row: any): Record<string, any> {
  const flat: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
        flat[`${key}_${subKey}`] = subValue;
      }
    } else {
      flat[key] = value;
    }
  }
  return flat;
}

/**
 * Transform raw data into clean export rows using module column config.
 */
export function transformForExport(
  moduleKey: string,
  data: Record<string, any>[],
  language: string
): { headers: string[]; rows: any[][] } {
  const columns = MODULE_COLUMNS[moduleKey];
  
  if (!columns) {
    // Fallback: auto-generate from data, excluding internal columns
    if (data.length === 0) return { headers: [], rows: [] };
    const allKeys = Object.keys(data[0]).filter(k => !EXCLUDED_COLUMNS.has(k));
    return {
      headers: allKeys,
      rows: data.map(row => allKeys.map(k => row[k] ?? "")),
    };
  }

  const lang = (language === "fr" || language === "en" || language === "ht") ? language : "en";
  const headers = columns.map(col => col[lang as keyof Pick<ExportColumn, "fr" | "en" | "ht">]);
  
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      if (col.formatter && value !== null && value !== undefined) {
        return col.formatter(value);
      }
      if (typeof value === "boolean") {
        return formatBoolean(value, lang);
      }
      return value ?? "";
    });
  });

  return { headers, rows };
}
