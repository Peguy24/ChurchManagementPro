-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  serial_number TEXT,
  purchase_date DATE,
  purchase_price NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'missing', 'disposed')),
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  quantity INTEGER DEFAULT 1,
  min_quantity INTEGER DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory usage history table
CREATE TABLE public.inventory_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  used_by UUID REFERENCES public.members(id),
  event_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  quantity_used INTEGER DEFAULT 1,
  notes TEXT,
  returned BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory maintenance table
CREATE TABLE public.inventory_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL DEFAULT 'repair' CHECK (maintenance_type IN ('repair', 'inspection', 'cleaning', 'replacement', 'upgrade')),
  description TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performed_by TEXT,
  vendor TEXT,
  next_maintenance_date DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Staff can view inventory items"
  ON public.inventory_items FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role) OR
    has_role(auth.uid(), 'volunteer'::app_role)
  );

CREATE POLICY "Admins and secretaries can insert inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins and secretaries can update inventory items"
  ON public.inventory_items FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins can delete inventory items"
  ON public.inventory_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for inventory_usage
CREATE POLICY "Staff can view inventory usage"
  ON public.inventory_usage FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'volunteer'::app_role)
  );

CREATE POLICY "Staff can insert inventory usage"
  ON public.inventory_usage FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'volunteer'::app_role)
  );

CREATE POLICY "Staff can update inventory usage"
  ON public.inventory_usage FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins can delete inventory usage"
  ON public.inventory_usage FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for inventory_maintenance
CREATE POLICY "Staff can view inventory maintenance"
  ON public.inventory_maintenance FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'treasurer'::app_role)
  );

CREATE POLICY "Admins and secretaries can insert inventory maintenance"
  ON public.inventory_maintenance FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins and secretaries can update inventory maintenance"
  ON public.inventory_maintenance FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'secretary'::app_role)
  );

CREATE POLICY "Admins can delete inventory maintenance"
  ON public.inventory_maintenance FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-photos', 'inventory-photos', true);

-- Storage policies for inventory photos
CREATE POLICY "Anyone can view inventory photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-photos');

CREATE POLICY "Staff can upload inventory photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inventory-photos' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'secretary'::app_role)
    )
  );

CREATE POLICY "Staff can update inventory photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'inventory-photos' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'secretary'::app_role)
    )
  );

CREATE POLICY "Admins can delete inventory photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inventory-photos' AND
    has_role(auth.uid(), 'admin'::app_role)
  );