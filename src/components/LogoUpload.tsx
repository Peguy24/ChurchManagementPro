import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LogoUploadProps {
  tenantId: string | null;
  currentLogoUrl: string;
  onLogoUploaded: (url: string) => void;
}

export default function LogoUpload({ tenantId, currentLogoUrl, onLogoUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t("churchSettings.logoSelectImage"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("churchSettings.logoMaxSize"));
      return;
    }

    if (!tenantId) {
      toast.error(t("churchSettings.logoNoChurch"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo-${Date.now()}.${fileExt}`;

      if (currentLogoUrl && currentLogoUrl.includes('tenant-logos')) {
        const oldPath = currentLogoUrl.split('/tenant-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('tenant-logos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(fileName);

      onLogoUploaded(publicUrl);
      toast.success(t("churchSettings.logoSuccess"));
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(t("churchSettings.logoUploadError") + ": " + error.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl || !tenantId) return;

    setUploading(true);
    try {
      if (currentLogoUrl.includes('tenant-logos')) {
        const path = currentLogoUrl.split('/tenant-logos/')[1];
        if (path) {
          await supabase.storage.from('tenant-logos').remove([path]);
        }
      }

      onLogoUploaded("");
      setPreviewUrl(null);
      toast.success(t("churchSettings.logoRemoved"));
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error(t("churchSettings.logoRemoveError"));
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        {t("churchSettings.logoLabel")}
      </Label>
      
      <div className="flex items-start gap-4">
        <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
          {displayUrl ? (
            <>
              <img 
                src={displayUrl} 
                alt={t("churchSettings.logoAlt")}
                className="w-full h-full object-contain"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || !tenantId}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !tenantId}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("churchSettings.logoUploading")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {displayUrl ? t("churchSettings.logoChange") : t("churchSettings.logoUpload")}
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            {t("churchSettings.logoHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
