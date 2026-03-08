import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, Package, AlertTriangle, CheckCircle2, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { playSuccessSound, playErrorSound } from "@/lib/soundGenerator";
import { useLanguage } from "@/contexts/LanguageContext";

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
  branch_id: string | null;
  status: string;
  condition: string | null;
  quantity: number;
  min_quantity: number;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface InventoryBarcodeScannerProps {
  items: InventoryItem[];
  onItemFound: (item: InventoryItem) => void;
  onItemNotFound?: (code: string) => void;
}

export default function InventoryBarcodeScanner({ 
  items, 
  onItemFound, 
  onItemNotFound 
}: InventoryBarcodeScannerProps) {
  const { t } = useLanguage();
  const { formatAmount: formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<InventoryItem | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<"found" | "not_found" | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const statusKeys: Record<string, { key: string; color: string }> = {
    available: { key: "inventory.statusAvailable", color: "bg-green-500" },
    in_use: { key: "inventory.statusInUse", color: "bg-blue-500" },
    maintenance: { key: "inventory.statusMaintenance", color: "bg-yellow-500" },
    missing: { key: "inventory.statusMissing", color: "bg-red-500" },
    disposed: { key: "inventory.statusDisposed", color: "bg-gray-500" },
  };

  const categoryKeys: Record<string, string> = {
    general: "inventory.catGeneral",
    audio_video: "inventory.catAudioVideo",
    furniture: "inventory.catFurniture",
    musical: "inventory.catMusical",
    office: "inventory.catOffice",
    kitchen: "inventory.catKitchen",
    cleaning: "inventory.catCleaning",
    decoration: "inventory.catDecoration",
    vehicle: "inventory.catVehicle",
    it_equipment: "inventory.catITEquipment",
    other: "inventory.catOther",
  };

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("barcode-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 150 }, aspectRatio: 2 },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanTimeRef.current < 2000) return;
          lastScanTimeRef.current = now;
          handleScanResult(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error(t("inventory.cameraError"));
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  const handleScanResult = (code: string) => {
    setLastScannedCode(code);
    const normalizedCode = code.toLowerCase().trim();
    
    const foundItem = items.find((item) => {
      if (item.barcode) {
        if (item.barcode.toLowerCase() === normalizedCode) return true;
        if (item.barcode.toLowerCase().includes(normalizedCode)) return true;
        if (normalizedCode.includes(item.barcode.toLowerCase())) return true;
      }
      if (item.serial_number) {
        if (item.serial_number.toLowerCase() === normalizedCode) return true;
        if (item.serial_number.toLowerCase().includes(normalizedCode)) return true;
      }
      if (item.name.toLowerCase() === normalizedCode) return true;
      return false;
    });

    if (foundItem) {
      setLastScannedItem(foundItem);
      setScanResult("found");
      playSuccessSound();
      onItemFound(foundItem);
      toast.success(t("inventory.itemFoundToast").replace("{name}", foundItem.name));
    } else {
      setLastScannedItem(null);
      setScanResult("not_found");
      playErrorSound();
      onItemNotFound?.(code);
      toast.error(t("inventory.itemNotFoundToast").replace("{code}", code));
    }
  };

  const handleClose = () => {
    stopScanner();
    setIsOpen(false);
    setLastScannedItem(null);
    setLastScannedCode(null);
    setScanResult(null);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setLastScannedItem(null);
    setLastScannedCode(null);
    setScanResult(null);
  };

  useEffect(() => {
    if (isOpen && !isScanning) {
      const timeout = setTimeout(() => { startScanner(); }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => { return () => { stopScanner(); }; }, []);

  const getStatusBadge = (status: string) => {
    const info = statusKeys[status];
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${info?.color || "bg-gray-500"}`} />
        {info ? t(info.key) : status}
      </Badge>
    );
  };

  return (
    <>
      <Button onClick={handleOpen} variant="outline">
        <ScanBarcode className="h-4 w-4 mr-2" />
        {t("inventory.scannerBtn")}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t("inventory.scanBarcode")}
            </DialogTitle>
            <DialogDescription>{t("inventory.scanBarcodeDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <div id="barcode-reader" className="w-full rounded-lg overflow-hidden bg-muted" style={{ minHeight: "200px" }} />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("inventory.cameraInit")}</p>
                  </div>
                </div>
              )}
            </div>

            {scanResult && (
              <Card className={scanResult === "found" ? "border-green-500" : "border-red-500"}>
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {scanResult === "found" ? (
                      <><CheckCircle2 className="h-5 w-5 text-green-500" />{t("inventory.itemFound")}</>
                    ) : (
                      <><AlertTriangle className="h-5 w-5 text-red-500" />{t("inventory.itemNotFound")}</>
                    )}
                  </CardTitle>
                  {lastScannedCode && (
                    <CardDescription>{t("inventory.scannedCode")}: {lastScannedCode}</CardDescription>
                  )}
                </CardHeader>
                {lastScannedItem && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lastScannedItem.name}</span>
                        </div>
                        {getStatusBadge(lastScannedItem.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">{t("inventory.categoryLabel")}:</span>{" "}
                          {categoryKeys[lastScannedItem.category] ? t(categoryKeys[lastScannedItem.category]) : lastScannedItem.category}
                        </div>
                        <div>
                          <span className="font-medium">{t("inventory.quantityLabel")}:</span> {lastScannedItem.quantity}
                        </div>
                        {lastScannedItem.location && (
                          <div>
                            <span className="font-medium">{t("inventory.locationLabel")}:</span> {lastScannedItem.location}
                          </div>
                        )}
                        {lastScannedItem.current_value && (
                          <div>
                            <span className="font-medium">{t("inventory.valueLabel")}:</span>{" "}
                            {formatCurrency(lastScannedItem.current_value)}
                          </div>
                        )}
                      </div>
                      {lastScannedItem.description && (
                        <p className="text-sm text-muted-foreground mt-2">{lastScannedItem.description}</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>{t("inventory.placeBarcode")}</p>
              <p className="text-xs mt-1">{t("inventory.supportedFormats")}</p>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="h-4 w-4 mr-2" />
              {t("inventory.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
