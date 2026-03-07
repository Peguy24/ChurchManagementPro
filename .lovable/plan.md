

## Plan: Replace "Custom API" with "Priority Support" in the Enterprise plan

### Changes Required

**1. Update translation keys** in `src/contexts/LanguageContext.tsx`:
- Rename `feat_customApi` to `feat_prioritySupport` across all 3 languages:
  - FR: "Support prioritaire"
  - EN: "Priority Support"
  - HT: "Sipò priyorite"

**2. Update `src/pages/Commercial.tsx`** (line 155):
- Change `t("commercial.feat_customApi")` to `t("commercial.feat_prioritySupport")`

**3. Update `src/pages/Subscription.tsx`** (line 301):
- Replace the hardcoded "Custom API" text with the translated `t("commercial.feat_prioritySupport")` call

**4. Update `src/hooks/usePlanLimits.tsx`**:
- Remove `api: true` from the Enterprise features (or rename it to `prioritySupport: true`)
- Update the `PlanLimits` interface accordingly

**5. Update `src/components/FeatureLockedCard.tsx`** (if it references API anywhere) -- no changes needed based on current code.

This is a straightforward find-and-replace across 4 files with no database or backend changes needed.

