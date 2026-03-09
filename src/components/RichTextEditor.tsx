import { useRef, useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Link,
  Undo,
  Redo,
  Code,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  className,
  minHeight = "300px",
}: RichTextEditorProps) {
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const isInternalChange = useRef(false);

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback(
    (command: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, val);
      handleInput();
    },
    [handleInput]
  );

  const handleLink = useCallback(() => {
    const url = prompt(t("richTextEditor.urlPrompt"));
    if (url) exec("createLink", url);
  }, [exec, t]);

  const toolbarButtons = [
    { icon: Bold, action: () => exec("bold"), label: t("richTextEditor.bold") },
    { icon: Italic, action: () => exec("italic"), label: t("richTextEditor.italic") },
    { icon: Underline, action: () => exec("underline"), label: t("richTextEditor.underline") },
    { type: "separator" as const },
    { icon: Heading1, action: () => exec("formatBlock", "h1"), label: t("richTextEditor.h1") },
    { icon: Heading2, action: () => exec("formatBlock", "h2"), label: t("richTextEditor.h2") },
    { type: "separator" as const },
    { icon: List, action: () => exec("insertUnorderedList"), label: t("richTextEditor.bulletList") },
    { icon: ListOrdered, action: () => exec("insertOrderedList"), label: t("richTextEditor.numberedList") },
    { type: "separator" as const },
    { icon: AlignLeft, action: () => exec("justifyLeft"), label: t("richTextEditor.alignLeft") },
    { icon: AlignCenter, action: () => exec("justifyCenter"), label: t("richTextEditor.center") },
    { icon: AlignRight, action: () => exec("justifyRight"), label: t("richTextEditor.alignRight") },
    { type: "separator" as const },
    { icon: Link, action: handleLink, label: t("richTextEditor.link") },
    { type: "separator" as const },
    { icon: Undo, action: () => exec("undo"), label: t("richTextEditor.undo") },
    { icon: Redo, action: () => exec("redo"), label: t("richTextEditor.redo") },
  ];

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
          {toolbarButtons.map((btn, i) => {
            if ("type" in btn && btn.type === "separator") {
              return (
                <div
                  key={`sep-${i}`}
                  className="w-px h-6 bg-border mx-1"
                />
              );
            }
            const { icon: Icon, action, label } = btn as {
              icon: React.ComponentType<{ className?: string }>;
              action: () => void;
              label: string;
            };
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={action}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={showSource ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowSource(!showSource)}
                >
                  {showSource ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showSource ? t("richTextEditor.visual") : t("richTextEditor.html")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {showSource ? (
        <textarea
          className="w-full p-3 font-mono text-sm bg-background text-foreground resize-y focus:outline-none"
          style={{ minHeight }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          className="p-3 prose prose-sm max-w-none focus:outline-none text-foreground"
          style={{ minHeight }}
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          suppressContentEditableWarning
        />
      )}
    </div>
  );
}
