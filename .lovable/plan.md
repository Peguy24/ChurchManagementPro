

# Plan: Système de Support par Email et Tickets

## Vue d'ensemble

Implémenter un système de support complet permettant aux tenants d'envoyer des demandes d'aide depuis leur tableau de bord. Les demandes sont stockées en base de données et envoyées par email aux super admins. Les super admins peuvent consulter et gérer tous les tickets depuis leur dashboard.

---

## Architecture

```text
┌─────────────────────────┐     ┌──────────────────────┐
│  Tenant Dashboard       │     │  Super Admin Dashboard│
│  ┌───────────────────┐  │     │  ┌────────────────┐   │
│  │ Support Button (?) │──┼────▶│  │ Tickets List   │   │
│  │ → Form Dialog     │  │     │  │ → Reply/Close  │   │
│  │ → My Tickets List │  │     │  └────────────────┘   │
│  └───────────────────┘  │     └──────────────────────┘
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Edge Function           │
│  send-support-email      │
│  → Save to DB            │
│  → Send via Resend       │
└─────────────────────────┘
```

---

## Changements requis

### 1. Migration DB: Table `support_tickets`

Nouvelle table pour stocker les demandes de support :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | Tenant demandeur |
| user_id | uuid | Utilisateur qui a créé le ticket |
| subject | text | Sujet du ticket |
| message | text | Message détaillé |
| priority | text | low / medium / high |
| status | text | open / in_progress / resolved / closed |
| category | text | general / billing / technical / feature_request |
| admin_response | text | Réponse du super admin |
| responded_by | uuid | Super admin qui a répondu |
| responded_at | timestamptz | Date de réponse |
| created_at | timestamptz | Date de création |
| updated_at | timestamptz | Date de mise à jour |

**RLS Policies:**
- Tenant users can INSERT tickets for their own tenant
- Tenant users can SELECT their own tenant's tickets
- Super admins can SELECT all tickets
- Super admins can UPDATE all tickets (respond/close)
- Super admins can DELETE tickets

### 2. Edge Function: `send-support-email`

- Reçoit le ticket (subject, message, priority, category)
- Vérifie le JWT et récupère les infos du tenant
- Insère dans `support_tickets`
- Envoie un email de notification aux super admins via Resend
- Envoie un email de confirmation au demandeur

### 3. Nouveau composant: `src/components/SupportDialog.tsx`

- Bouton flottant ou accessible depuis le menu latéral
- Dialog avec formulaire : sujet, catégorie (dropdown), priorité, message
- Validation avec Zod
- Affichage de la liste des tickets précédents avec statut

### 4. Nouvelle page: `src/pages/Support.tsx`

- Accessible depuis le menu latéral (icône MessageSquare déjà importée dans Layout)
- Liste des tickets du tenant avec statut coloré
- Possibilité de créer un nouveau ticket
- Vue des réponses admin

### 5. Section Super Admin: `src/pages/SupportManagement.tsx`

- Liste de tous les tickets de tous les tenants
- Filtrage par statut, priorité, tenant
- Formulaire de réponse inline
- Changement de statut (open → in_progress → resolved → closed)
- Envoi d'email de réponse au demandeur

### 6. Mise à jour: `src/components/Layout.tsx`

- Ajout du lien "Support" dans le menu latéral pour les tenants
- Ajout du lien "Gestion Support" dans le menu super admin

### 7. Mise à jour: `src/App.tsx`

- Route `/support` → page Support (tenant)
- Route `/support-management` → page SupportManagement (super admin)

---

## Détails Techniques

### Structure du formulaire de support

```typescript
const supportSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(['general', 'billing', 'technical', 'feature_request']),
  priority: z.enum(['low', 'medium', 'high']),
  message: z.string().min(20).max(2000),
});
```

### Badges de statut

| Statut | Couleur | Label |
|--------|---------|-------|
| open | Bleu | Ouvert |
| in_progress | Orange | En cours |
| resolved | Vert | Résolu |
| closed | Gris | Fermé |

### Edge Function Pattern

Suit le même pattern que `send-admin-invite` :
- CORS headers
- JWT validation
- Service role client pour l'insertion
- Resend pour les emails

---

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| Migration SQL (support_tickets) | Créer |
| `supabase/functions/send-support-email/index.ts` | Créer |
| `supabase/config.toml` | Mettre à jour (verify_jwt = false) |
| `src/pages/Support.tsx` | Créer |
| `src/pages/SupportManagement.tsx` | Créer |
| `src/components/SupportDialog.tsx` | Créer |
| `src/components/Layout.tsx` | Modifier |
| `src/App.tsx` | Modifier |

---

## Sécurité

- RLS stricte : les tenants ne voient que leurs propres tickets
- JWT obligatoire pour l'edge function
- Validation Zod côté client et serveur
- Limites de longueur sur les champs texte
- Seuls les super admins peuvent répondre/fermer les tickets

