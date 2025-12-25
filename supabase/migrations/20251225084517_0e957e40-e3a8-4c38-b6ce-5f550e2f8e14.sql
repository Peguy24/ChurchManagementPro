-- Create table to store role permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_group text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission_group)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage role permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view permissions (needed for permission checks)
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default permissions for admin (full access)
INSERT INTO public.role_permissions (role, permission_group) VALUES
('admin', 'dashboard'),
('admin', 'members'),
('admin', 'attendance'),
('admin', 'ministries'),
('admin', 'branches'),
('admin', 'finances'),
('admin', 'events'),
('admin', 'reports'),
('admin', 'communication'),
('admin', 'settings'),
('admin', 'users');

-- Insert default permissions for pastor
INSERT INTO public.role_permissions (role, permission_group) VALUES
('pastor', 'dashboard'),
('pastor', 'members'),
('pastor', 'attendance'),
('pastor', 'ministries'),
('pastor', 'branches'),
('pastor', 'events'),
('pastor', 'reports'),
('pastor', 'communication'),
('pastor', 'settings');

-- Insert default permissions for treasurer
INSERT INTO public.role_permissions (role, permission_group) VALUES
('treasurer', 'dashboard'),
('treasurer', 'finances'),
('treasurer', 'reports');

-- Insert default permissions for secretary
INSERT INTO public.role_permissions (role, permission_group) VALUES
('secretary', 'dashboard'),
('secretary', 'members'),
('secretary', 'attendance'),
('secretary', 'events'),
('secretary', 'communication');

-- Insert default permissions for volunteer
INSERT INTO public.role_permissions (role, permission_group) VALUES
('volunteer', 'dashboard'),
('volunteer', 'attendance');