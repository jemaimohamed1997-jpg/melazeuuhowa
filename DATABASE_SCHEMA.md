# DATABASE SCHEMA — HUILERIE JEMAI ERP

This document specifies the PostgreSQL tables hosted in the Huilerie Jemai Supabase instance (`https://vtyytslihvjmyelhahum.supabase.co`).

---

## 1. Table: `tanks` (Cuves & Bassins de Stockage)
Stores the physical oil storage containers at the mill.
```sql
CREATE TABLE public.tanks (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- e.g. 'PILE 1', 'PILE 5', 'BASSIN 1'
  name TEXT NOT NULL,                 -- e.g. 'Pile Inox 01 (Nord)'
  capacity NUMERIC NOT NULL,          -- Nominal capacity in Litres (e.g. 10000, 5000, 20000)
  is_active BOOLEAN DEFAULT TRUE,     -- Active in production
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Table: `parties` (Clients & Producteurs)
Stores olive growers and oil owners.
```sql
CREATE TABLE public.parties (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- e.g. 'CLI-001', 'CLI-002'
  name TEXT NOT NULL,                 -- e.g. 'MOKHTAR JEMAI'
  phone TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Table: `profiles` (Utilisateurs & Opérateurs)
```sql
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,      -- e.g. 'wizz', 'achref', 'operateur'
  display_name TEXT NOT NULL,         -- e.g. 'Mohamed Jemai (Gérant)'
  role TEXT NOT NULL,                 -- 'admin' | 'operateur'
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Table: `operations` (Bons de Mouvements de Stock)
Parent vouchers for inventory transactions.
```sql
CREATE TABLE public.operations (
  id TEXT PRIMARY KEY,
  doc_number TEXT NOT NULL UNIQUE,    -- e.g. 'BON-REC-2026-0007', 'BON-SOR-2026-0011'
  type TEXT NOT NULL,                 -- 'ENTREE' | 'SORTIE' | 'TRANSFERT'
  party_id TEXT REFERENCES public.parties(id),
  operator TEXT NOT NULL,
  total_quantity NUMERIC NOT NULL,    -- Total Litres moved
  notes TEXT,
  status TEXT DEFAULT 'VALIDE',       -- 'VALIDE' | 'ANNULE'
  operation_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Table: `tank_movements` (Lignes de Mouvements par Cuve)
Individual allocations linking operations to specific tanks.
```sql
CREATE TABLE public.tank_movements (
  id TEXT PRIMARY KEY,
  operation_id TEXT REFERENCES public.operations(id) ON DELETE CASCADE,
  tank_id TEXT REFERENCES public.tanks(id),
  party_id TEXT REFERENCES public.parties(id),
  direction TEXT NOT NULL,            -- 'IN' | 'OUT'
  quantity NUMERIC NOT NULL,          -- Litres allocated to this tank
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Table: `app_settings` (Configuration de la Huilerie)
```sql
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY,                -- 'default'
  company_name TEXT NOT NULL,         -- 'HUILERIE JEMAI'
  arabic_subtitle TEXT NOT NULL,      -- 'معصرة جماعي لإنتاج وتخزين زيت الزيتون'
  phone TEXT,
  address TEXT,
  unit TEXT DEFAULT 'L',
  threshold NUMERIC DEFAULT 85,       -- Alert percentage threshold
  settings_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Extended ERP Tables (Client-Side & Sync Engine)

### `olive_receptions` (Réceptions Olives)
- `ticket_number`: `BON-OLV-YYYY-XXXX`
- `party_id`, `party_name`, `party_code`
- `olive_variety`: Chemlali, Chétoui, Sahli, Zarrazi, etc.
- `gross_weight_kg`, `tare_weight_kg`, `net_weight_kg`
- `boxes_count`, `quality`, `status`: `RECU` | `EN_FILE` | `TERMINE`

### `production_batches` (Trituration & Rendement)
- `ticket_number`: `BON-PRD-YYYY-XXXX`
- `reception_id`, `party_id`, `olives_net_kg`
- `oil_quantity_kg`, `oil_quantity_litres`, `oil_density`
- `yield_percentage`: $(\text{oil\_kg} / \text{olives\_net\_kg}) \times 100$
- `yield_litres_per_100kg`: $(\text{oil\_litres} / \text{olives\_net\_kg}) \times 100$
- `milling_fee_total_tnd`, `milling_fee_mode`, `is_confirmed`: true (Permanent lock)
- `oil_destination`: `SORTIE_CLIENT` | `STOCKAGE_CUVE`

### `grignon_sales` (Vente des Grignons)
- `doc_number`: `BON-GRI-YYYY-XXXX`
- `buyer_name`, `truck_plate`, `driver_name`
- `gross_weight_kg`, `tare_weight_kg`, `net_weight_tonnes`
- `unit_price_per_tonne_tnd`, `total_price_tnd`, `payment_status`
