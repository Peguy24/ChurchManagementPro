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
import { Crown, Users, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlanLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "members" | "branches" | "users" | "storage";
  currentCount: number;
  maxCount: number;
  planName: string;
}

const translations = {
  fr: {
    membersTitle: "Limite de membres atteinte",
    branchesTitle: "Limite de succursales atteinte",
    usersTitle: "Limite d'utilisateurs atteinte",
    storageTitle: "Limite de stockage atteinte",
    membersDesc: "Votre plan {plan} est limité à {max} membres. Vous avez actuellement {current} membres actifs.",
    branchesDesc: "Votre plan {plan} est limité à {max} succursale(s). Vous avez actuellement {current} succursale(s) active(s).",
    usersDesc: "Votre plan {plan} est limité à {max} utilisateurs. Vous avez actuellement {current} utilisateur(s) actif(s).",
    storageDesc: "Votre plan {plan} est limité à {max} MB de stockage. Vous utilisez actuellement {current} MB.",
    upgradeTitle: "Passez à un plan supérieur",
    upgradeDesc: "Débloquez plus de capacité et de fonctionnalités avancées",
    close: "Fermer",
    viewPlans: "Voir les plans",
  },
  en: {
    membersTitle: "Member limit reached",
    branchesTitle: "Branch limit reached",
    usersTitle: "User limit reached",
    storageTitle: "Storage limit reached",
    membersDesc: "Your {plan} plan is limited to {max} members. You currently have {current} active members.",
    branchesDesc: "Your {plan} plan is limited to {max} branch(es). You currently have {current} active branch(es).",
    usersDesc: "Your {plan} plan is limited to {max} users. You currently have {current} active user(s).",
    storageDesc: "Your {plan} plan is limited to {max} MB of storage. You are currently using {current} MB.",
    upgradeTitle: "Upgrade to a higher plan",
    upgradeDesc: "Unlock more capacity and advanced features",
    close: "Close",
    viewPlans: "View plans",
  },
  ht: {
    membersTitle: "Limit manm rive",
    branchesTitle: "Limit branch rive",
    usersTitle: "Limit itilizatè rive",
    storageTitle: "Limit estokaj rive",
    membersDesc: "Plan {plan} ou a limite a {max} manm. Ou gen aktyèlman {current} manm aktif.",
    branchesDesc: "Plan {plan} ou a limite a {max} branch. Ou gen aktyèlman {current} branch aktif.",
    usersDesc: "Plan {plan} ou a limite a {max} itilizatè. Ou gen aktyèlman {current} itilizatè aktif.",
    storageDesc: "Plan {plan} ou a limite a {max} MB estokaj. Ou itilize aktyèlman {current} MB.",
    upgradeTitle: "Pase nan yon plan siperyè",
    upgradeDesc: "Deblouke plis kapasite ak fonksyonalite avanse",
    close: "Fèmen",
    viewPlans: "Wè plan yo",
  },
};

export function PlanLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxCount,
  planName,
}: PlanLimitDialogProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const getTitle = () => {
    switch (limitType) {
      case "members": return t.membersTitle;
      case "branches": return t.branchesTitle;
      case "users": return t.usersTitle;
      case "storage": return t.storageTitle;
    }
  };

  const getDescription = () => {
    const template = limitType === "members" ? t.membersDesc 
      : limitType === "branches" ? t.branchesDesc 
      : t.usersDesc;
    return template
      .replace("{plan}", planName)
      .replace("{max}", String(maxCount))
      .replace("{current}", String(currentCount));
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
              <p className="font-medium">{t.upgradeTitle}</p>
              <p className="text-sm text-muted-foreground">
                {t.upgradeDesc}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t.close}</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpgrade} className="gap-2">
            {t.viewPlans}
            <ArrowRight className="h-4 w-4" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
