# PROJECT CONTEXT — HUILERIE JEMAI ERP (معصرة جماعي)

## 1. Company Profile & Domain Background
- **Company Name**: HUILERIE JEMAI
- **Arabic Name**: معصرة جماعي لإنتاج وتخزين زيت الزيتون
- **Sector**: Olive oil production, industrial oil milling (trituration), customer oil storage (cuverie), and by-product valorization (pomace / grignons / فيتورة).
- **Location**: Route Principale des Oliviers, Tunisie.
- **Key Leadership**: Mohamed Jemai (Gérant & Administrateur Principal).
- **Key Operators**: Achref (Opérateur Cuverie, Bascule & Broyeur).

## 2. Business Workflows & Core Objectives
1. **Olive Reception & Weighing (Réception Olives)**:
   - Arrival of olives from growers / producers.
   - Tare deduction and net weight calculation.
   - Variety recording (Chemlali, Chétoui, Sahli, Zarrazi, etc.).
   - Inspection of sanitary status / quality.
   - Dispatch to production queue.
2. **Industrial Pressing & Milling (Trituration & File d'Attente)**:
   - Batch assignment to automated pressing lines (Alfa Laval, Pieralisi).
   - Operator records extracted oil in Kilograms (KG) or Litres (L).
   - Automatic oil density application (default $0.918\text{ kg/L}$).
   - Instant calculation of oil yield ($\%$ and $\text{L} / 100\text{ kg}$ olives).
   - Milling fee calculation in Tunisian Dinars (TND) per kg or en nature (fayda / فائدة).
   - Permanent ordinary editing lock once confirmed.
3. **Customer Production History (Historique Production Client)**:
   - **Crucial Rule**: Customer oil remains in their personal production history and is **NOT** automatically deposited into storage tanks.
   - The customer can withdraw and take home their oil immediately or make an explicit transfer to a designated storage cuve.
4. **Tank Inventory & Storage Management (Gestion de Stock Cuves - PROTECTED MODULE)**:
   - Preserved original module with 18+ stainless steel and concrete tanks (PILE 1 to 7, BASSIN 1 to 3, MINIPILE 1 to 3).
   - Real-time fill levels, 85% capacity warnings, client distribution in each tank.
   - Traceable documents: `BON-REC-YYYY-XXXX` (Entrée), `BON-SOR-YYYY-XXXX` (Sortie), `BON-TRA-YYYY-XXXX` (Transfert).
5. **Grignons Sales (Vente Grignons / الفيتورة)**:
   - Immediate truck weighing at the weighbridge.
   - Direct sale in bulk without holding inventory tanks.
   - Independent sales vouchers: `BON-GRI-YYYY-XXXX`.

## 3. Technology Stack & Deployment
- **Frontend**: React 19 SPA, Tailwind CSS v4, Lucide React icons, Motion animations.
- **Backend / Dev Runtime**: Node.js, Express, TSX, Vite.
- **Cloud Database**: Supabase PostgreSQL (`https://vtyytslihvjmyelhahum.supabase.co`).
- **Reporting & Printing**: Print-ready CSS for A4 official vouchers, SheetJS (XLSX) for tabular exports.
- **Internationalization**: Bilingual French and Arabic with RTL layout support.
