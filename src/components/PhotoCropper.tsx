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
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const CANVAS_SIZE = 300;
  const OUTPUT_SIZE = 400; // Final cropped image size

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      
      // Calculate initial scale to fit image in canvas
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

  // Draw image on canvas
  const drawImage = useCallback(() => {
    if (!canvasRef.current || !image) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Fill with white background
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate scaled dimensions
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    // Calculate position to center the image
    const x = (CANVAS_SIZE - scaledWidth) / 2 + position.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + position.y;

    // Draw image
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Draw circular overlay guide
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, scale, position]);

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
    if (!image) return;
    const minScale = Math.max(
      CANVAS_SIZE / image.naturalWidth,
      CANVAS_SIZE / image.naturalHeight
    );
    const newScale = minScale + (value[0] / 100) * (minScale * 3);
    setScale(newScale);
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    if (image) {
      const minScale = Math.max(
        CANVAS_SIZE / image.naturalWidth,
        CANVAS_SIZE / image.naturalHeight
      );
      setScale(minScale);
    }
  };

  const handleCrop = async () => {
    if (!image) return;

    setProcessing(true);

    try {
      // Create output canvas
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Scale factor from preview to output
      const scaleFactor = OUTPUT_SIZE / CANVAS_SIZE;

      // Calculate scaled dimensions
      const scaledWidth = image.naturalWidth * scale * scaleFactor;
      const scaledHeight = image.naturalHeight * scale * scaleFactor;

      // Calculate position
      const x = (OUTPUT_SIZE - scaledWidth) / 2 + position.x * scaleFactor;
      const y = (OUTPUT_SIZE - scaledHeight) / 2 + position.y * scaleFactor;

      // Draw image
      ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

      // Convert to blob
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
          }
          setProcessing(false);
        },
        "image/jpeg",
        0.9
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      setProcessing(false);
    }
  };

  const getSliderValue = () => {
    if (!image) return [50];
    const minScale = Math.max(
      CANVAS_SIZE / image.naturalWidth,
      CANVAS_SIZE / image.naturalHeight
    );
    const value = ((scale - minScale) / (minScale * 3)) * 100;
    return [Math.max(0, Math.min(100, value))];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Recadrer la Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas for cropping */}
          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-muted">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              {/* Center guide overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[10px] border-2 border-dashed border-white/50 rounded-full" />
              </div>
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
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetPosition}
              className="ml-2"
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
            disabled={processing}
          >
            Annuler
          </Button>
          <Button onClick={handleCrop} disabled={processing || !image}>
            {processing ? "Traitement..." : "Appliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
