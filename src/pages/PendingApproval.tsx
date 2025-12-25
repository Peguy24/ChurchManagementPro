import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Clock, LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();

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
          <CardTitle className="text-2xl">En Attente d'Approbation</CardTitle>
          <CardDescription>
            Votre compte a été créé avec succès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Un administrateur doit approuver votre compte et vous assigner un rôle 
              avant que vous puissiez accéder au système.
            </p>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Connecté en tant que:</p>
            <p className="font-medium">{user?.email}</p>
          </div>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Veuillez contacter l'administrateur de votre église pour qu'il approuve 
              votre accès.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground">
        <Church className="h-5 w-5" />
        <span className="text-sm">ÉgliseApp</span>
      </div>
    </div>
  );
}
