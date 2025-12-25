-- Add barcode column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Create function to generate unique barcode
CREATE OR REPLACE FUNCTION public.generate_inventory_barcode()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  prefix text := 'INV';
BEGIN
  -- Generate barcode only if not provided
  IF NEW.barcode IS NULL THEN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(barcode FROM 4) AS INTEGER)), 0) + 1 
    INTO next_num 
    FROM public.inventory_items 
    WHERE barcode IS NOT NULL 
      AND barcode LIKE 'INV%'
      AND SUBSTRING(barcode FROM 4) ~ '^\d+$';
    
    -- Ensure we have a valid number
    IF next_num IS NULL OR next_num < 1 THEN
      next_num := 1;
    END IF;
    
    -- Format as INV followed by 8 digits (e.g., INV00000001)
    NEW.barcode := prefix || LPAD(next_num::text, 8, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate barcode on insert
DROP TRIGGER IF EXISTS generate_inventory_barcode_trigger ON public.inventory_items;
CREATE TRIGGER generate_inventory_barcode_trigger
BEFORE INSERT ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.generate_inventory_barcode();

-- Generate barcodes for existing items that don't have one
DO $$
DECLARE
  item_record RECORD;
  counter integer := 1;
BEGIN
  FOR item_record IN 
    SELECT id FROM public.inventory_items 
    WHERE barcode IS NULL 
    ORDER BY created_at
  LOOP
    UPDATE public.inventory_items 
    SET barcode = 'INV' || LPAD(counter::text, 8, '0')
    WHERE id = item_record.id;
    counter := counter + 1;
  END LOOP;
END $$;