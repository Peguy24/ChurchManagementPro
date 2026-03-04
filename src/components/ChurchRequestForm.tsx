import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Church, Send, Loader2, CheckCircle2, Copy, ExternalLink } from "lucide-react";

interface ChurchRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan?: string;
}

interface ProvisionResult {
  success: boolean;
  registrationLink: string;
  emailSent: boolean;
  message: string;
  slug: string;
}

export function ChurchRequestForm({ open, onOpenChange, selectedPlan = "basic" }: ChurchRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [formData, setFormData] = useState({
    church_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    requested_plan: selectedPlan,
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.church_name || !formData.contact_name || !formData.contact_email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-provision-tenant', {
        body: {
          church_name: formData.church_name,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          requested_plan: formData.requested_plan,
          message: formData.message || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as ProvisionResult);
      
      if (data.emailSent) {
        toast.success("Votre église a été créée ! Vérifiez votre email pour activer votre compte.");
      } else {
        toast.success("Votre église a été créée ! Utilisez le lien fourni pour activer votre compte.");
      }
    } catch (error: any) {
      console.error("Error provisioning tenant:", error);
      toast.error("Erreur lors de la création: " + (error.message || "Veuillez réessayer."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (result?.registrationLink) {
      navigator.clipboard.writeText(result.registrationLink);
      toast.success("Lien copié !");
    }
  };

  const handleClose = () => {
    setResult(null);
    setFormData({
      church_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      requested_plan: "basic",
      message: "",
    });
    onOpenChange(false);
  };

  // Success screen
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground">Église créée avec succès !</h2>
              <p className="text-muted-foreground mt-2">
                {result.emailSent 
                  ? `Un email a été envoyé à ${formData.contact_email} avec les instructions pour créer votre compte administrateur.`
                  : "Utilisez le lien ci-dessous pour créer votre compte administrateur."
                }
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">🔗 Lien d'activation</p>
              <div className="flex gap-2">
                <Input 
                  value={result.registrationLink} 
                  readOnly 
                  className="text-xs bg-background"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                className="w-full" 
                onClick={() => window.open(result.registrationLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir le lien d'activation
              </Button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⏰ Vous bénéficiez d'un <strong>essai gratuit de 14 jours</strong>. 
                Ce lien est valide pendant 7 jours.
              </p>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            Essai gratuit de 14 jours
          </DialogTitle>
          <DialogDescription>
            Créez votre espace église en quelques secondes. Aucune carte de crédit requise.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="church_name">Nom de l'église *</Label>
              <Input
                id="church_name"
                value={formData.church_name}
                onChange={(e) => setFormData({ ...formData, church_name: e.target.value })}
                placeholder="Ex: Église de la Grâce"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Votre nom *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Ex: Jean Dupont"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@eglise.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Adresse de l'église"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested_plan">Plan souhaité</Label>
            <Select 
              value={formData.requested_plan} 
              onValueChange={(v) => setFormData({ ...formData, requested_plan: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Essentiel - $49/mois</SelectItem>
                <SelectItem value="standard">Professionnel - $99/mois</SelectItem>
                <SelectItem value="premium">Entreprise - $199/mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Dites-nous en plus sur votre église et vos besoins..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Démarrer l'essai gratuit
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
