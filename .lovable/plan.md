

# Plan: Module Achats à Crédit et Prêts (3 langues)

## Résumé

Ajouter un module complet de gestion des **achats à crédit**, **prêts reçus** (l'église emprunte) et **prêts accordés** (l'église prête), avec suivi des paiements partiels et soldes restants. Tout en FR/EN/HT.

---

## 1. Base de données (2 nouvelles tables)

### Table `credit_operations`
Stocke les achats à crédit, prêts reçus et prêts accordés.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | Isolation multi-tenant |
| type | text | `credit_purchase`, `loan_received`, `loan_given` |
| counterparty | text | Fournisseur / Banque / Personne |
| description | text | Détail de l'opération |
| total_amount | numeric | Montant total |
| amount_paid | numeric default 0 | Montant déjà payé/remboursé |
| status | text default 'active' | `active`, `completed`, `cancelled` |
| start_date | date | Date de début |
| due_date | date nullable | Date d'échéance |
| interest_rate | numeric default 0 | Taux d'intérêt (%) |
| notes | text nullable | |
| branch_id | uuid FK branches nullable | |
| created_by | uuid | Créateur |
| created_at | timestamptz | |

### Table `credit_payments`
Stocke chaque paiement partiel lié à une opération.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| credit_operation_id | uuid FK credit_operations | |
| amount | numeric | Montant du paiement |
| payment_date | date | Date du paiement |
| payment_method | text nullable | Espèces, virement, etc. |
| notes | text nullable | |
| created_by | uuid | |
| created_at | timestamptz | |

**RLS** : Politiques basées sur tenant_id via join sur credit_operations pour les paiements. Lecture/écriture pour les utilisateurs authentifiés du tenant.

**Trigger** : Mise à jour automatique de `amount_paid` et `status` (→ `completed` quand total atteint) sur credit_operations à chaque INSERT dans credit_payments.

---

## 2. Nouvelle page `CreditAndLoans.tsx`

- **3 onglets** : Achats à Crédit | Prêts Reçus | Prêts Accordés
- Chaque onglet affiche un tableau des opérations avec : contrepartie, montant total, montant payé, solde restant (barre de progression), statut, date d'échéance
- **Dialogue de création** : formulaire avec type, contrepartie, montant, taux d'intérêt, dates, branche
- **Dialogue de paiement** : enregistrer un paiement partiel sur une opération
- **Cartes résumé** en haut : Total dettes (achats crédit + prêts reçus), Total créances (prêts accordés), Paiements du mois

---

## 3. Traductions (3 langues)

Ajout d'un bloc `creditAndLoans` dans `LanguageContext.tsx` avec toutes les clés en FR, EN, HT :
- Titres, sous-titres, labels de formulaire, statuts, messages de confirmation, onglets

---

## 4. Navigation

- Ajouter un lien dans le menu Finances du `Layout.tsx` : icône `Handshake` → `/finance/credits`
- Ajouter la route dans `App.tsx`

---

## 5. Intégration Tableau de Bord Financier

- Ajouter une carte résumé dans `FinancialDashboard.tsx` montrant le total des dettes et créances en cours

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Créer tables + RLS + trigger |
| `src/pages/CreditAndLoans.tsx` | Nouvelle page complète |
| `src/contexts/LanguageContext.tsx` | Ajouter traductions creditAndLoans |
| `src/components/Layout.tsx` | Ajouter lien navigation |
| `src/App.tsx` | Ajouter route |
| `src/pages/FinancialDashboard.tsx` | Ajouter carte résumé dettes/créances |

