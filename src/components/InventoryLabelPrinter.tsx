import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Tags, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface InventoryItem {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  location: string | null;
}

interface InventoryLabelPrinterProps {
  items: InventoryItem[];
  trigger?: React.ReactNode;
}

function BarcodeLabel({ 
  item, 
  size,
  getCategoryLabel,
}: { 
  item: InventoryItem; 
  size: { value: string; width: number; height: number };
  getCategoryLabel: (cat: string) => string;
}) {
  const { t } = useLanguage();
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && item.barcode) {
      try {
        JsBarcode(barcodeRef.current, item.barcode, {
          format: "CODE128",
          width: size.value === "small" ? 1 : size.value === "medium" ? 1.5 : 2,
          height: size.value === "small" ? 30 : size.value === "medium" ? 40 : 50,
          displayValue: true,
          fontSize: size.value === "small" ? 10 : size.value === "medium" ? 12 : 14,
          margin: 5,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [item.barcode, size]);

  if (!item.barcode) {
    return (
      <div className="border rounded bg-muted flex items-center justify-center text-muted-foreground text-xs" style={{ width: size.width, height: size.height }}>
        {t("inventory.noBarcodeLabel")}
      </div>
    );
  }

  return (
    <div className="border rounded bg-white p-2 flex flex-col items-center justify-between print:border-black" style={{ width: size.width, height: size.height }}>
      <div className="text-center w-full overflow-hidden">
        <p className="font-bold text-black truncate" style={{ fontSize: size.value === "small" ? 8 : size.value === "medium" ? 10 : 12 }}>
          {item.name}
        </p>
        <p className="text-gray-600 truncate" style={{ fontSize: size.value === "small" ? 6 : size.value === "medium" ? 8 : 10 }}>
          {getCategoryLabel(item.category)}
          {item.location && ` • ${item.location}`}
        </p>
      </div>
      <svg ref={barcodeRef} className="max-w-full" />
    </div>
  );
}

export default function InventoryLabelPrinter({ items, trigger }: InventoryLabelPrinterProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState("medium");
  const printRef = useRef<HTMLDivElement>(null);

  const categoryKeys: Record<string, string> = {
    general: "inventory.catGeneral", audio_video: "inventory.catAudioVideo",
    furniture: "inventory.catFurniture", musical: "inventory.catMusical",
    office: "inventory.catOffice", kitchen: "inventory.catKitchen",
    cleaning: "inventory.catCleaning", decoration: "inventory.catDecoration",
    vehicle: "inventory.catVehicle", it_equipment: "inventory.catITEquipment",
    other: "inventory.catOther",
  };

  const getCategoryLabel = (cat: string) => categoryKeys[cat] ? t(categoryKeys[cat]) : cat;

  const labelSizes = [
    { value: "small", label: t("inventory.labelSmall"), width: 144, height: 95 },
    { value: "medium", label: t("inventory.labelMedium"), width: 189, height: 113 },
    { value: "large", label: t("inventory.labelLarge"), width: 265, height: 151 },
  ];

  const itemsWithBarcode = items.filter(item => item.barcode);
  const currentSize = labelSizes.find(s => s.value === labelSize) || labelSizes[1];

  const toggleItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => { setSelectedItems(itemsWithBarcode.map(i => i.id)); };
  const deselectAll = () => { setSelectedItems([]); };

  const handlePrint = () => {
    if (!printRef.current || selectedItems.length === 0) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${t("inventory.printLabels")}</title><style>@page{size:auto;margin:10mm}body{font-family:Arial,sans-serif;margin:0;padding:20px}.labels-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start}.label{border:1px solid #000;border-radius:4px;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;background:white;page-break-inside:avoid}.label-name{font-weight:bold;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}.label-category{color:#666;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}svg{max-width:100%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="labels-grid">${printContent}</div></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const selectedItemsData = itemsWithBarcode.filter(i => selectedItems.includes(i.id));

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)} variant="outline">
          <Tags className="h-4 w-4 mr-2" />
          {t("inventory.printLabels")}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              {t("inventory.printLabelsTitle")}
            </DialogTitle>
            <DialogDescription>{t("inventory.printLabelsDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t("inventory.articles")} ({selectedItems.length}/{itemsWithBarcode.length})
                </Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>{t("inventory.selectAllBtn")}</Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>{t("inventory.deselectAllBtn")}</Button>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-2">
                  {itemsWithBarcode.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t("inventory.noBarcode")}</p>
                  ) : (
                    itemsWithBarcode.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => toggleItem(item.id)}>
                        <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.barcode}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-2">
                <Label>{t("inventory.labelSize")}</Label>
                <Select value={labelSize} onValueChange={setLabelSize}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {labelSizes.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("inventory.preview")}</Label>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <ScrollArea className="h-64">
                    <div className="flex flex-wrap gap-2" ref={printRef}>
                      {selectedItemsData.length === 0 ? (
                        <p className="text-muted-foreground text-center w-full py-8">{t("inventory.selectForPreview")}</p>
                      ) : (
                        selectedItemsData.map(item => (
                          <BarcodeLabel key={item.id} item={item} size={currentSize} getCategoryLabel={getCategoryLabel} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>{t("inventory.cancel")}</Button>
            <Button onClick={handlePrint} disabled={selectedItems.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              {t("inventory.printCount").replace("{count}", String(selectedItems.length))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
