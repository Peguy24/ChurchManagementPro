
-- Legal documents table (editable by Super Admin)
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL UNIQUE, -- 'terms_of_use', 'privacy_policy', 'payment_terms'
  title_fr TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_ht TEXT NOT NULL DEFAULT '',
  content_fr TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  content_ht TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read active documents (public pages)
CREATE POLICY "Anyone can read active legal documents"
  ON public.legal_documents FOR SELECT
  USING (is_active = true);

-- Only super admins can update
CREATE POLICY "Super admins can manage legal documents"
  ON public.legal_documents FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Tenant policy acceptances table
CREATE TABLE public.tenant_policy_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_version INTEGER NOT NULL DEFAULT 1,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_by_name TEXT,
  accepted_by_email TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  UNIQUE(tenant_id, document_type, document_version)
);

ALTER TABLE public.tenant_policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Super admins can read all acceptances
CREATE POLICY "Super admins can read all acceptances"
  ON public.tenant_policy_acceptances FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Allow insert during signup (anon or authenticated)
CREATE POLICY "Anyone can insert acceptances"
  ON public.tenant_policy_acceptances FOR INSERT
  WITH CHECK (true);

-- Seed default documents
INSERT INTO public.legal_documents (document_type, title_fr, title_en, title_ht, content_fr, content_en, content_ht) VALUES
('terms_of_use', 'Conditions d''Utilisation', 'Terms of Use', 'Kondisyon Itilizasyon',
 'Veuillez rédiger vos conditions d''utilisation ici.', 'Please write your terms of use here.', 'Tanpri ekri kondisyon itilizasyon ou la.'),
('privacy_policy', 'Politique de Confidentialité', 'Privacy Policy', 'Politik Konfidansyalite',
 'Veuillez rédiger votre politique de confidentialité ici.', 'Please write your privacy policy here.', 'Tanpri ekri politik konfidansyalite ou la.'),
('payment_terms', 'Conditions de Paiement', 'Payment Terms', 'Kondisyon Peman',
 'Veuillez rédiger vos conditions de paiement ici.', 'Please write your payment terms here.', 'Tanpri ekri kondisyon peman ou la.');
