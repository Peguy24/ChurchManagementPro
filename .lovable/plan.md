

## Plan: Add "IT Equipment" Category to Inventory

### What to do
Add a new inventory category `it_equipment` (IT Equipment / Équipement informatique / Ekipman Enfòmatik) across all files that define inventory categories. This covers laptops, printers, scanners, servers, etc.

### Files to modify (7 files)

1. **`src/contexts/LanguageContext.tsx`** — Add `catITEquipment` translation key in all 3 languages:
   - FR: "Équipement informatique"
   - EN: "IT Equipment"
   - HT: "Ekipman Enfòmatik"

2. **`src/pages/Inventory.tsx`** — Add `it_equipment: "inventory.catITEquipment"` to `categoryKeys`

3. **`src/lib/inventoryReportPDF.ts`** — Add `it_equipment: "Équipement informatique"` to categories map

4. **`src/components/InventoryBarcodeScanner.tsx`** — Add to `categoryLabels`

5. **`src/components/InventoryAuditMode.tsx`** — Add to `categoryLabels`

6. **`src/components/reports/InventoryReportTab.tsx`** — Add to categories array

7. **`src/pages/Inventory.tsx`** — Add to any category `<Select>` dropdown options

All changes are additive (one line per file). No database changes needed since `category` is a free-text column.

