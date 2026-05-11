import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";

interface ContactFormProps {
  language: string;
}

const T = {
  fr: {
    name: "Nom complet",
    email: "Email",
    message: "Votre message",
    send: "Envoyer le message",
    sending: "Envoi…",
    success: "Message envoyé ! Notre équipe vous répondra bientôt.",
    error: "Impossible d'envoyer le message. Réessayez.",
    invalid: "Veuillez remplir tous les champs correctement (message d'au moins 10 caractères).",
    placeholderMsg: "Décrivez votre demande…",
  },
  ht: {
    name: "Non konplè",
    email: "Imèl",
    message: "Mesaj ou",
    send: "Voye mesaj la",
    sending: "Ap voye…",
    success: "Mesaj voye! Ekip nou ap reponn ou byento.",
    error: "Pa kapab voye mesaj la. Eseye ankò.",
    invalid: "Tanpri ranpli tout chan yo kòrèkteman (mesaj omwen 10 karaktè).",
    placeholderMsg: "Eksplike demann ou…",
  },
  en: {
    name: "Full name",
    email: "Email",
    message: "Your message",
    send: "Send message",
    sending: "Sending…",
    success: "Message sent! Our team will reply soon.",
    error: "Could not send message. Please try again.",
    invalid: "Please fill all fields correctly (message at least 10 characters).",
    placeholderMsg: "Describe your request…",
  },
} as const;

export function ContactForm({ language }: ContactFormProps) {
  const { toast } = useToast();
  const t = T[(language as keyof typeof T)] ?? T.en;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [mountedAt] = useState(() => Date.now());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();
    if (cleanName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanMsg.length < 10) {
      toast({ title: t.invalid, variant: "destructive" });
      return;
    }
    // Client-side throttle: 1 submission per 30s per browser
    const lastSent = Number(localStorage.getItem("contact_last_sent") || 0);
    if (Date.now() - lastSent < 30_000) {
      toast({ title: t.error, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-public-contact", {
        body: {
          name: cleanName,
          email: cleanEmail,
          message: cleanMsg,
          website, // honeypot — must be empty
          elapsedMs: Date.now() - mountedAt,
          language,
        },
      });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error((data as { error?: string } | null)?.error || error?.message || "Failed");
      }
      toast({ title: t.success });
      localStorage.setItem("contact_last_sent", String(Date.now()));
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      console.error(err);
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t.name}</Label>
              <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t.email}</Label>
              <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 255))} maxLength={255} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message">{t.message}</Label>
            <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} maxLength={2000} rows={5} placeholder={t.placeholderMsg} required />
            <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
          </div>
          {/* Honeypot — hidden from real users */}
          <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden" style={{ position: "absolute" }}>
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? t.sending : t.send}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ContactForm;
