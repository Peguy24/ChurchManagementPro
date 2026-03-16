-- Fix existing invitations: mark as used where the invited user actually signed up
-- Match by tenant_id and name correlation

-- Moody Thelisma -> moodythelisma@gmail.com in tenant dfc9e7fe
UPDATE admin_invitations SET used_at = '2026-03-07T16:46:51Z' WHERE id = '087ba1c1-6783-433f-8062-ade1a67d54ce' AND used_at IS NULL;

-- Paola Laborde -> paolabeautyglam@gmail.com in tenant b921daeb
UPDATE admin_invitations SET used_at = '2026-03-05T01:26:10Z' WHERE id = 'f7d6878d-0ff1-4698-a430-8c3f4cf71366' AND used_at IS NULL;

-- Fleudenson Etienne Fils -> fetiennefils@gmail.com in tenant f824d6cf
UPDATE admin_invitations SET used_at = '2026-03-07T01:18:39Z' WHERE id = 'bff63a8c-dd59-4a10-ad00-cedbc10daaf9' AND used_at IS NULL;

-- Fix NULL emails in profiles by pulling from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;