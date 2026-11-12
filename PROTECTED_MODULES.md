# PROTECTED MODULES — HUILERIE JEMAI ERP

## DIRECTIVE: DO NOT REBUILD OR MODIFY THE ORIGINAL INVENTORY MODULE

In accordance with **STEP 3** of the Project Handoff:
> "The original Gestion de Stock application must remain intact.
> Do not rebuild or replace it.
> Do not modify its stock calculations, reception, exit, transfer or database behavior without a verified necessity.
> Production oil must remain in customer production history and must not automatically enter the original inventory tanks."

---

## 1. Protected Files List
The following files constitute the protected stock engine core:
1. `src/types/stock.ts`:
   - `Tank`, `Party`, `Operation`, `TankMovement`, `TankStockDetail`, `ClientStockSummary`
2. `src/lib/stockCalculation.ts`:
   - `calculateTankStocks()`: Computes real-time tank quantities by summing valid movements ($m.direction === 'IN' - m.direction === 'OUT'$).
   - `calculateClientStocks()`: Computes client-held oil across tanks.
   - Enforces the $85\%$ capacity threshold alert.
3. `src/components/CuvesModule/`:
   - `CuvesGrid.tsx`: Visual gauges, capacity levels, and alerts.
   - `OperationModal.tsx`: Bon d'Entrée (`BON-REC`), Bon de Sortie (`BON-SOR`), Bon de Transfert (`BON-TRA`).
   - `TankDetailModal.tsx`: Tank breakdown by customer.
4. `src/components/OperationsModule/OperationsList.tsx`:
   - Stock voucher ledger with immutable history and cancellation logic.

---

## 2. Inviolable Invariants
1. **Capacity Enforcement**:
   - No operation may cause a tank's liquid volume to exceed `tank.capacity`.
2. **Client Balance Protection**:
   - A customer cannot withdraw more oil than their verified balance in the selected tank.
3. **No Automatic Production Oil Infiltration**:
   - When olives are milled in the production module, the extracted oil is credited to the customer's production history (`ProductionBatch`).
   - It is **never** added to the `tank_movements` or `tanks` tables automatically.
   - It only enters a tank if the customer explicitly requests storage, triggering a distinct, audited `BON-REC` voucher.
4. **Permanent Ordinary Lock**:
   - Once a milling production run is confirmed, its figures cannot be edited by an operator.
5. **No Separate Grignons Stock**:
   - Olive pomace (grignons) is sold directly on a per-truck weighbridge basis and does not maintain a finite tank or stock balance.
