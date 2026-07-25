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
import AiMessageFeedback from "@/components/AiMessageFeedback";

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

/** Concatenated plain text of an assistant message (used as the rated answer). */
function messageText(message: { parts: any[] }): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text as string)
    .join("\n")
    .trim();
}

/** The most recent user question preceding an assistant message. */
function lastUserText(messages: any[], index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messageText(messages[i]);
  }
  return "";
}




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

  const starters = (ROLE_STARTERS[lang] ?? ROLE_STARTERS.en)[role] ?? [];

  // Follow-ups are derived from the tools the assistant just used, falling back to the role defaults.
  const followUps = useMemo(() => {
    if (busy || messages.length === 0) return [];
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return [];
    const toolNames = last.parts
      .map((p: any) => (typeof p.type === "string" && p.type.startsWith("tool-") ? p.type.slice(5) : null))
      .filter(Boolean) as string[];
    const out: string[] = [];
    for (const name of toolNames) {
      const set = TOOL_FOLLOW_UPS[name]?.[lang] ?? TOOL_FOLLOW_UPS[name]?.en;
      if (set) out.push(...set);
    }
    const fallback = (ROLE_FOLLOW_UPS[lang] ?? ROLE_FOLLOW_UPS.en)[role] ?? [];
    return [...new Set(out.length ? out : fallback)].slice(0, 3);
  }, [messages, busy, lang, role]);



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
                <div className="mt-5 w-full max-w-2xl space-y-3">
                  {roleOptions.length > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{labels.role}</span>
                      {roleOptions.map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={r === role ? "default" : "ghost"}
                          className="h-7 rounded-full px-3 text-xs"
                          onClick={() => setActiveRole(r)}
                        >
                          {(ROLE_LABELS[lang] ?? ROLE_LABELS.en)[r]}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.starters}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {starters.map((s) => (
                      <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

              </ConversationEmptyState>
            )}

            {messages.map((message, mi) => (
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
                  {message.role === "assistant" &&
                    !(busy && mi === messages.length - 1) &&
                    messageText(message) && (
                      <AiMessageFeedback
                        messageId={message.id}
                        question={lastUserText(messages, mi)}
                        answer={messageText(message)}
                        language={lang}
                        assistantRole={role}
                      />
                    )}
                </MessageContent>
              </Message>
            ))}


            {followUps.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {labels.followUps}
                </span>
                {followUps.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={() => send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

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
