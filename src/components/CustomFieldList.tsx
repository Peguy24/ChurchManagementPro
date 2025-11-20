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

interface CustomFieldListProps {
  fields: any[];
  onEdit: (field: any) => void;
  onDelete: (fieldId: string) => void;
}

const fieldTypeLabels: Record<string, string> = {
  text: "Tèks",
  textarea: "Tèks Long",
  number: "Nimewo",
  date: "Dat",
  select: "Lis",
  checkbox: "Kaz",
};

export function CustomFieldList({ fields, onEdit, onDelete }: CustomFieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Pa gen chan pèsonalize ankò. Klike sou "Ajoute Chan" pou kreye youn.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Etikèt</TableHead>
          <TableHead>Non Chan</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Estati</TableHead>
          <TableHead>Aksyon</TableHead>
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
                {fieldTypeLabels[field.field_type]}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {field.is_required && (
                  <Badge variant="secondary">Obligatwa</Badge>
                )}
                {field.is_active ? (
                  <Badge className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="destructive">Inaktif</Badge>
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
                    if (
                      confirm(
                        "Ou vle efase chan sa a? Tout done asosye yo pral pèdi."
                      )
                    ) {
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
