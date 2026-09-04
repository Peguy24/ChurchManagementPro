# Policy acceptance records + re-acceptance when policies change

## What's happening today

Confirmed: the acceptance table is completely empty (0 records). When a church signs up, the app tries to save the acceptance from the browser, but the visitor isn't signed in yet at that moment, so the save is refused by the access rules and silently ignored. So there is no proof of who accepted what, and no way to tell churches when the policies change.

## What will be built

### 1. Reliable acceptance records at sign-up
Move the recording into the sign-up backend step (which runs with full rights), so every new church sign-up stores:
- church, person's name and email
- which document (terms, privacy, payment terms) and its version number at that moment
- date/time and IP address

### 2. Acceptance history visible to you
On the Legal documents admin page, the acceptance list already exists but is always empty. It will show real rows plus:
- filter by church and by document
- a badge showing whether the accepted version is the current one or outdated
- CSV export for your records

### 3. Notify churches when a policy is updated
When you save a new version of a document, you choose "notify churches". Church admins then receive an email in their language with a link to the updated policy.

### 4. Re-acceptance banner in the app
If a church's latest accepted version is lower than the current version, tenant admins see a blocking-but-dismissible notice on login: "Our Terms have been updated - review and accept". Accepting stores a new record (this time the person is signed in, so it saves normally).

## Technical notes

- `auto-provision-tenant` edge function: after tenant creation, read current versions from `legal_documents` and insert three rows into `tenant_policy_acceptances` with service role, capturing `x-forwarded-for` as `ip_address`. Remove the client-side insert in `ChurchRequestForm.tsx` (it always fails).
- Migration: make `accepted_by` nullable-safe for the signup case (it is already nullable); add index on `(tenant_id, document_type, document_version)`; add a `notify_on_publish`/`published_at` handling for `legal_documents` if needed; add an RPC `get_tenant_policy_status(tenant_id)` returning current vs accepted version per document.
- New component `PolicyReacceptanceBanner` rendered in the tenant layout for admins, inserting a new acceptance row (authenticated insert policy already allows this).
- New edge function `notify-policy-update` sending to approved tenant admins via the existing email queue, trilingual (FR/EN/HT).
- `LegalDocuments.tsx`: filters, current/outdated badge, CSV export, and a "notify churches" checkbox on save.

## Note on the past
Existing churches that signed up before this fix have no stored acceptance. The re-acceptance banner will capture them the next time their admin logs in, which gives you a dated record going forward.
