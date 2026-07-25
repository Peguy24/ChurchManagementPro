import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Church, Lightbulb } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  ROLE_STARTERS,
  ROLE_FOLLOW_UPS,
  ROLE_LABELS,
  TOOL_FOLLOW_UPS,
  resolveAssistantRole,
  availableAssistantRoles,
  type AssistantRole,
} from "@/lib/aiAssistantPrompts";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pastor-assistant`;


const COPY: Record<string, Record<string, string>> = {
  fr: {
    title: "Assistant IA Pastoral",
    subtitle: "Posez une question sur votre congrégation. Les réponses proviennent uniquement de vos données.",
    empty: "Comment puis-je vous aider aujourd'hui ?",
    placeholder: "Posez votre question...",
    thinking: "Analyse de vos données...",
    error: "Une erreur s'est produite",
  },
  en: {
    title: "AI Pastor Assistant",
    subtitle: "Ask a question about your congregation. Answers come only from your own data.",
    empty: "How can I help you today?",
    placeholder: "Ask your question...",
    thinking: "Analyzing your data...",
    error: "Something went wrong",
  },
  ht: {
    title: "Asistan IA Pastoral",
    subtitle: "Poze yon kesyon sou kongregasyon w. Repons yo soti sèlman nan done pa w.",
    empty: "Kijan m ka ede w jodi a ?",
    placeholder: "Poze kesyon w...",
    thinking: "N ap analize done w yo...",
    error: "Gen yon erè ki rive",
  },
};

const LABELS: Record<string, { starters: string; followUps: string; role: string }> = {
  en: { starters: "Suggested questions", followUps: "You might also ask", role: "Questions for" },
  fr: { starters: "Questions suggérées", followUps: "Vous pouvez aussi demander", role: "Questions pour" },
  ht: { starters: "Kesyon sijere", followUps: "Ou ka mande tou", role: "Kesyon pou" },
};


export default function AiAssistant() {
  const { language } = useLanguage();
  const lang = COPY[language] ? language : "en";
  const copy = COPY[lang];
  const labels = LABELS[lang] ?? LABELS.en;
  const { roles } = useUserRole();
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<AssistantRole | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const roleOptions = useMemo(() => availableAssistantRoles(roles as string[]), [roles]);
  const role: AssistantRole = activeRole ?? resolveAssistantRole(roles as string[]);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: ENDPOINT,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { language: lang },
      }),
    [token, lang],
  );

  const { messages, sendMessage, status } = useChat({
    id: "ai-pastor-assistant",
    transport,
    onError: (error) => {
      toast({ title: copy.error, description: error.message, variant: "destructive" });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, messages.length]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy || !token) return;
    void sendMessage({ text: value });
    setInput("");
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Church className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </header>

        <Conversation className="flex-1 rounded-xl border bg-card">
          <ConversationContent className="space-y-4">
            {messages.length === 0 && (
              <ConversationEmptyState
                icon={<Church className="h-8 w-8 text-primary" />}
                title={copy.empty}
                description={copy.subtitle}
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {(SUGGESTIONS[lang] ?? SUGGESTIONS.en).map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </ConversationEmptyState>
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    }
                    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                      const p = part as any;
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={p.type} state={p.state} />
                          <ToolContent>
                            <ToolInput input={p.input} />
                            <ToolOutput output={p.output} errorText={p.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}

            {status === "submitted" && <Shimmer>{copy.thinking}</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef as any}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder={copy.placeholder}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() || busy || !token} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </Layout>
  );
}
