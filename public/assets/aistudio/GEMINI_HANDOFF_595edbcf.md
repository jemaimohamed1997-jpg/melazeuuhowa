# GEMINI HANDOFF — HUILERIE JEMAI ERP

## To the Next Gemini Developer Taking Over

Welcome to the **Huilerie Jemai ERP** codebase.
This project is an integrated Enterprise Resource Planning system specifically engineered for Huilerie Jemai (معصرة جماعي), a premier olive oil production mill in Tunisia.

### 1. Golden Rules (STRICTLY PRESERVED)
1. **Never alter the original stock math**:
   - The original tank inventory calculation in `src/lib/stockCalculation.ts` and `src/services/db.ts` has been verified against the live mill data in Supabase.
   - It calculates current stock strictly as $\sum \text{IN} - \sum \text{OUT}$ from validated operations.
2. **Never automatically inject production oil into storage tanks**:
   - When a farmer brings olives and the mill presses them, that oil belongs to the farmer and is held in their production record (`production_batches`).
   - It does **not** enter `tanks` or `tank_movements` unless the farmer explicitly requests storage, which creates a formal `BON-REC` entry.
3. **Permanent ordinary editing lock on confirmed production runs**:
   - Once a batch is confirmed (`is_confirmed = true`), ordinary operators cannot modify it.
4. **Grignons sales have no stock**:
   - Grignons (faytous / olive pomace) are loaded in bulk into trucks and sold per tonne on the weighbridge. There is no separate inventory tank.
5. **Preserve bilingual French and Arabic**:
   - All forms, vouchers, and tables support both languages cleanly with dynamic RTL layout.

### 2. Full Architecture & Modules
- **Piles & Cuves (Stock Protégé)**: Visual gauges, multi-client allocations, strict overflow prevention.
- **Réception Olives (BON-OLV)**: Bascule weighing, variety, crate count, dispatch to queue.
- **Trituration & Rendement (BON-PRD)**: Dual KG/L input, density 0.918, instant yield %, milling fee in TND, confirmation lock.
- **Historique Production Clients**: Farmer production ledger, explicit deposit into cuves.
- **Ventes Grignons (BON-GRI)**: Direct truck sales vouchers without stock ledger.
- **Fournisseurs & Achats (BON-ACH)**: Mill-owned olive and bulk oil purchases.
- **Finances & Caisse ERP**: Milling fees, grignons sales, charges (electricity, labor, parts), net cash position.
- **Journal des Opérations & Bons de Stock**: Full audit trail and printable vouchers.
- **Producteurs & Déposants**: Directory and tank breakdown.
- **Banc d'Essai Automatisé**: 16 certified tests executable in 1 click.
- **Paramètres & Sauvegardes**: Supabase sync, snapshots, downloadable project ZIP.

### 3. Live Supabase Credentials
- URL: `https://vtyytslihvjmyelhahum.supabase.co`
- Anon Key: `sb_publishable_LXJ1R8X0W01sc44edNemwA_pjCRXt6j`

### 4. Build & Verification Commands
```bash
npm run dev     # Starts server.ts with Vite middleware on port 3000
npm run build   # Produces production bundle in /dist
npx tsc --noEmit # Validates TypeScript types (0 errors)
```

### 5. Deliverable Archive
The downloadable ZIP archive is generated at `/public/huilerie-jemai-erp-latest.zip` and `/huilerie-jemai-erp-latest.zip`.
