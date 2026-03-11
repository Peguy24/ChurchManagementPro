import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ZoomIn, ZoomOut, RotateCcw, Sparkles } from "lucide-react";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const localT: Record<Language, Record<string, string>> = {
  fr: {
    cropTitle: "Recadrer la Photo",
    removeBackground: "Supprimer l'arrière-plan",
    removing: "Suppression en cours...",
    dragHint: "Glissez pour positionner • Utilisez le zoom pour ajuster",
    cancel: "Annuler",
    processing: "Traitement...",
    apply: "Appliquer",
    bgRemoved: "Arrière-plan supprimé",
    bgRemovedDesc: "L'arrière-plan a été supprimé avec succès.",
    bgError: "Erreur",
    bgErrorDesc: "La suppression de l'arrière-plan a échoué. Veuillez réessayer.",
  },
  en: {
    cropTitle: "Crop Photo",
    removeBackground: "Remove background",
    removing: "Removing...",
    dragHint: "Drag to position • Use zoom to adjust",
    cancel: "Cancel",
    processing: "Processing...",
    apply: "Apply",
    bgRemoved: "Background removed",
    bgRemovedDesc: "The background was removed successfully.",
    bgError: "Error",
    bgErrorDesc: "Background removal failed. Please try again.",
  },
  ht: {
    cropTitle: "Koupe Foto",
    removeBackground: "Retire fon an",
    removing: "Ap retire...",
    dragHint: "Glise pou pozisyone • Itilize zoom pou ajiste",
    cancel: "Anile",
    processing: "Ap trete...",
    apply: "Aplike",
    bgRemoved: "Fon retire",
    bgRemovedDesc: "Fon an retire avèk siksè.",
    bgError: "Erè",
    bgErrorDesc: "Retire fon an pa mache. Tanpri eseye ankò.",
  },
};

interface PhotoCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
}

export default function PhotoCropper({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
}: PhotoCropperProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const lt = localT[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [removeBackgroundEnabled, setRemoveBackgroundEnabled] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);

  const CANVAS_SIZE = 300;
  const OUTPUT_SIZE = 400;

  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setProcessedImage(null);
      setRemoveBackgroundEnabled(false);
      
      const minScale = Math.max(
        CANVAS_SIZE / img.naturalWidth,
        CANVAS_SIZE / img.naturalHeight
      );
      setScale(minScale);
      setPosition({ x: 0, y: 0 });
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  useEffect(() => {
    const processBackgroundRemoval = async () => {
      if (!removeBackgroundEnabled || !image || processedImage) return;

      setRemovingBackground(true);
      setBgRemovalProgress(0);

      try {
        const blob = await removeBackground(image, (progress) => {
          setBgRemovalProgress(progress);
        });

        const newImg = await loadImage(blob);
        setProcessedImage(newImg);
        
        toast({
          title: lt.bgRemoved,
          description: lt.bgRemovedDesc,
        });
      } catch (error) {
        console.error("Background removal failed:", error);
        toast({
          title: lt.bgError,
          description: lt.bgErrorDesc,
          variant: "destructive",
        });
        setRemoveBackgroundEnabled(false);
      } finally {
        setRemovingBackground(false);
        setBgRemovalProgress(0);
      }
    };

    processBackgroundRemoval();
  }, [removeBackgroundEnabled, image, processedImage, toast, lt]);

  const currentImage = removeBackgroundEnabled && processedImage ? processedImage : image;

  const drawImage = useCallback(() => {
    if (!canvasRef.current || !currentImage) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (removeBackgroundEnabled && processedImage) {
      const tileSize = 10;
      for (let y = 0; y < CANVAS_SIZE; y += tileSize) {
        for (let x = 0; x < CANVAS_SIZE; x += tileSize) {
          ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? "#e0e0e0" : "#ffffff";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    const scaledWidth = currentImage.naturalWidth * scale;
    const scaledHeight = currentImage.naturalHeight * scale;
    const x = (CANVAS_SIZE - scaledWidth) / 2 + position.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + position.y;

    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
  }, [currentImage, scale, position, removeBackgroundEnabled, processedImage]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (value: number[]) => {
    if (!currentImage) return;
    const minScale = Math.max(
      CANVAS_SIZE / currentImage.naturalWidth,
      CANVAS_SIZE / currentImage.naturalHeight
    );
    const newScale = minScale + (value[0] / 100) * (minScale * 3);
    setScale(newScale);
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    if (currentImage) {
      const minScale = Math.max(
        CANVAS_SIZE / currentImage.naturalWidth,
        CANVAS_SIZE / currentImage.naturalHeight
      );
      setScale(minScale);
    }
  };

  const handleCrop = async () => {
    if (!currentImage) return;

    setProcessing(true);

    try {
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      if (removeBackgroundEnabled && processedImage) {
        ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      }

      const scaleFactor = OUTPUT_SIZE / CANVAS_SIZE;
      const scaledWidth = currentImage.naturalWidth * scale * scaleFactor;
      const scaledHeight = currentImage.naturalHeight * scale * scaleFactor;
      const x = (OUTPUT_SIZE - scaledWidth) / 2 + position.x * scaleFactor;
      const y = (OUTPUT_SIZE - scaledHeight) / 2 + position.y * scaleFactor;

      ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);

      const format = removeBackgroundEnabled && processedImage ? "image/png" : "image/jpeg";
      
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
          }
          setProcessing(false);
        },
        format,
        0.9
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      setProcessing(false);
    }
  };

  const getSliderValue = () => {
    if (!currentImage) return [50];
    const minScale = Math.max(
      CANVAS_SIZE / currentImage.naturalWidth,
      CANVAS_SIZE / currentImage.naturalHeight
    );
    const value = ((scale - minScale) / (minScale * 3)) * 100;
    return [Math.max(0, Math.min(100, value))];
  };

  const handleRemoveBackgroundToggle = (checked: boolean) => {
    if (checked && !processedImage) {
      setRemoveBackgroundEnabled(true);
    } else if (!checked) {
      setRemoveBackgroundEnabled(false);
    } else {
      setRemoveBackgroundEnabled(checked);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{lt.cropTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="remove-bg" className="text-sm font-medium cursor-pointer">
                {lt.removeBackground}
              </Label>
            </div>
            <Switch
              id="remove-bg"
              checked={removeBackgroundEnabled}
              onCheckedChange={handleRemoveBackgroundToggle}
              disabled={removingBackground || processing}
            />
          </div>

          {removingBackground && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lt.removing}</span>
                <span className="font-medium">{bgRemovalProgress}%</span>
              </div>
              <Progress value={bgRemovalProgress} className="h-2" />
            </div>
          )}

          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-muted">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={`cursor-move ${removingBackground ? 'opacity-50' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[10px] border-2 border-dashed border-white/50 rounded-full" />
              </div>
              {removingBackground && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {lt.dragHint}
          </p>

          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={getSliderValue()}
              onValueChange={handleScaleChange}
              max={100}
              step={1}
              className="flex-1"
              disabled={removingBackground}
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetPosition}
              className="ml-2"
              disabled={removingBackground}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing || removingBackground}
          >
            {lt.cancel}
          </Button>
          <Button
            onClick={handleCrop}
            disabled={processing || !currentImage || removingBackground}
          >
            {processing ? lt.processing : lt.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
