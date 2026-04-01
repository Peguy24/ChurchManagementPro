import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "Pending Approval",
    subtitle: "Your account has been created successfully",
    description: "An administrator must approve your account and assign you a role before you can access the system.",
    contactAdmin: "Please contact your church administrator to approve your access.",
    loggedInAs: "Logged in as:",
    logout: "Log Out",
  },
  fr: {
    title: "En Attente d'Approbation",
    subtitle: "Votre compte a été créé avec succès",
    description: "Un administrateur doit approuver votre compte et vous assigner un rôle avant que vous puissiez accéder au système.",
    contactAdmin: "Veuillez contacter l'administrateur de votre église pour qu'il approuve votre accès.",
    loggedInAs: "Connecté en tant que :",
    logout: "Se déconnecter",
  },
  ht: {
    title: "Ap Tann Apwobasyon",
    subtitle: "Kont ou kreye avèk siksè",
    description: "Yon administratè dwe apwouve kont ou epi ba ou yon wòl anvan ou ka jwenn aksè nan sistèm nan.",
    contactAdmin: "Tanpri kontakte administratè legliz ou a pou li apwouve aksè ou.",
    loggedInAs: "Konekte kòm :",
    logout: "Dekonekte",
  },
};

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const { language } = useLanguage();

  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">{lt("title")}</CardTitle>
          <CardDescription>{lt("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">{lt("description")}</p>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">{lt("loggedInAs")}</p>
            <p className="font-medium">{user?.email}</p>
          </div>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>{lt("contactAdmin")}</p>
          </div>

          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {lt("logout")}
          </Button>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground">
        <img src="/images/church-management-pro-logo.webp" alt="Church Manager Pro" className="h-8 object-contain" width={32} height={32} />
      </div>
    </div>
  );
}
