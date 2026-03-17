UPDATE legal_documents
SET
  content_en = REPLACE(
    content_en,
    'During the trial period, you will have access to Professional plan features at no cost.',
    'During the trial period, you will have access to Essential plan features at no cost, with a limit of 50 members. The trial does not grant access to Professional, Premium, or Enterprise plan features.'
  ),
  content_fr = REPLACE(
    content_fr,
    'Pendant l''essai, vous aurez accès aux fonctionnalités du plan Professionnel sans frais.',
    'Pendant l''essai, vous aurez accès aux fonctionnalités du plan Essentiel sans frais, avec une limite de 50 membres. L''essai ne donne pas accès aux fonctionnalités des plans Professionnel, Premium ou Entreprise.'
  ),
  content_ht = REPLACE(
    content_ht,
    'Pandan esè a, ou ap gen aksè nan fonksyonalite plan Pwofesyonèl san frè.',
    'Pandan esè a, ou ap gen aksè nan fonksyonalite plan Esansyèl san frè, ak yon limit 50 manm. Esè a pa bay aksè nan fonksyonalite plan Pwofesyonèl, Premyòm, oswa Antrepriz.'
  ),
  version = 4,
  updated_at = now()
WHERE document_type = 'payment_terms';