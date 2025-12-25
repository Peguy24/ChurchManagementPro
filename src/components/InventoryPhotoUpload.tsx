import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryPhotoUploadProps {
  currentPhotoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  itemId?: string;
}

export default function InventoryPhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  itemId,
}: InventoryPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${itemId || "new"}-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("inventory-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("inventory-photos")
        .getPublicUrl(filePath);

      onPhotoChange(publicUrlData.publicUrl);
      toast.success("Photo téléchargée avec succès");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors du téléchargement de la photo");
      setPreviewUrl(currentPhotoUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (currentPhotoUrl) {
      try {
        // Extract file path from URL
        const urlParts = currentPhotoUrl.split("/inventory-photos/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("inventory-photos").remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing photo:", error);
      }
    }
    
    setPreviewUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Photo</Label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative">
          {previewUrl ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted">
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemovePhoto}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Upload button */}
        <div className="flex-1 space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="photo-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {previewUrl ? "Changer la photo" : "Ajouter une photo"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WebP. Max 5 Mo.
          </p>
        </div>
      </div>
    </div>
  );
}
