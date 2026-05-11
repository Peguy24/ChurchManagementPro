## Ajouter WhatsApp dans le footer de la page commerciale

### Objectif
Ajouter un bouton WhatsApp dédié (vert) dans le footer de `/commercial`, à côté des liens email et téléphone existants, utilisant le numéro `+1 (908) 494-4977`.

### Modifications

**`src/pages/Commercial.tsx`** (footer, lignes ~585-592)
- Ajouter un bouton/lien WhatsApp vert avec icône `MessageCircle` (lucide-react) à côté du téléphone.
- Lien : `https://wa.me/19084944977` (ouvre WhatsApp Web/App), `target="_blank"`, `rel="noopener noreferrer"`.
- Style : fond vert WhatsApp (`#25D366`) ou via classe Tailwind, texte blanc, padding compact, arrondi, icône + libellé "WhatsApp".
- Conserver email et téléphone tels quels.

### Détails techniques
- Pas de nouveau composant nécessaire, modification inline dans le footer.
- Utiliser `MessageCircle` ou icône custom SVG WhatsApp inline (plus authentique). Recommandation : SVG WhatsApp inline pour reconnaissance immédiate.
- Pas de changement i18n (le mot "WhatsApp" est universel).
- Aucun changement backend.

### Hors scope
- Pas de bouton flottant.
- Pas de modification du formulaire de contact ni de la section "Contactez notre équipe".
