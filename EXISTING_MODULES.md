# EXISTING MODULES — HUILERIE JEMAI ERP

## Module 1: Gestion de Stock d'Huile d'Olive (PROTECTED)
- **Path**: `src/components/CuvesModule/`, `src/lib/stockCalculation.ts`, `src/types/stock.ts`
- **Tables**: `tanks`, `parties`, `operations`, `tank_movements`, `app_settings`
- **Features**:
  - Real-time fill levels with visual liquid gauges.
  - Multi-tank split allocation on Entrée.
  - Client balance verification on Sortie (cannot withdraw more oil than owned in that tank).
  - Source and destination tank validation on Transfert.
  - Seuil d'alerte (alert threshold) triggered when tank fill $\ge 85\%$.
  - Detailed breakdown of all producers owning oil in each tank.
  - Printable official vouchers: `BON-REC-YYYY-XXXX`, `BON-SOR-YYYY-XXXX`, `BON-TRA-YYYY-XXXX`.

## Module 2: Réception Olives & Pesée
- **Path**: `src/components/OlivesModule/`
- **Types**: `OliveReception`, `OliveQuality`, `ReceptionStatus`
- **Features**:
  - Gross, Tare, and Net weight calculation in Kilograms.
  - Variety tracking: Chemlali (شملالي), Chétoui (شتوي), Sahli (ساحلي), Zarrazi (زرازي), Oueslati, Mélange.
  - Sanitary quality classification (Supérieure, Standard, Feuilles/Tiges, Piquée).
  - Generation of reception ticket `BON-OLV-YYYY-XXXX`.
  - Dispatching to queue.

## Module 3: File de Trituration & Presse
- **Path**: `src/components/ProductionModule/`
- **Types**: `ProductionBatch`, `MillingPaymentMode`, `OilDestination`
- **Features**:
  - Queue management for olive batches awaiting pressing.
  - Machine operator interface for entering produced oil in **KG** or **L**.
  - Real-time density conversion ($0.918\text{ kg/L}$).
  - Automatic yield calculations:
    $$\text{Rendement } \% = \frac{\text{Huile KG}}{\text{Olives Net KG}} \times 100$$
    $$\text{Rendement (L / 100 KG)} = \frac{\text{Huile L}}{\text{Olives Net KG}} \times 100$$
  - Automatic estimation of olive pomace (grignons / faytous) $\approx 45\%$.
  - Milling fees calculation in TND.
  - Permanent ordinary editing lock upon confirmation (`BON-PRD-YYYY-XXXX`).

## Module 4: Historique Production Clients
- **Path**: `src/components/CustomerHistoryModule/`
- **Features**:
  - Comprehensive customer production ledger.
  - Total olives brought, total oil extracted, average yield across harvests.
  - Milling fee settlement balance (Payé vs Reste à régler).
  - Explicit customer action: "Transférer en Cuve de Stockage", which safely triggers an authorized Stock In operation into a designated tank.
  - Print customer production statement.

## Module 5: Ventes de Grignons (Faytous / الفيتورة)
- **Path**: `src/components/GrignonsModule/`
- **Types**: `GrignonSale`
- **Features**:
  - Independent sales documents: `BON-GRI-YYYY-XXXX`.
  - Zero inventory overhead: bulk direct truck loading.
  - Weighbridge gross, tare, net tonnage, price per tonne, total TND.
  - Payment tracking (Espèces, Chèque, Virement, À terme).

## Module 6: Paramètres, Traçabilité & Passation
- **Path**: `src/components/SettingsModule/`, `src/lib/i18n.ts`
- **Features**:
  - Bilingual French / Arabic interface with dynamic RTL/LTR direction.
  - Company settings (Huilerie Jemai, Arabic subtitle, phone, address).
  - Role management (Admin Mohamed Jemai, Operator Achref).
  - Audit log journal for high-value operations.
  - Milestone ZIP download button.
