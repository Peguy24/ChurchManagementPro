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

  // Load image when file changes
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

  // Handle background removal toggle
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
          title: "Arrière-plan supprimé",
          description: "L'arrière-plan a été supprimé avec succès.",
        });
      } catch (error) {
        console.error("Background removal failed:", error);
        toast({
          title: "Erreur",
          description: "La suppression de l'arrière-plan a échoué. Veuillez réessayer.",
          variant: "destructive",
        });
        setRemoveBackgroundEnabled(false);
      } finally {
        setRemovingBackground(false);
        setBgRemovalProgress(0);
      }
    };

    processBackgroundRemoval();
  }, [removeBackgroundEnabled, image, processedImage, toast]);

  // Get the current image to display
  const currentImage = removeBackgroundEnabled && processedImage ? processedImage : image;

  // Draw image on canvas
  const drawImage = useCallback(() => {
    if (!canvasRef.current || !currentImage) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw checkerboard pattern for transparency
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

    // Calculate scaled dimensions
    const scaledWidth = currentImage.naturalWidth * scale;
    const scaledHeight = currentImage.naturalHeight * scale;

    // Calculate position to center the image
    const x = (CANVAS_SIZE - scaledWidth) / 2 + position.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + position.y;

    // Draw image
    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);

    // Draw circular overlay guide
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

      // Fill with white or transparent background
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
          <DialogTitle>Recadrer la Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Background Removal Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="remove-bg" className="text-sm font-medium cursor-pointer">
                Supprimer l'arrière-plan
              </Label>
            </div>
            <Switch
              id="remove-bg"
              checked={removeBackgroundEnabled}
              onCheckedChange={handleRemoveBackgroundToggle}
              disabled={removingBackground || processing}
            />
          </div>

          {/* Progress bar for background removal */}
          {removingBackground && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Suppression en cours...</span>
                <span className="font-medium">{bgRemovalProgress}%</span>
              </div>
              <Progress value={bgRemovalProgress} className="h-2" />
            </div>
          )}

          {/* Canvas for cropping */}
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
            Glissez pour positionner • Utilisez le zoom pour ajuster
          </p>

          {/* Zoom controls */}
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
            Annuler
          </Button>
          <Button
            onClick={handleCrop}
            disabled={processing || !currentImage || removingBackground}
          >
            {processing ? "Traitement..." : "Appliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
