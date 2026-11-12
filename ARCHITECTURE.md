# ARCHITECTURE — HUILERIE JEMAI ERP

## 1. System Overview
Huilerie Jemai ERP is architected as an offline-first, cloud-synchronized web application for olive oil mills in Tunisia. It runs cleanly on local mill workstations, mobile devices, and deployed cloud environments (Vercel / Cloud Run).

```
                      +-----------------------------+
                      |     Huilerie Jemai ERP      |
                      |   React 19 + TypeScript     |
                      +--------------+--------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
+------------v------------+                     +------------v------------+
|  Stock Module (PROTECTED)|                     |  Olive & Production     |
|  - Tanks & Capacities   |                     |  - Olive Weighbridge    |
|  - In/Out/Transfer      |                     |  - Milling Queue & Yield|
|  - Multi-Party Allocs   |                     |  - Customer History     |
|  - 85% Alerts           |                     |  - Grignons Bulk Sales  |
+------------+------------+                     +------------+------------+
             |                                               |
             +-----------------------+-----------------------+
                                     |
                      +--------------v--------------+
                      |      Data Layer & Cache     |
                      |  - LocalStorage Engine      |
                      |  - Math Calculation Core    |
                      |  - XLSX & Print Generators  |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |    Supabase PostgreSQL DB   |
                      |  - tanks, parties, profiles |
                      |  - operations, movements    |
                      |  - app_settings             |
                      +-----------------------------+
```

## 2. Directory Layout
```
/
├── .env.example              # Supabase URL & publishable keys
├── index.html                # Typography, Amiri Arabic font, print CSS
├── metadata.json             # Applet naming & capabilities
├── package.json              # React 19, Supabase, Tailwind, SheetJS
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite & Tailwind 4 plugins
├── server.ts                 # Full-stack Node/Express dev & prod server
├── src/
│   ├── main.tsx              # React mounting root
│   ├── App.tsx               # Central application coordinator & state
│   ├── index.css             # Tailwind v4 @import & print styles
│   ├── types/
│   │   ├── stock.ts          # Protected stock module interfaces
│   │   └── production.ts     # Olive, milling, and grignon interfaces
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client & live fetch/save engine
│   │   ├── stockCalculation.ts # Protected stock math & capacity engine
│   │   ├── export.ts         # XLSX workbook generators
│   │   └── i18n.ts           # Bilingual FR / AR dictionary
│   └── components/
│       ├── Navbar.tsx        # Top branding, role switcher, language toggle
│       ├── Sidebar.tsx       # Navigation tabs and status badges
│       ├── CuvesModule/
│       │   ├── CuvesGrid.tsx       # Visual gauge & fill percentage cards
│       │   ├── OperationModal.tsx  # In/Out/Transfer voucher forms
│       │   └── TankDetailModal.tsx # Drill-down tank ledger & client shares
│       ├── OlivesModule/
│       │   ├── OliveReceptionModal.tsx # Weighing & variety registration
│       │   └── OliveReceptionsList.tsx  # Table & queue dispatcher
│       ├── ProductionModule/
│       │   ├── ProductionQueue.tsx      # Milling queue & batch records
│       │   └── ProductionEntryModal.tsx # Machine operator yield inputs
│       ├── CustomerHistoryModule/
│       │   └── CustomerProductionLedger.tsx # Client ledger & tank transfer
│       ├── GrignonsModule/
│       │   ├── GrignonSaleModal.tsx    # Weighbridge pomace sale voucher
│       │   └── GrignonsSalesList.tsx   # Bulk sales ledger & turnover
│       ├── OperationsModule/
│       │   └── OperationsList.tsx      # Protected stock operations ledger
│       ├── ClientsModule/
│       │   └── ClientsList.tsx         # Producer directory & stock balances
│       ├── SettingsModule/
│       │   └── SettingsView.tsx        # Company info, audit log & ZIP download
│       └── Documents/
│           └── PrintDocument.tsx       # Official A4 vouchers & receipts
```

## 3. Data Integrity & Separation Principle
1. **The Protected Inventory Boundary**:
   - Only validated movements (`operations` + `tank_movements`) modify tank liquid levels.
   - Operations marked `ANNULE` are excluded from all active stock calculations.
2. **The Production Oil Boundary**:
   - Freshly milled customer oil is held strictly in the customer's production history (`production_batches`).
   - It **never** automatically enters storage tanks.
   - If the customer requests long-term storage, a separate, authorized `BON-REC` is issued and allocated to a specific tank with available capacity.
3. **The Grignons Independence**:
   - Grignons sales (`BON-GRI`) are direct truck-based sales documents that do not impact liquid oil tank capacities.
