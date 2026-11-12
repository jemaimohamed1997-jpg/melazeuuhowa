/**
 * Types for Huilerie Jemai ERP extensions:
 * 1. Olive Reception
 * 2. Production Queue & Milling (Trituration)
 * 3. Customer Production History
 * 4. Grignons (Olive Pomace) Sales
 */

export type OliveQuality = 'Superieure' | 'Standard' | 'Feuilles_Tiges' | 'Piquee';
export type ReceptionStatus = 'RECU' | 'EN_FILE' | 'EN_COURS' | 'TERMINE';
export type ProductionStatus = 'EN_ATTENTE' | 'EN_COURS' | 'CONFIRME';
export type OilDestination = 'SORTIE_CLIENT' | 'STOCKAGE_CUVE' | 'NON_DEFINI';
export type MillingPaymentMode = 'ESPECES' | 'NATURE' | 'CHEQUE' | 'A_TERME';
export type GrignonPaymentMode = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'A_TERME';

export type PaymentStatus = 'PAYE' | 'PARTIEL' | 'IMPAYE';

export interface ReceptionPayment {
  id: string;
  reception_id: string;
  ticket_number: string;
  party_name: string;
  amount_tnd: number;
  payment_mode: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'NATURE';
  reference?: string;
  payment_date: string;
  operator: string;
  notes?: string;
  created_at: string;
}

export interface OliveReception {
  id: string;
  ticket_number: string; // e.g. BON-OLV-2026-0001
  date: string; // Date de réception obligatoire (YYYY-MM-DD ou ISO)
  party_id: string;
  party_name: string;
  party_code?: string;
  phone?: string;
  vehicle_plate?: string;
  driver_name?: string;
  gross_weight_kg: number; // poids brut
  tare_weight_kg: number; // tare des caisses/camion
  net_weight_kg: number; // gross - tare
  milling_fee_per_kg: number; // e.g. 0.200 TND/kg
  total_milling_fee_tnd: number; // net_weight_kg * milling_fee_per_kg
  paid_amount_tnd: number; // montant déjà payé
  remaining_amount_tnd: number; // montant restant à payer
  payment_status: PaymentStatus; // 'PAYE' | 'PARTIEL' | 'IMPAYE'
  payments?: ReceptionPayment[];
  status: ReceptionStatus;
  notes?: string | null;
  operator: string;
  created_at: string;
  updated_at?: string;
  // Champs optionnels conservés pour rétro-compatibilité
  olive_variety?: string;
  boxes_count?: number;
  quality?: OliveQuality;
}

export interface ProductionBatch {
  id: string;
  ticket_number: string; // e.g. BON-PRD-2026-0001
  reception_id: string;
  reception_ticket: string;
  party_id: string;
  party_name: string;
  party_code?: string;
  olives_net_kg: number;
  press_line: string; // e.g. "Ligne Inox 1 (Alfa Laval)", "Ligne Inox 2 (Pieralisi)"
  oil_input_unit: 'KG' | 'L';
  oil_quantity_entered: number;
  oil_density: number; // default: 0.918 kg/L
  oil_quantity_kg: number;
  oil_quantity_litres: number;
  yield_percentage: number; // (oil_quantity_kg / olives_net_kg) * 100
  yield_litres_per_100kg: number; // (oil_quantity_litres / olives_net_kg) * 100
  grignons_estimated_kg: number; // ~45% of olive weight
  milling_fee_rate: number; // e.g. 0.080 TND/kg
  milling_fee_mode: MillingPaymentMode;
  milling_fee_total_tnd: number;
  milling_fee_paid: boolean;
  operator: string;
  status: ProductionStatus;
  started_at: string;
  completed_at?: string;
  // Permanent lock after confirmation:
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;
  // Customer oil disposition (does NOT go into stock tanks automatically):
  oil_destination: OilDestination;
  destination_tank_id?: string; // only if customer explicitly deposited into tank
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GrignonSale {
  id: string;
  doc_number: string; // e.g. BON-GRI-2026-0001
  date: string;
  buyer_name: string;
  truck_plate: string;
  driver_name?: string | null;
  gross_weight_kg: number;
  tare_weight_kg: number;
  net_weight_kg: number;
  net_weight_tonnes: number;
  unit_price_per_tonne_tnd: number;
  total_price_tnd: number;
  payment_mode: GrignonPaymentMode;
  payment_status: 'PAYE' | 'IMPAYE';
  operator: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CustomerProductionSummary {
  party_id: string;
  party_name: string;
  party_code: string;
  phone?: string;
  total_receptions_count: number;
  total_olives_kg: number;
  total_oil_kg: number;
  total_oil_litres: number;
  average_yield_percent: number;
  average_yield_l_per_100kg: number;
  total_milling_fees_tnd: number;
  milling_fees_paid_tnd: number;
  milling_fees_due_tnd: number;
  oil_taken_home_litres: number;
  oil_transferred_to_tanks_litres: number;
  batches: ProductionBatch[];
}

export interface PurchaseBatch {
  id: string;
  doc_number: string; // e.g. BON-ACH-2026-0001
  date: string;
  supplier_name: string;
  supplier_phone?: string | null;
  item_type: 'OLIVES' | 'HUILE_VRAC';
  variety?: string;
  quantity: number; // KG for olives, L for oil
  unit_price_tnd: number; // Price per KG or per L
  total_price_tnd: number;
  payment_mode: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'A_TERME';
  payment_status: 'PAYE' | 'IMPAYE';
  operator: string;
  destination_tank_id?: string; // If oil is stored in mill tank
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseItem {
  id: string;
  date: string;
  category: 'ENERGIE_ELECTRICITE' | 'MAIN_DOEUVRE' | 'MAINTENANCE_PIECES' | 'EAU_ASSAINISSEMENT' | 'TRANSPORT' | 'DIVERS';
  label: string;
  amount_tnd: number;
  beneficiary?: string;
  payment_mode: 'ESPECES' | 'CHEQUE' | 'VIREMENT';
  operator: string;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  record_id?: string;
  details: string;
}

