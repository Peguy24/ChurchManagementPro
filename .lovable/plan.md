

# Plan: Rapport Mensuel de Rapprochement Bancaire (PDF)

## Vue d'ensemble

Ajout d'une fonctionnalité permettant de générer un rapport PDF professionnel de rapprochement bancaire mensuel. Ce rapport fournira une vue consolidée des transactions bancaires pour un mois donné, avec le statut de réconciliation et les statistiques clés.

---

## Fonctionnalités du Rapport PDF

### Contenu du rapport
- **En-tête**: Nom de l'église/tenant, logo, période du rapport
- **Informations du compte**: Nom, numéro (masqué), banque, solde actuel
- **Résumé statistique**:
  - Total des revenus du mois
  - Total des dépenses du mois
  - Nombre de transactions rapprochées vs en attente
  - Taux de réconciliation (%)
- **Tableau détaillé des transactions**: Date, type, description, référence, montant, statut
- **Section de signature**: Zone pour validation et signature de l'auditeur
- **Pied de page**: Date de génération, numérotation des pages

### Sélection de période
- Sélecteur de mois et année
- Filtrage des transactions pour la période sélectionnée

---

## Implémentation Technique

### 1. Nouveau fichier: `src/lib/bankReconciliationPDF.ts`

Création d'une fonction de génération PDF avec:
- Récupération des informations du tenant via `useCurrentTenant`
- Formatage professionnel avec jsPDF et jspdf-autotable
- Support du logo de l'église (chargé depuis le bucket tenant-logos)
- Calculs des totaux et statistiques
- Mise en forme des montants en USD
- Tableau des transactions avec colonnes colorées selon le type
- Code couleur pour les statuts (vert = rapproché, orange = en attente)

### 2. Mise à jour: `src/pages/BankReconciliation.tsx`

Ajouts à l'interface utilisateur:
- Bouton "Exporter PDF" dans l'en-tête de la section transactions
- Dialog de sélection de période (mois/année)
- Indicateur de chargement pendant la génération
- Import de la nouvelle fonction de génération PDF

### 3. Structure du PDF

```text
┌─────────────────────────────────────────────────┐
│  [Logo]  NOM DE L'ÉGLISE                        │
│          Rapport de Rapprochement Bancaire      │
│          Mois: Janvier 2026                     │
├─────────────────────────────────────────────────┤
│  COMPTE BANCAIRE                                │
│  ─────────────────                              │
│  Nom: Compte Principal                          │
│  Banque: BNC | N°: ****1234                     │
│  Solde actuel: $45,000.00                       │
├─────────────────────────────────────────────────┤
│  RÉSUMÉ DU MOIS                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ Revenus  │ Dépenses │ Rapproch.│ En att.  │  │
│  │ $12,500  │ $8,200   │ 24 (80%) │ 6 (20%)  │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────┤
│  DÉTAIL DES TRANSACTIONS                        │
│  ┌─────────┬──────┬──────────┬────────┬──────┐  │
│  │ Date    │ Type │ Descript │ Montant│Statut│  │
│  ├─────────┼──────┼──────────┼────────┼──────┤  │
│  │ 02 Jan  │  ↑   │ Dîmes    │+$1,200 │  ✓   │  │
│  │ 05 Jan  │  ↓   │ Loyer    │-$800   │  ✓   │  │
│  │ ...     │      │          │        │      │  │
│  └─────────┴──────┴──────────┴────────┴──────┘  │
├─────────────────────────────────────────────────┤
│  CERTIFICATION                                  │
│  Je certifie que ce rapport reflète...          │
│                                                 │
│  Signature: _______________  Date: ___________  │
└─────────────────────────────────────────────────┘
│  Page 1/2 | Généré le 03/02/2026 à 14:30       │
└─────────────────────────────────────────────────┘
```

---

## Détails Techniques

### Fichier `src/lib/bankReconciliationPDF.ts`

```typescript
interface BankReconciliationReportData {
  account: {
    name: string;
    account_number: string | null;
    bank_name: string | null;
    current_balance: number;
  };
  churchInfo: {
    name: string;
    logoUrl?: string;
  };
  period: {
    month: number;
    year: number;
  };
  transactions: Array<{
    transaction_date: string;
    transaction_type: 'income' | 'expense';
    description: string | null;
    reference_number: string | null;
    amount: number;
    is_reconciled: boolean;
    reconciled_at: string | null;
  }>;
}
```

### Modifications de `BankReconciliation.tsx`

- Ajout d'états pour la sélection de période et le dialog d'export
- Requête de filtrage par mois/année
- Bouton FileText avec icône PDF
- Toast de confirmation après téléchargement

---

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/lib/bankReconciliationPDF.ts` | Créer |
| `src/pages/BankReconciliation.tsx` | Modifier |

---

## Avantages

- **Traçabilité**: Document officiel pour les audits financiers
- **Professionnalisme**: Rapport avec branding de l'église
- **Flexibilité**: Export pour n'importe quel mois passé
- **Conformité**: Section de certification et signature

