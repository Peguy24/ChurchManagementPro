
# Church Custom Domains for the Mini-Site

Give every church two options for their public website:

1. **Free subdomain** — `mychurch.churchmanagementpro.com`, included with the $15/mo Website add-on. Set up in one click.
2. **Bring your own domain** — `www.mychurch.org`. Church buys it from any registrar (or through Lovable), points DNS at our platform, we auto-issue SSL. Also included in the add-on — no extra fee.

Both options resolve to the same beautiful template the church already edits at `/church-website`.

---

## What the church sees

New **Domain** tab inside Church Website (right next to Basic / Services / Contact / Social / Media):

```text
┌─ Your website URL ────────────────────────────────────┐
│                                                        │
│  ◉ Free subdomain                                      │
│    [ mychurch          ] .churchmanagementpro.com     │
│    ✓ Available          [ Claim subdomain ]           │
│                                                        │
│  ○ Use my own domain (e.g. www.mychurch.org)          │
│    [ www.mychurch.org                        ] [Add]  │
│                                                        │
│    Status: Pending DNS · SSL not issued yet           │
│    Add these two DNS records at your registrar:       │
│      Type: CNAME  Host: www  Value: sites.churchmanagementpro.com │
│      Type: TXT    Host: _cmp-verify  Value: cmp-verify=abc123…    │
│    [ Copy records ]  [ Check DNS ]  [ Remove domain ] │
│                                                        │
└────────────────────────────────────────────────────────┘

Primary domain: www.mychurch.org  (used in emails & shares)
Also live at: mychurch.churchmanagementpro.com  (auto-redirects to primary)
```

Statuses shown to the church:
- **Pending DNS** — records not detected yet
- **Verifying** — records found, waiting for SSL
- **Active** — live and secure (green padlock)
- **Failed** — DNS moved away or SSL couldn't issue (with retry button)

---

## What the super admin sees

New "Custom Domains" section in `/super-admin/website-addons`:
- Table of every custom domain: church name, hostname, status, added date
- Force re-verify, revoke, view DNS records
- Alerts widget: X domains failed verification, Y offline

---

## How routing works

Two new public entry points, both served by React Router:

- `mychurch.churchmanagementpro.com` → resolve subdomain → render existing `PublicChurchSite`
- `www.mychurch.org` → resolve custom hostname → same `PublicChurchSite`

The existing `/site/:slug` route keeps working forever as a fallback.

---

## Cost & billing

- Free subdomain: **no extra charge**, part of the $15/mo add-on.
- BYO custom domain: **no extra charge from us**. Church pays their registrar (~$12/year). We eat the SSL cost (Cloudflare SaaS free tier or Let's Encrypt).
- Optional future: sell domains directly through the app with a $5–10/yr markup.

---

## Technical details

**Database — new table `tenant_domains`:**

```
tenant_domains
  id, tenant_id, hostname (unique), kind ('subdomain' | 'custom'),
  is_primary, verification_token, status
  ('pending' | 'verifying' | 'active' | 'failed' | 'removed'),
  ssl_provisioned_at, last_verified_at, created_at
```

Enforce: one primary per tenant, subdomain slug reserved from `tenants.slug` if desired, RLS so tenants only see their own rows.

**DNS + SSL provider — Cloudflare for SaaS (recommended):**
- Wildcard `*.churchmanagementpro.com` CNAME → our origin (one-time DNS)
- For custom domains: call Cloudflare API from an edge function to add a "custom hostname" — Cloudflare handles verification + SSL automatically
- Requires two secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`
- Free plan supports 100 custom hostnames; SaaS plan is ~$7/mo for more

If Cloudflare SaaS is off the table, alternative is Caddy on our origin with on-demand TLS (Let's Encrypt) — cheaper but more ops work.

**Edge functions (new):**
- `provision-tenant-domain` — church adds hostname → generate verify token → call Cloudflare API → return DNS instructions
- `verify-tenant-domain` — polled/manual "Check DNS" → resolves TXT + CNAME, updates status
- `remove-tenant-domain` — deletes from Cloudflare + our DB
- Cron every 15 min: re-check "verifying" and "active" domains, mark offline if DNS drifted

**Frontend routing (`PublicChurchSite`):**
- On mount, read `window.location.hostname`
- If it matches `*.churchmanagementpro.com` and isn't the apex → look up by subdomain
- If it's neither our apex nor a Lovable subdomain → look up by custom hostname
- Otherwise fall back to `/site/:slug`

Extend the existing `get_public_website` RPC to accept a `hostname` parameter.

**Public URL used everywhere else:**
- `useCurrentTenant`, share buttons, QR codes, emails all read the tenant's `primary_domain` (falls back to Lovable URL if none set).

**Rollout order:**
1. Migration + `tenant_domains` table + RLS + grants
2. Update `get_public_website` RPC to support hostname lookup
3. Update `PublicChurchSite` + router to handle host-based resolution
4. Free subdomain flow (no external API — just DB + wildcard DNS one-time setup)
5. Cloudflare secrets + provisioning edge functions
6. Church-facing Domain tab in editor
7. Super-admin management page
8. Verification cron + status monitoring

---

## Out of scope for this plan

- Selling domains inside the app (registrar API integration — separate plan later)
- Per-church email at their custom domain (e.g. `pastor@mychurch.org`) — that's a separate email-hosting problem
- Wildcard subdomains under the church's custom domain (e.g. `giving.mychurch.org`)

Confirm and I'll start with step 1 (schema + subdomain-only flow), so churches immediately get `mychurch.churchmanagementpro.com`, and layer the Cloudflare BYO-domain flow on top once you've added the two Cloudflare secrets.
