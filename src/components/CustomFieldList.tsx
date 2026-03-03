import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomFieldListProps {
  fields: any[];
  onEdit: (field: any) => void;
  onDelete: (fieldId: string) => void;
}

export function CustomFieldList({ fields, onEdit, onDelete }: CustomFieldListProps) {
  const { t } = useLanguage();

  const fieldTypeKeys: Record<string, string> = {
    text: "customFields.typeText",
    textarea: "customFields.typeTextarea",
    number: "customFields.typeNumber",
    date: "customFields.typeDate",
    select: "customFields.typeSelect",
    checkbox: "customFields.typeCheckbox",
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("customFields.emptyState")}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("customFields.fieldLabel")}</TableHead>
          <TableHead>{t("customFields.fieldName")}</TableHead>
          <TableHead>{t("customFields.fieldType")}</TableHead>
          <TableHead>{t("customFields.status")}</TableHead>
          <TableHead>{t("customFields.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-medium">{field.field_label}</TableCell>
            <TableCell className="text-muted-foreground">
              {field.field_name}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {t(fieldTypeKeys[field.field_type] || field.field_type)}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {field.is_required && (
                  <Badge variant="secondary">{t("customFields.required")}</Badge>
                )}
                {field.is_active ? (
                  <Badge className="bg-green-500">{t("customFields.active")}</Badge>
                ) : (
                  <Badge variant="destructive">{t("customFields.inactive")}</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(field)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(t("customFields.deleteConfirm"))) {
                      onDelete(field.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
