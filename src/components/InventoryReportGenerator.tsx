import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateInventoryReportPDF, downloadPDF } from "@/lib/inventoryReportPDF";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  serial_number: string | null;
  barcode: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  location: string | null;
  status: string;
  condition: string | null;
  quantity: number;
  min_quantity: number;
  photo_url: string | null;
  notes: string | null;
}

interface MaintenanceRecord {
  id: string;
  item_id: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  maintenance_date: string;
  performed_by: string | null;
  status: string;
  inventory_items?: { name: string };
}

interface InventoryReportGeneratorProps {
  items: InventoryItem[];
  maintenanceRecords: MaintenanceRecord[];
  churchName?: string;
  logoUrl?: string;
}

export default function InventoryReportGenerator({
  items,
  maintenanceRecords,
  churchName,
  logoUrl,
}: InventoryReportGeneratorProps) {
  const { t } = useLanguage();
  const { currencyCode } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [options, setOptions] = useState({
    includePhotos: true,
    includeStatistics: true,
    includeMaintenanceHistory: true,
  });

  const handleGenerate = async () => {
    if (items.length === 0) {
      toast.error(t("inventory.noItemsForReport"));
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const blob = await generateInventoryReportPDF(
        items,
        maintenanceRecords,
        { ...options, churchName, logoUrl },
        (p) => setProgress(p)
      );

      const filename = `inventaire_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
      downloadPDF(blob, filename);
      
      toast.success(t("inventory.reportSuccess"));
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("inventory.reportError"));
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const itemsWithPhotos = items.filter((i) => i.photo_url).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          {t("inventory.pdfReport")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.generateReport")}</DialogTitle>
          <DialogDescription>{t("inventory.generateReportDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("inventory.itemsToInclude")}:</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("inventory.photosAvailable")}:</span>
              <span className="font-medium">{itemsWithPhotos}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("inventory.maintenancesLabel")}:</span>
              <span className="font-medium">{maintenanceRecords.length}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">{t("inventory.reportOptions")}</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="includeStatistics" checked={options.includeStatistics}
                onCheckedChange={(checked) => setOptions({ ...options, includeStatistics: checked === true })} />
              <Label htmlFor="includeStatistics" className="cursor-pointer">{t("inventory.includeStatistics")}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="includePhotos" checked={options.includePhotos}
                onCheckedChange={(checked) => setOptions({ ...options, includePhotos: checked === true })}
                disabled={itemsWithPhotos === 0} />
              <Label htmlFor="includePhotos" className={`cursor-pointer ${itemsWithPhotos === 0 ? "text-muted-foreground" : ""}`}>
                {t("inventory.includePhotoCatalog")} ({itemsWithPhotos})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="includeMaintenanceHistory" checked={options.includeMaintenanceHistory}
                onCheckedChange={(checked) => setOptions({ ...options, includeMaintenanceHistory: checked === true })}
                disabled={maintenanceRecords.length === 0} />
              <Label htmlFor="includeMaintenanceHistory" className={`cursor-pointer ${maintenanceRecords.length === 0 ? "text-muted-foreground" : ""}`}>
                {t("inventory.includeMaintenanceHistory")} ({maintenanceRecords.length})
              </Label>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("inventory.generating")}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>{t("inventory.cancel")}</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || items.length === 0}>
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("inventory.generatingBtn")}</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />{t("inventory.downloadPdf")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
