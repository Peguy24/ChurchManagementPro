

## Plan: Add Legal Document Links to Commercial Page Footer

### What
Add links to Terms of Use, Privacy Policy, and Payment Terms in the footer of the Commercial/landing page, pointing to the existing `/legal/:docType` routes.

### Implementation

**Single file change** — `src/pages/Commercial.tsx`

Update the footer section (lines 571-587) to include a row of links:
- Terms of Use → `/legal/terms_of_use`
- Privacy Policy → `/legal/privacy_policy`  
- Payment Terms → `/legal/payment_terms`

Links will be styled as subtle text links (`text-muted-foreground hover:text-foreground`) placed between the logo and the copyright text, using `Link` from react-router-dom.

| File | Action |
|------|--------|
| `src/pages/Commercial.tsx` | Edit footer to add 3 legal links |

