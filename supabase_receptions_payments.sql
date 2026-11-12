-- =====================================================================
-- HUILERIE JEMAI ERP — EXTENSION SUPABASE RÉCEPTIONS & RÈGLEMENTS DE CAISSE
-- Script SQL pour PostgreSQL & Supabase
-- =====================================================================

-- 1. Table des Réceptions d'Olives (Bons de Pesée & Tarification)
CREATE TABLE IF NOT EXISTS olive_receptions (
    id TEXT PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    party_id TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_code TEXT,
    phone TEXT,
    vehicle_plate TEXT,
    driver_name TEXT,
    gross_weight_kg NUMERIC(10, 2) NOT NULL CHECK (gross_weight_kg >= 0),
    tare_weight_kg NUMERIC(10, 2) NOT NULL CHECK (tare_weight_kg >= 0),
    net_weight_kg NUMERIC(10, 2) NOT NULL CHECK (net_weight_kg >= 0),
    milling_fee_per_kg NUMERIC(10, 3) NOT NULL DEFAULT 0.200 CHECK (milling_fee_per_kg >= 0),
    total_milling_fee_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (total_milling_fee_tnd >= 0),
    paid_amount_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (paid_amount_tnd >= 0),
    remaining_amount_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (remaining_amount_tnd >= 0),
    payment_status TEXT NOT NULL DEFAULT 'IMPAYE' CHECK (payment_status IN ('PAYE', 'PARTIEL', 'IMPAYE')),
    status TEXT NOT NULL DEFAULT 'RECU' CHECK (status IN ('RECU', 'EN_FILE', 'EN_COURS', 'TERMINE')),
    notes TEXT,
    operator TEXT NOT NULL DEFAULT 'Gérant Huilerie',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la table existait déjà, ajouter les nouvelles colonnes si absentes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olive_receptions' AND column_name = 'milling_fee_per_kg') THEN
        ALTER TABLE olive_receptions ADD COLUMN milling_fee_per_kg NUMERIC(10, 3) NOT NULL DEFAULT 0.200;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olive_receptions' AND column_name = 'total_milling_fee_tnd') THEN
        ALTER TABLE olive_receptions ADD COLUMN total_milling_fee_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olive_receptions' AND column_name = 'paid_amount_tnd') THEN
        ALTER TABLE olive_receptions ADD COLUMN paid_amount_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olive_receptions' AND column_name = 'remaining_amount_tnd') THEN
        ALTER TABLE olive_receptions ADD COLUMN remaining_amount_tnd NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olive_receptions' AND column_name = 'payment_status') THEN
        ALTER TABLE olive_receptions ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'IMPAYE';
    END IF;
END $$;

-- 2. Table des Règlements de Caisses pour Réceptions (Paiements Idempotents)
CREATE TABLE IF NOT EXISTS reception_payments (
    id TEXT PRIMARY KEY,
    reception_id TEXT NOT NULL REFERENCES olive_receptions(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    party_name TEXT NOT NULL,
    amount_tnd NUMERIC(12, 3) NOT NULL CHECK (amount_tnd > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('ESPECES', 'CHEQUE', 'VIREMENT', 'NATURE')),
    reference TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    operator TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexation pour performances élevées et filtres de dates instantanés
CREATE INDEX IF NOT EXISTS idx_receptions_date ON olive_receptions(date);
CREATE INDEX IF NOT EXISTS idx_receptions_status ON olive_receptions(status);
CREATE INDEX IF NOT EXISTS idx_receptions_payment_status ON olive_receptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_receptions_party_id ON olive_receptions(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_reception_id ON reception_payments(reception_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON reception_payments(payment_date);

-- 4. Sécurité RLS (Row Level Security)
ALTER TABLE olive_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_payments ENABLE ROW LEVEL SECURITY;

-- Politique d'accès libre pour l'application Huilerie
CREATE POLICY IF NOT EXISTS "Accès total aux réceptions" ON olive_receptions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Accès total aux règlements" ON reception_payments
    FOR ALL USING (true) WITH CHECK (true);

-- Commentaires d'architecture
COMMENT ON TABLE olive_receptions IS 'Enregistrement officiel des arrivages d olives, pesée bascule, prix trituration et état du règlement';
COMMENT ON TABLE reception_payments IS 'Journal d encaissements effectifs en caisse pour chaque bon de réception';
