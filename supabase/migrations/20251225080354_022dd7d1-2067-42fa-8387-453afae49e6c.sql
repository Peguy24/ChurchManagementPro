-- Create member_documents table for storing documents linked to members
CREATE TABLE public.member_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT,
  notes TEXT,
  document_date DATE DEFAULT CURRENT_DATE,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view member documents"
ON public.member_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'pastor'::app_role) 
  OR has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Staff can insert member documents"
ON public.member_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'pastor'::app_role) 
  OR has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Staff can update member documents"
ON public.member_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'pastor'::app_role) 
  OR has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Admins can delete member documents"
ON public.member_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for member documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-documents', 
  'member-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for member documents
CREATE POLICY "Staff can upload member documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);

CREATE POLICY "Staff can view member documents files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);

CREATE POLICY "Staff can delete member documents files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_member_documents_updated_at
BEFORE UPDATE ON public.member_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();