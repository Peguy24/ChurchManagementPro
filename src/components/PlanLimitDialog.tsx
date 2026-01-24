import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Crown, Users, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "members" | "branches" | "users";
  currentCount: number;
  maxCount: number;
  planName: string;
}

export function PlanLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxCount,
  planName,
}: PlanLimitDialogProps) {
  const navigate = useNavigate();

  const getTitle = () => {
    switch (limitType) {
      case "members":
        return "Limite de membres atteinte";
      case "branches":
        return "Limite de succursales atteinte";
      case "users":
        return "Limite d'utilisateurs atteinte";
    }
  };

  const getDescription = () => {
    switch (limitType) {
      case "members":
        return `Votre plan ${planName} est limité à ${maxCount} membres. Vous avez actuellement ${currentCount} membres actifs.`;
      case "branches":
        return `Votre plan ${planName} est limité à ${maxCount} succursale${maxCount > 1 ? "s" : ""}. Vous avez actuellement ${currentCount} succursale${currentCount > 1 ? "s" : ""} active${currentCount > 1 ? "s" : ""}.`;
      case "users":
        return `Votre plan ${planName} est limité à ${maxCount} utilisateurs. Vous avez actuellement ${currentCount} utilisateur${currentCount > 1 ? "s" : ""} actif${currentCount > 1 ? "s" : ""}.`;
    }
  };

  const getIcon = () => {
    switch (limitType) {
      case "members":
        return <Users className="h-12 w-12 text-muted-foreground" />;
      case "branches":
        return <Building2 className="h-12 w-12 text-muted-foreground" />;
      case "users":
        return <Users className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/settings/subscription");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {getIcon()}
            </div>
            <AlertDialogTitle className="text-xl">{getTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-center">
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Passez à un plan supérieur</p>
              <p className="text-sm text-muted-foreground">
                Débloquez plus de capacité et de fonctionnalités avancées
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Fermer</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpgrade} className="gap-2">
            Voir les plans
            <ArrowRight className="h-4 w-4" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
