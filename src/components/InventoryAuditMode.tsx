import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Camera, X, Package, AlertTriangle, CheckCircle2, ClipboardCheck, 
  Play, Pause, RotateCcw, Save, FileWarning, Check
} from "lucide-react";
import { toast } from "sonner";
import { playSuccessSound, playErrorSound } from "@/lib/soundGenerator";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/SignedImage";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  serial_number: string | null;
  barcode: string | null;
  location: string | null;
  status: string;
  quantity: number;
  photo_url: string | null;
}

interface InventoryAuditModeProps {
  items: InventoryItem[];
  onAuditComplete: () => void;
}

const categoryLabels: Record<string, string> = {
  general: "Général",
  audio_video: "Audio/Vidéo",
  furniture: "Mobilier",
  musical: "Instruments de musique",
  office: "Bureautique",
  kitchen: "Cuisine",
  cleaning: "Nettoyage",
  decoration: "Décoration",
  vehicle: "Véhicule",
  it_equipment: "Équipement informatique",
  other: "Autre",
};

export default function InventoryAuditMode({ items, onAuditComplete }: InventoryAuditModeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [lastScannedItem, setLastScannedItem] = useState<InventoryItem | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const scannedCount = scannedItems.size;
  const totalCount = items.length;
  const missingCount = totalCount - scannedCount;
  const progress = totalCount > 0 ? (scannedCount / totalCount) * 100 : 0;

  const missingItems = items.filter(item => !scannedItems.has(item.id));
  const foundItems = items.filter(item => scannedItems.has(item.id));

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("audit-barcode-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 2,
        },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanTimeRef.current < 1500) {
            return;
          }
          lastScanTimeRef.current = now;
          handleScanResult(decodedText);
        },
        () => {}
      );
      
      setIsScanning(true);
      setIsPaused(false);
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Impossible d'accéder à la caméra");
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

  const pauseScanner = async () => {
    await stopScanner();
    setIsPaused(true);
  };

  const resumeScanner = async () => {
    await startScanner();
  };

  const handleScanResult = (code: string) => {
    // Search for item by barcode, serial_number or name
    const foundItem = items.find(
      (item) =>
        item.barcode?.toLowerCase() === code.toLowerCase() ||
        item.serial_number?.toLowerCase() === code.toLowerCase() ||
        item.barcode?.includes(code) ||
        item.serial_number?.includes(code)
    );

    if (foundItem) {
      if (scannedItems.has(foundItem.id)) {
        toast.info(`Article déjà scanné: ${foundItem.name}`);
        return;
      }
      
      setScannedItems(prev => new Set([...prev, foundItem.id]));
      setLastScannedItem(foundItem);
      playSuccessSound();
      toast.success(`Article scanné: ${foundItem.name}`);
    } else {
      playErrorSound();
      toast.error(`Code non reconnu: ${code}`);
    }
  };

  const handleClose = () => {
    stopScanner();
    setIsOpen(false);
    setShowResults(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setScannedItems(new Set());
    setLastScannedItem(null);
    setShowResults(false);
    setIsPaused(false);
  };

  const handleReset = () => {
    setScannedItems(new Set());
    setLastScannedItem(null);
    setShowResults(false);
    toast.info("Inventaire réinitialisé");
  };

  const handleShowResults = async () => {
    await stopScanner();
    setShowResults(true);
  };

  const handleMarkMissing = async () => {
    if (missingItems.length === 0) {
      toast.info("Aucun article manquant à marquer");
      return;
    }

    setIsSaving(true);
    try {
      const missingIds = missingItems.map(item => item.id);
      
      const { error } = await supabase
        .from('inventory_items')
        .update({ status: 'missing' })
        .in('id', missingIds);

      if (error) throw error;

      toast.success(`${missingItems.length} article(s) marqué(s) comme manquant(s)`);
      onAuditComplete();
      handleClose();
    } catch (error) {
      console.error("Error marking items as missing:", error);
      toast.error("Erreur lors de la mise à jour des articles");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && !isScanning && !showResults && !isPaused) {
      const timeout = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, showResults, isPaused]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <>
      <Button onClick={handleOpen} variant="outline">
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Mode Inventaire
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Mode Inventaire Complet
            </DialogTitle>
            <DialogDescription>
              Scannez tous les articles pour identifier les manquants
            </DialogDescription>
          </DialogHeader>

          {!showResults ? (
            <div className="space-y-4 flex-1">
              {/* Progress */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progression</span>
                    <span className="text-sm text-muted-foreground">
                      {scannedCount} / {totalCount} articles scannés
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {scannedCount} trouvés
                    </span>
                    <span className="flex items-center gap-1">
                      <FileWarning className="h-3 w-3 text-orange-500" />
                      {missingCount} restants
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Scanner viewport */}
              <div className="relative">
                <div 
                  id="audit-barcode-reader" 
                  className="w-full rounded-lg overflow-hidden bg-muted"
                  style={{ minHeight: "200px" }}
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      {isPaused ? (
                        <>
                          <Pause className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Scanner en pause</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Initialisation de la caméra...</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Last scanned item */}
              {lastScannedItem && (
                <Card className="border-green-500">
                  <CardHeader className="py-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Dernier article scanné
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2">
                    <div className="flex items-center gap-3">
                      {lastScannedItem.photo_url && (
                        <SignedImage 
                          storedUrl={lastScannedItem.photo_url}
                          bucket="inventory-photos"
                          alt={lastScannedItem.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{lastScannedItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[lastScannedItem.category] || lastScannedItem.category}
                          {lastScannedItem.location && ` • ${lastScannedItem.location}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                {isPaused ? (
                  <Button onClick={resumeScanner} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Reprendre
                  </Button>
                ) : (
                  <Button onClick={pauseScanner} variant="outline" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={handleShowResults} variant="default">
                  Voir résultats
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{scannedCount}</p>
                        <p className="text-sm text-muted-foreground">Articles trouvés</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{missingCount}</p>
                        <p className="text-sm text-muted-foreground">Articles manquants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Missing items list */}
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-orange-500" />
                    Articles non scannés ({missingCount})
                  </CardTitle>
                  <CardDescription>
                    Ces articles n'ont pas été scannés pendant l'inventaire
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[200px]">
                    <div className="px-4 pb-4 space-y-2">
                      {missingItems.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p>Tous les articles ont été scannés !</p>
                        </div>
                      ) : (
                        missingItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            {item.photo_url ? (
                              <SignedImage 
                                storedUrl={item.photo_url}
                                bucket="inventory-photos"
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                                fallback={
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                }
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.barcode || item.serial_number || "Sans code"}
                                {item.location && ` • ${item.location}`}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              Non scanné
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowResults(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Continuer le scan
                </Button>
                {missingCount > 0 && (
                  <Button 
                    onClick={handleMarkMissing} 
                    variant="destructive"
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Enregistrement..." : `Marquer ${missingCount} comme manquant(s)`}
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
