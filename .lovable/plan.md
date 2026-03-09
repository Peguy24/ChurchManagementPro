

## Problem

The RichTextEditor toolbar tooltips and the "htmlContent" label are hardcoded in English. Users see untranslated labels like "Bold", "Italic", "Bullet list", "Visual", etc. regardless of their language setting. The label "HTML Content" on the email templates page is also too technical.

## Plan

### 1. Add `richTextEditor` translations to all 3 languages in `LanguageContext.tsx`

Add a new `richTextEditor` block under each language (FR, EN, HT) with keys for all toolbar labels:
- `bold`, `italic`, `underline`, `h1`, `h2`, `bulletList`, `numberedList`, `alignLeft`, `center`, `alignRight`, `link`, `undo`, `redo`, `visual`, `html`, `urlPrompt`

Also rename `htmlContent` → update translation values to "Message Content" / "Contenu du message" / "Kontni mesaj la" to be less technical.

### 2. Update `RichTextEditor.tsx` to use `t()` for all labels

Replace all hardcoded English strings in the toolbar buttons array and the source toggle tooltip with `t("richTextEditor.xxx")` calls. Also translate the `prompt("URL:")` to use `t("richTextEditor.urlPrompt")`.

### 3. Update `EmailTemplates.tsx` label

Change the `htmlContent` translation values in all 3 languages to say "Message Content" instead of "HTML Content" / "Contenu HTML".

### Files to modify
- `src/contexts/LanguageContext.tsx` -- add `richTextEditor` translations (FR/EN/HT) + update `htmlContent` values
- `src/components/RichTextEditor.tsx` -- replace hardcoded labels with `t()` calls

