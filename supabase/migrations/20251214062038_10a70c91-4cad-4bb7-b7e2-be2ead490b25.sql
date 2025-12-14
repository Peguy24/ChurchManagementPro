-- Add predefined expense categories
INSERT INTO expense_categories (name, description) VALUES
  ('Loyer', 'Loyer et frais de location'),
  ('Électricité', 'Factures d''électricité'),
  ('Sonorisation', 'Équipements et services de sonorisation'),
  ('Aide sociale', 'Aide aux membres et à la communauté'),
  ('Entretien', 'Maintenance et réparations'),
  ('Fournitures', 'Matériel de bureau et consommables'),
  ('Transport', 'Frais de déplacement'),
  ('Communication', 'Téléphone et internet'),
  ('Salaires', 'Rémunérations du personnel'),
  ('Autre', 'Autres dépenses diverses')
ON CONFLICT DO NOTHING;

-- Add cash_register_id and bank_account_id to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cash_register_id uuid REFERENCES cash_registers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_expenses_cash_register_id ON expenses(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bank_account_id ON expenses(bank_account_id);