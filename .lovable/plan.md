

## Plan: Translate Custom Fields Module (FR / EN / HT)

### Files to modify (4 files)

1. **`src/contexts/LanguageContext.tsx`** -- Add a `customFields` translation object with all keys needed across the 4 components, in French, English, and Haitian Creole. Keys include: title, subtitle, addField, tabs (members, branches, ministries, events, donations), table headers (label, fieldName, type, status, actions), field types (text, textarea, number, date, select, checkbox), statuses (required, active, inactive), empty state message, delete confirmation, toast messages, dialog titles, form labels (entityType, fieldType, fieldNameInternal, fieldLabel, options, newOption, displayOrder, required, active), entity options (member, branch, ministry, event, donation), cancel/create/edit buttons, and the renderer heading ("Custom Fields") + select placeholder.

2. **`src/pages/CustomFields.tsx`** -- Import `useLanguage`, add back button with `useNavigate`, replace all hardcoded French strings with `t("customFields.xxx")` calls.

3. **`src/components/CustomFieldList.tsx`** -- Accept and use `useLanguage` hook. Replace hardcoded table headers, field type labels, status badges, empty state text, and delete confirmation with `t()` calls.

4. **`src/components/CustomFieldDialog.tsx`** -- Import `useLanguage`. Replace all hardcoded labels (dialog title, form labels, entity select items, field type select items, placeholders, buttons, toast messages) with `t()` calls.

5. **`src/components/CustomFieldsRenderer.tsx`** -- Import `useLanguage`. Translate the "Champs Personnalisés" heading and "Sélectionner..." placeholder.

### No database changes needed

