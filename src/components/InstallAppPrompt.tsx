import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COPY = {
  en: {
    title: "Install Church Management Pro",
    android: "Add the app to your home screen for faster access.",
    ios: "Tap Share, then \"Add to Home Screen\" to install the app.",
    install: "Install",
    later: "Not now",
  },
  fr: {
    title: "Installer Church Management Pro",
    android: "Ajoutez l'application à votre écran d'accueil pour un accès rapide.",
    ios: "Touchez Partager, puis « Sur l'écran d'accueil » pour installer l'app.",
    install: "Installer",
    later: "Plus tard",
  },
  ht: {
    title: "Enstale Church Management Pro",
    android: "Mete app la sou ekran akèy telefòn ou pou w jwenn li pi vit.",
    ios: "Peze Share, apre sa \"Add to Home Screen\" pou w enstale app la.",
    install: "Enstale",
    later: "Pita",
  },
} as const;

const DISMISS_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isPreviewContext() {
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovable.app")
  );
}

export default function InstallAppPrompt() {
  const { language } = useLanguage();
  const copy = COPY[language] ?? COPY.en;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isPreviewContext() || isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    let timer: number | undefined;
    if (isIos()) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <Card className="flex items-start gap-3 p-4 shadow-lg">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          {iosHint ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint ? copy.ios : copy.android}
          </p>
          {!iosHint && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install}>
                {copy.install}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {copy.later}
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label={copy.later}
          onClick={dismiss}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </Card>
    </div>
  );
}
