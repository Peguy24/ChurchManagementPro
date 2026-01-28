import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface LogoUploadProps {
  tenantId: string | null;
  currentLogoUrl: string;
  onLogoUploaded: (url: string) => void;
}

export default function LogoUpload({ tenantId, currentLogoUrl, onLogoUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    if (!tenantId) {
      toast.error("Aucune église sélectionnée");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (currentLogoUrl && currentLogoUrl.includes('tenant-logos')) {
        const oldPath = currentLogoUrl.split('/tenant-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('tenant-logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(fileName);

      onLogoUploaded(publicUrl);
      toast.success("Logo téléchargé avec succès");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors du téléchargement: " + error.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl || !tenantId) return;

    setUploading(true);
    try {
      // Delete from storage if it's our bucket
      if (currentLogoUrl.includes('tenant-logos')) {
        const path = currentLogoUrl.split('/tenant-logos/')[1];
        if (path) {
          await supabase.storage.from('tenant-logos').remove([path]);
        }
      }

      onLogoUploaded("");
      setPreviewUrl(null);
      toast.success("Logo supprimé");
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Logo de l'Église
      </Label>
      
      <div className="flex items-start gap-4">
        {/* Logo Preview */}
        <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
          {displayUrl ? (
            <>
              <img 
                src={displayUrl} 
                alt="Logo de l'église" 
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

        {/* Upload Controls */}
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
                Téléchargement...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {displayUrl ? "Changer le logo" : "Télécharger un logo"}
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            PNG, JPG ou WEBP. Max 2 Mo.
          </p>
        </div>
      </div>
    </div>
  );
}
