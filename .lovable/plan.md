## Système d'avis clients (témoignages réels)

### 1. Base de données — table `client_reviews`

Champs :
- `id`, `user_id` (FK auth.users), `tenant_id` (FK tenants)
- `reviewer_name`, `reviewer_role` (Pasteur, Trésorier, Admin…), `church_name`
- `city`, `country`
- `rating` (smallint, 1–5, contrainte CHECK)
- `text` (max 500 caractères, validé par trigger)
- `language` ('fr' | 'en' | 'ht')
- `consent_public_display` (bool, requis = true à la soumission)
- `status` (`pending` | `approved` | `rejected`, défaut `pending`)
- `moderated_by`, `moderated_at`, `moderation_notes`
- `created_at`, `updated_at`

Index : `status`, `(status, created_at DESC)`, `user_id`.

Règle métier : un seul avis `pending` ou `approved` par `user_id` (contrainte partielle unique). L'utilisateur peut éditer son avis tant qu'il est `pending` ; après approbation, il devient verrouillé (modification = repasse en `pending`).

### 2. Politiques RLS

- **INSERT** : utilisateur authentifié uniquement, `user_id = auth.uid()`, `status` forcé à `pending` (trigger `BEFORE INSERT`).
- **SELECT public (anon + authenticated)** : uniquement les avis `status = 'approved'` (alimente la page commerciale).
- **SELECT propriétaire** : l'utilisateur voit son propre avis (tous statuts).
- **UPDATE propriétaire** : peut modifier son avis si `status != 'rejected'` ; toute modification du texte/note repasse en `pending` via trigger.
- **SELECT/UPDATE/DELETE Super Admin** : accès complet via `is_super_admin(auth.uid())`.

### 3. Notifications

- Trigger `AFTER INSERT` → `platform_notifications` (`notification_type: 'client_review'`, severity `info`, titre + métadonnées).
- Réutilise le canal Realtime + préférences existantes (`super_admin_notification_prefs`) — ajout d'un champ `client_review_channel` (toast/email/both/none).
- Email aux Super Admins opt-in via la fonction `get_client_review_email_recipients()` (calquée sur celle des contact messages), envoyée depuis un trigger d'edge function ou directement depuis l'edge function de soumission.

### 4. Edge function `submit-client-review`

- Vérifie le JWT (utilisateur connecté).
- Valide payload via Zod (longueurs, rating 1–5, consentement = true).
- Insère l'avis (RLS s'applique).
- Best-effort : envoie email aux Super Admins opt-in via Resend.

### 5. Frontend — soumission

**Composant `LeaveReviewDialog.tsx`** (utilisé depuis le Dashboard ou un bouton dans Settings) :
- Formulaire : note (étoiles cliquables 1–5), nom (préfilled depuis profil), rôle (select), nom de l'église (préfilled tenant), ville, pays, texte (textarea max 500 + compteur), case "J'autorise l'affichage public de mon nom et de mon avis sur churchmanagementpro.com" (obligatoire).
- Affiche le statut courant si l'utilisateur a déjà soumis : "En attente de modération" / "Approuvé" / "Rejeté" (avec raison).
- i18n FR/EN/HT.

Point d'entrée : bouton "Laisser un avis" dans le Dashboard (carte dédiée) + lien depuis Settings.

### 6. Frontend — page commerciale (`src/pages/Commercial.tsx`)

Section Témoignages :
- Récupère les avis approuvés via `supabase.from('client_reviews').select(...).eq('status','approved').order('created_at', desc).limit(24)` — accessible publiquement grâce à la policy SELECT.
- Filtre selon la langue de l'UI (avec fallback sur tous si peu d'avis).
- **Si 0 avis approuvés** : conserve les 3 témoignages cod\u00e9s en dur actuels (fallback).
- **Si 1–6 avis** : grille statique (mêmes cartes que l'existant).
- **Si > 6 avis** : carrousel auto-play (utilise `embla-carousel-react` déjà présent), 3 cartes visibles desktop / 1 mobile, avance toutes les 5s, pause au survol.
- Affiche : note (étoiles), texte, nom, rôle, église, ville/pays, badge "Vérifié" (toujours, puisque tous les avis viennent d'utilisateurs connectés).

### 7. Page de modération `/super-admin/reviews`

Calquée sur `ContactMessages.tsx` :
- Onglets : **En attente** (badge avec compteur), **Approuvés**, **Rejetés**, **Tous**.
- Recherche (nom, église, texte).
- Liste : carte avec note étoiles, extrait, nom + église, date, statut.
- Dialog détail : tous les champs + actions **Approuver**, **Rejeter** (textarea raison obligatoire), **Supprimer** (confirmation).
- Realtime : abonnement `INSERT/UPDATE` sur `client_reviews` → invalide queries + toast (gated par `client_review_channel`).
- Lien dans la sidebar Super Admin et dans `SuperAdminNotifications` (ajout entrée `TYPE_CONFIG.client_review`).

### 8. i18n

Nouvelles clés sous `commercial.reviews.*`, `superAdmin.reviews.*`, `dashboard.leaveReview.*` dans FR/EN/HT (clés en anglais, valeurs traduites).

### Détails techniques

- Migration unique : enum `review_status`, table, contraintes, indexes, RLS, triggers (`BEFORE INSERT` force pending, `BEFORE UPDATE` re-pending si texte/rating changé, `AFTER INSERT` notification), fonction `get_client_review_email_recipients()`, ajout colonne `client_review_channel` à `super_admin_notification_prefs`, publication Realtime + REPLICA IDENTITY FULL.
- Edge function : `supabase/functions/submit-client-review/index.ts` avec validation Zod, JWT check, Resend email best-effort.
- Routing : ajout route lazy `/super-admin/reviews` dans `App.tsx` (ProtectedRoute requireSuperAdmin).
- Composants nouveaux : `LeaveReviewDialog.tsx`, `ReviewsCarousel.tsx`, `pages/ClientReviews.tsx` (modération).
- Pas de stockage d'avatar/photo (avatar = initiales générées côté front, comme l'existant).