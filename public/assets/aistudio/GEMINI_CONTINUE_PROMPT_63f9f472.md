# GEMINI CONTINUE PROMPT — HUILERIE JEMAI ERP

Use this prompt if you need another Gemini session or developer to continue working on this project:

```markdown
You are taking over the ongoing development of the Huilerie Jemai ERP system (معصرة جماعي لإنتاج وتخزين زيت الزيتون).

The project is fully structured with:
- Protected Gestion de Stock (tanks, parties, operations, movements) in `src/components/CuvesModule/` and `src/lib/stockCalculation.ts`.
- Olive Reception & Weighing in `src/components/OlivesModule/` (BON-OLV).
- Pressing Queue & Oil Yield Engine (KG or L, density 0.918, yield %, permanent lock) in `src/components/ProductionModule/` (BON-PRD).
- Customer Production Ledger (oil isolated from storage tanks unless explicitly deposited) in `src/components/CustomerHistoryModule/`.
- Independent Grignons Sales in `src/components/GrignonsModule/` (BON-GRI, zero stock overhead).
- Suppliers & Purchases Module in `src/components/PurchasesModule/` (BON-ACH).
- Cash Flow & Finances Module in `src/components/FinancesModule/`.
- Automated Test Suite with 16 certified test scenarios in `src/components/AutomatedTestSuite.tsx`.
- Bilingual French / Arabic dictionary in `src/lib/i18n.ts`.
- Supabase live connection in `src/lib/supabase.ts` and `src/services/supabase.ts`.

Review the following documentation files before making any modifications:
1. PROJECT_CONTEXT.md
2. PROJECT_AUDIT.md
3. EXISTING_MODULES.md
4. ARCHITECTURE.md
5. DATABASE_SCHEMA.md
6. PROTECTED_MODULES.md
7. DEVELOPMENT_LOG.md
8. NEXT_STEPS.md
9. GEMINI_HANDOFF.md
10. DEPLOYMENT_GUIDE.md

Preserve all inviolable business rules, maintain the protected inventory module without modifying its proven stock math, execute verified tests, and generate an updated complete ZIP archive upon completing milestones.
```
