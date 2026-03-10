

## Plan : Sélecteur d'église post-login pour utilisateurs multi-tenants

### Problème
`profiles.tenant_id` ne stocke qu'un seul tenant. Un utilisateur ayant des rôles dans plusieurs églises (via `tenant_user_roles`) est automatiquement redirigé vers la dernière église assignée, sans possibilité de choisir.

### Solution

**Après un login réussi via `/auth`**, vérifier si l'utilisateur a des rôles approuvés dans plusieurs tenants. Si oui, afficher un écran de sélection au lieu de rediriger directement.

### Changements

#### 1. Nouvelle page `src/pages/SelectChurch.tsx`
- Affichée après login quand l'utilisateur a des rôles dans 2+ tenants
- Liste les églises avec nom, logo, rôle de l'utilisateur dans chaque église
- Au clic, met à jour `profiles.tenant_id` puis redirige vers `/`
- Traductions FR/EN/HT

#### 2. Modifier `src/pages/Auth.tsx` — handleLogin
- Après login réussi, requêter `tenant_user_roles` pour lister tous les tenants où l'utilisateur a `is_approved = true`
- Si **1 seul tenant** → comportement actuel (redirection directe)
- Si **2+ tenants** → rediriger vers `/select-church`
- Si **0 tenant** → comportement actuel (pending approval)

#### 3. Modifier `src/pages/TenantAuth.tsx` — handleLogin
- Même logique : après login, si l'utilisateur a des rôles dans d'autres tenants en plus du tenant courant, s'assurer que le `tenant_id` du profil est bien mis à jour vers le tenant de la page `/t/:slug/auth` (pas besoin de sélecteur ici car le contexte est explicite)

#### 4. Ajouter la route dans `src/App.tsx`
- Route `/select-church` protégée (utilisateur authentifié requis)

#### 5. Modifier `src/pages/Home.tsx`
- Si l'utilisateur est connecté, approuvé, mais a des rôles dans plusieurs tenants et que son `tenant_id` actuel ne correspond à aucun rôle approuvé → rediriger vers `/select-church`

### Détails techniques
- La requête pour détecter les multi-tenants :
```sql
SELECT tur.tenant_id, tur.role, t.name, t.slug, t.logo_url, t.primary_color
FROM tenant_user_roles tur
JOIN tenants t ON t.id = tur.tenant_id
WHERE tur.user_id = :userId AND tur.is_approved = true
```
- Mise à jour du profil au choix : `UPDATE profiles SET tenant_id = :selectedTenantId WHERE id = :userId`
- Page `SelectChurch` similaire visuellement à `SelectTenant` mais filtrée aux églises de l'utilisateur, avec affichage du rôle

