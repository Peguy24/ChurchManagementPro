// Language context with FR/EN/HT support - v4
// Translation dictionaries live in src/locales/* and are loaded on demand so a
// visitor only downloads the language they actually read.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallbackTranslations from "@/locales/fallback";

export type Language = "fr" | "en" | "ht";

type Dict = Record<string, unknown>;

const loaders: Record<Language, () => Promise<{ default: Dict }>> = {
  fr: () => import("@/locales/fr"),
  en: () => import("@/locales/en"),
  ht: () => import("@/locales/ht"),
};

// Modules already fetched during this session.
const loaded: Partial<Record<Language, Dict>> = {};

async function loadLanguage(lang: Language): Promise<Dict> {
  if (loaded[lang]) return loaded[lang] as Dict;
  const mod = await loaders[lang]();
  loaded[lang] = mod.default;
  return mod.default;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
}

// Last-resort label: turn "taxExemption.statusNone" into "Status None"
// so a missing key never renders as a raw variable name in the UI.
function humanizeKey(key: string): string {
  const last = key.split(".").pop() || key;
  const spaced = last
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function readStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem("app-language");
    if (saved === "fr" || saved === "en" || saved === "ht") return saved;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  // Bumped whenever a dictionary finishes loading so consumers re-render.
  const [ready, setReady] = useState<Language | null>(loaded[readStoredLanguage()] ? readStoredLanguage() : null);

  useEffect(() => {
    let cancelled = false;
    loadLanguage(language)
      .then(() => {
        if (!cancelled) setReady(language);
      })
      .catch(() => {
        if (!cancelled) setReady(language);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    // Fetch first so the UI never flashes untranslated keys mid-switch.
    loadLanguage(lang)
      .catch(() => undefined)
      .finally(() => {
        setLanguageState(lang);
        try {
          localStorage.setItem("app-language", lang);
        } catch {
          /* storage unavailable */
        }
      });

    // Sync language to profile for email template localization
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase.from("profiles").update({ language: lang }).eq("id", data.user.id).then(() => {});
      }
    });
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");

      const lookup = (lang: Language) => {
        let value: any = loaded[lang];
        if (!value) return undefined;
        for (const k of keys) {
          if (value === undefined || value === null) break;
          value = value[k];
        }
        return typeof value === "string" ? value : undefined;
      };

      const direct = lookup(language) ?? lookup("en");
      if (direct !== undefined) return direct;

      const fb = (fallbackTranslations as any)[language]?.[key] ?? (fallbackTranslations as any).en?.[key];
      if (typeof fb === "string") return fb;

      return humanizeKey(key);
    },
    // `ready` participates so a freshly loaded dictionary refreshes consumers.
    [language, ready],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  // Hold the first paint until the active dictionary is in memory, otherwise the
  // UI would briefly render untranslated keys.
  if (ready === null) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
