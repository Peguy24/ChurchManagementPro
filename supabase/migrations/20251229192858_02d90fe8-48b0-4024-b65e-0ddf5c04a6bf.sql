-- 1. Ajouter tenant_id aux profiles pour lier utilisateurs aux églises
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 2. Créer une table pour les rôles par tenant (un utilisateur peut avoir différents rôles selon le tenant)
CREATE TABLE IF NOT EXISTS public.tenant_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id, role)
);

-- 3. Activer RLS sur tenant_user_roles
ALTER TABLE public.tenant_user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Fonction pour vérifier le rôle d'un utilisateur dans un tenant spécifique
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
      AND is_approved = true
  );
$$;

-- 5. Fonction pour obtenir le tenant_id de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- 6. Fonction pour vérifier si l'utilisateur est admin de son tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_user_roles tur
    INNER JOIN public.profiles p ON p.tenant_id = tur.tenant_id
    WHERE tur.user_id = _user_id
      AND p.id = _user_id
      AND tur.role = 'admin'
      AND tur.is_approved = true
  );
$$;

-- 7. Fonction pour vérifier si un tenant a déjà un admin
CREATE OR REPLACE FUNCTION public.tenant_has_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_user_roles
    WHERE tenant_id = _tenant_id
      AND role = 'admin'
      AND is_approved = true
  );
$$;

-- 8. Politiques RLS pour tenant_user_roles
CREATE POLICY "Users can view their own tenant roles"
ON public.tenant_user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all tenant roles"
ON public.tenant_user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admins can manage their tenant roles"
ON public.tenant_user_roles
FOR ALL
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin') 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert their own role for first registration"
ON public.tenant_user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND NOT tenant_has_admin(tenant_id)
);

-- 9. Mettre à jour les politiques RLS des tables existantes pour filtrer par tenant
-- D'abord on ajoute tenant_id aux tables principales si pas déjà présent
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.ministries ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.cash_registers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 10. Index pour améliorer les performances des requêtes par tenant
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_tenant_id ON public.members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_tenant_user ON public.tenant_user_roles(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);