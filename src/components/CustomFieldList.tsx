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
  text: "Texte",
  textarea: "Texte long",
  number: "Nombre",
  date: "Date",
  select: "Liste",
  checkbox: "Case à cocher",
};

export function CustomFieldList({ fields, onEdit, onDelete }: CustomFieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun champ personnalisé pour le moment. Cliquez sur "Ajouter un champ" pour en créer un.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Libellé</TableHead>
          <TableHead>Nom du champ</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Actions</TableHead>
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
                  <Badge variant="secondary">Obligatoire</Badge>
                )}
                {field.is_active ? (
                  <Badge className="bg-green-500">Actif</Badge>
                ) : (
                  <Badge variant="destructive">Inactif</Badge>
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
                        "Voulez-vous supprimer ce champ ? Toutes les données associées seront perdues."
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
