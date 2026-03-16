import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const translations = {
  fr: {
    title: "Maintenance en cours",
    description: "La plateforme est temporairement en maintenance. Nous travaillons pour améliorer votre expérience. Veuillez réessayer dans quelques instants.",
    retry: "Réessayer",
  },
  en: {
    title: "Maintenance in Progress",
    description: "The platform is temporarily under maintenance. We are working to improve your experience. Please try again in a few moments.",
    retry: "Retry",
  },
  ht: {
    title: "Antretyen an kou",
    description: "Platfòm nan anba antretyen pou yon ti moman. Nou ap travay pou amelyore eksperyans ou. Tanpri eseye ankò nan kèk moman.",
    retry: "Eseye ankò",
  },
};

export default function MaintenancePage() {
  const { language } = useLanguage();
  const t = translations[language] || translations.fr;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Construction className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="text-muted-foreground leading-relaxed">{t.description}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.retry}
        </Button>
      </div>
    </div>
  );
}
