import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signedUrl } = useSignedUrl(currentPhotoUrl, "inventory-photos");
  const previewUrl = localPreviewUrl || signedUrl;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("inventory.photoSelectError"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("inventory.photoSizeError"));
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => { setLocalPreviewUrl(e.target?.result as string); };
      reader.readAsDataURL(file);

      const fileExt = file.name.split(".").pop();
      const fileName = `${itemId || "new"}-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inventory-photos")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      onPhotoChange(filePath);
      toast.success(t("inventory.photoUploaded"));
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(t("inventory.photoUploadError"));
      setLocalPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (currentPhotoUrl) {
      try {
        await supabase.storage.from("inventory-photos").remove([currentPhotoUrl]);
      } catch (error) {
        console.error("Error removing photo:", error);
      }
    }
    setLocalPreviewUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>{t("inventory.photo")}</Label>
      <div className="flex items-start gap-4">
        <div className="relative">
          {previewUrl ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted">
              <img src={previewUrl} alt={t("inventory.previewAlt")} className="w-full h-full object-cover" />
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={handleRemovePhoto} disabled={isUploading}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} disabled={isUploading} className="hidden" id="photo-upload" />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("inventory.uploading")}</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />{previewUrl ? t("inventory.changePhoto") : t("inventory.addPhoto")}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{t("inventory.photoHint")}</p>
        </div>
      </div>
    </div>
  );
}
