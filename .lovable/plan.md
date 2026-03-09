

## Plan: Clarify "Parent Branch" field with helper text + rename label

### Problem
The "Parent Branch" / "Branche parente" field is confusing. Users don't understand what it means in the context of church management.

### Changes

#### 1. Add translation keys in `src/contexts/LanguageContext.tsx`
- Rename `parentBranch` label to be clearer:
  - FR: `"Dépend de (église principale)"`
  - EN: `"Belongs to (main church)"`
  - HT: `"Depann de (legliz prensipal)"`
- Add new key `parentBranchHelp`:
  - FR: `"Sélectionnez l'église principale dont cette branche dépend. Laissez vide si c'est l'église principale."`
  - EN: `"Select the main church this branch belongs to. Leave empty if this is the main church."`
  - HT: `"Chwazi legliz prensipal branch sa a depann de li. Kite vid si se legliz prensipal la."`

#### 2. Update `src/components/BranchDialog.tsx`
- Add a small helper text (`<p className="text-xs text-muted-foreground">`) below the parent branch Select using `t("branches.parentBranchHelp")`.

