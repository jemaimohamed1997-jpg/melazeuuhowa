/**
 * Huilerie Jemai (معصرة جماعي) - ERP & Gestion de Stock
 * Complete Oléicole ERP Application
 */
import React, { useState, useEffect } from 'react';
import {
  fetchLiveTanks,
  fetchLiveParties,
  fetchLiveOperations,
  fetchLiveTankMovements,
  fetchLiveAppSettings,
  saveLiveOperation,
  DEFAULT_APP_SETTINGS,
  DEFAULT_PROFILES
} from './lib/supabase';
import { calculateTankStocks, calculateClientStocks } from './lib/stockCalculation';
import {
  exportTanksToExcel,
  exportClientsToExcel,
  exportOliveReceptionsToExcel,
  exportProductionToExcel,
  exportGrignonsToExcel,
  exportPurchasesToExcel,
  exportFinancesToExcel
} from './lib/export';
import { Tank, Party, Operation, TankMovement, UserProfile, AppSettings, TankStockDetail } from './types/stock';
import { OliveReception, ProductionBatch, GrignonSale, PurchaseBatch, ExpenseItem, AuditLog, ReceptionPayment } from './types/production';
import { Language, translations } from './lib/i18n';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveModule } from './components/Sidebar';
import { GestionDeStockOriginal } from './components/GestionDeStockModule/GestionDeStockOriginal';
import { OperationModal } from './components/CuvesModule/OperationModal';
import { TankDetailModal } from './components/CuvesModule/TankDetailModal';
import { OliveReceptionsList } from './components/OlivesModule/OliveReceptionsList';
import { OliveReceptionModal } from './components/OlivesModule/OliveReceptionModal';
import { ProductionQueue } from './components/ProductionModule/ProductionQueue';
import { ProductionEntryModal } from './components/ProductionModule/ProductionEntryModal';
import { CustomerProductionLedger } from './components/CustomerHistoryModule/CustomerProductionLedger';
import { GrignonsSalesList } from './components/GrignonsModule/GrignonsSalesList';
import { GrignonSaleModal } from './components/GrignonsModule/GrignonSaleModal';
import { PurchasesList } from './components/PurchasesModule/PurchasesList';
import { PurchaseModal } from './components/PurchasesModule/PurchaseModal';
import { FinancesManager } from './components/FinancesModule/FinancesManager';
import { AutomatedTestSuite } from './components/AutomatedTestSuite';
import { OperationsList } from './components/OperationsModule/OperationsList';
import { ClientsList } from './components/ClientsModule/ClientsList';
import { SettingsView } from './components/SettingsModule/SettingsView';
import { PrintDocument, PrintableDocType, PrintFormat } from './components/Documents/PrintDocument';
import { Menu, X, ChevronRight } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  
  // Default module is Réception Olives (Order item 1)
  const [activeModule, setActiveModule] = useState<ActiveModule>('RECEPTIONS');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [movements, setMovements] = useState<TankMovement[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [profiles, setProfiles] = useState<UserProfile[]>(DEFAULT_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(DEFAULT_PROFILES[0]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // ERP Extended Modules State
  const [receptions, setReceptions] = useState<OliveReception[]>(() => {
    const saved = localStorage.getItem('huilerie_receptions');
    if (saved) return JSON.parse(saved);
    // Seed initial demo olive receptions conforming to new specifications
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: 'olv-101',
        ticket_number: 'BON-OLV-2026-0001',
        date: today,
        party_id: 'cli-1794168997971',
        party_name: 'Mohamed jemai',
        party_code: 'CLI-002',
        phone: '+216 98 123 456',
        vehicle_plate: '112 TU 4520',
        gross_weight_kg: 1850,
        tare_weight_kg: 350,
        net_weight_kg: 1500,
        milling_fee_per_kg: 0.200,
        total_milling_fee_tnd: 300.000,
        paid_amount_tnd: 300.000,
        remaining_amount_tnd: 0,
        payment_status: 'PAYE',
        payments: [
          {
            id: 'pay-seed-1',
            reception_id: 'olv-101',
            ticket_number: 'BON-OLV-2026-0001',
            party_name: 'Mohamed jemai',
            amount_tnd: 300.000,
            payment_mode: 'ESPECES',
            payment_date: today,
            operator: 'Mohamed Jemai (Gérant)',
            created_at: new Date().toISOString()
          }
        ],
        status: 'EN_FILE',
        operator: 'achref',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'olv-102',
        ticket_number: 'BON-OLV-2026-0002',
        date: today,
        party_id: 'cli-1794030003453',
        party_name: 'MOKHTAR JEMAI',
        party_code: 'CLI-007',
        phone: '+216 22 987 654',
        vehicle_plate: '185 TU 8810',
        gross_weight_kg: 2600,
        tare_weight_kg: 400,
        net_weight_kg: 2200,
        milling_fee_per_kg: 0.200,
        total_milling_fee_tnd: 440.000,
        paid_amount_tnd: 200.000,
        remaining_amount_tnd: 240.000,
        payment_status: 'PARTIEL',
        payments: [
          {
            id: 'pay-seed-2',
            reception_id: 'olv-102',
            ticket_number: 'BON-OLV-2026-0002',
            party_name: 'MOKHTAR JEMAI',
            amount_tnd: 200.000,
            payment_mode: 'ESPECES',
            payment_date: today,
            operator: 'Mohamed Jemai (Gérant)',
            created_at: new Date().toISOString()
          }
        ],
        status: 'EN_FILE',
        operator: 'achref',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];
  });

  const [receptionPayments, setReceptionPayments] = useState<ReceptionPayment[]>(() => {
    const saved = localStorage.getItem('huilerie_reception_payments');
    if (saved) return JSON.parse(saved);
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: 'pay-seed-1',
        reception_id: 'olv-101',
        ticket_number: 'BON-OLV-2026-0001',
        party_name: 'Mohamed jemai',
        amount_tnd: 300.000,
        payment_mode: 'ESPECES',
        payment_date: today,
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date().toISOString()
      },
      {
        id: 'pay-seed-2',
        reception_id: 'olv-102',
        ticket_number: 'BON-OLV-2026-0002',
        party_name: 'MOKHTAR JEMAI',
        amount_tnd: 200.000,
        payment_mode: 'ESPECES',
        payment_date: today,
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date().toISOString()
      }
    ];
  });

  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(() => {
    const saved = localStorage.getItem('huilerie_production_batches');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'prd-201',
        ticket_number: 'BON-PRD-2026-0001',
        reception_id: 'olv-legacy',
        reception_ticket: 'BON-OLV-2026-0000',
        party_id: 'cli-1794168997971',
        party_name: 'Mohamed jemai',
        party_code: 'CLI-002',
        olives_net_kg: 2000,
        press_line: 'Ligne Inox 1 (Alfa Laval)',
        oil_input_unit: 'L',
        oil_quantity_entered: 420,
        oil_density: 0.918,
        oil_quantity_kg: 385.5,
        oil_quantity_litres: 420,
        yield_percentage: 19.28,
        yield_litres_per_100kg: 21.0,
        grignons_estimated_kg: 900,
        milling_fee_rate: 0.080,
        milling_fee_mode: 'ESPECES',
        milling_fee_total_tnd: 160.000,
        milling_fee_paid: true,
        operator: 'Mohamed Jemai (Gérant)',
        status: 'CONFIRME',
        started_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 86400000).toISOString(),
        is_confirmed: true,
        oil_destination: 'SORTIE_CLIENT',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  });

  const [grignonSales, setGrignonSales] = useState<GrignonSale[]>(() => {
    const saved = localStorage.getItem('huilerie_grignon_sales');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'gri-301',
        doc_number: 'BON-GRI-2026-0001',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        buyer_name: 'Usine d’Extraction du Sahel',
        truck_plate: '112 TU 9980',
        driver_name: 'Naceur Bouazizi',
        gross_weight_kg: 26000,
        tare_weight_kg: 10500,
        net_weight_kg: 15500,
        net_weight_tonnes: 15.5,
        unit_price_per_tonne_tnd: 185.000,
        total_price_tnd: 2867.500,
        payment_mode: 'ESPECES',
        payment_status: 'PAYE',
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  });

  const [purchases, setPurchases] = useState<PurchaseBatch[]>(() => {
    const saved = localStorage.getItem('huilerie_purchases');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'ach-401',
        doc_number: 'BON-ACH-2026-0001',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        supplier_name: 'Hedi Jemai',
        supplier_phone: '+216 98 123 456',
        item_type: 'OLIVES',
        variety: 'Chemlali',
        quantity: 3200,
        unit_price_tnd: 2.150,
        total_price_tnd: 6880.000,
        payment_mode: 'ESPECES',
        payment_status: 'PAYE',
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('huilerie_expenses');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'exp-501',
        date: new Date(Date.now() - 86400000 * 4).toISOString(),
        category: 'ENERGIE_ELECTRICITE',
        label: 'Facture STEG Moyenne Tension Décembre',
        amount_tnd: 1250.000,
        beneficiary: 'STEG Kairouan',
        payment_mode: 'CHEQUE',
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'exp-502',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        category: 'MAINTENANCE_PIECES',
        label: 'Vidange et filtres décanteur centrifuge',
        amount_tnd: 380.000,
        beneficiary: 'Alfa Laval SAV',
        payment_mode: 'ESPECES',
        operator: 'Mohamed Jemai (Gérant)',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('huilerie_audit_logs');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Modal Controls
  const [activeModal, setActiveModal] = useState<
    | null
    | { type: 'STOCK_OPERATION'; opType: 'ENTREE' | 'SORTIE' | 'TRANSFERT'; preselectedTankId?: string }
    | { type: 'TANK_DETAIL'; tankDetail: TankStockDetail }
    | { type: 'OLIVE_RECEPTION' }
    | { type: 'PRODUCTION_ENTRY'; reception: OliveReception }
    | { type: 'GRIGNON_SALE' }
    | { type: 'PURCHASE' }
    | { type: 'PRINT'; docType: PrintableDocType; data: any; format?: PrintFormat }
  >(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('huilerie_receptions', JSON.stringify(receptions));
  }, [receptions]);

  useEffect(() => {
    localStorage.setItem('huilerie_reception_payments', JSON.stringify(receptionPayments));
  }, [receptionPayments]);

  useEffect(() => {
    localStorage.setItem('huilerie_production_batches', JSON.stringify(productionBatches));
  }, [productionBatches]);

  useEffect(() => {
    localStorage.setItem('huilerie_grignon_sales', JSON.stringify(grignonSales));
  }, [grignonSales]);

  useEffect(() => {
    localStorage.setItem('huilerie_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('huilerie_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('huilerie_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Initial Data Load
  const loadInitialData = async () => {
    try {
      const [tanksData, partiesData, opsData, mvtsData, settingsData] = await Promise.all([
        fetchLiveTanks(),
        fetchLiveParties(),
        fetchLiveOperations(),
        fetchLiveTankMovements(),
        fetchLiveAppSettings()
      ]);

      if (tanksData.length > 0) setTanks(tanksData);
      if (partiesData.length > 0) setParties(partiesData);
      if (opsData.length > 0) setOperations(opsData);
      if (mvtsData.length > 0) setMovements(mvtsData);
      setAppSettings(settingsData);
      setIsOnline(true);
    } catch (err) {
      console.warn('Initial data load completed in offline mode', err);
      setIsOnline(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update HTML document direction and lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Stock calculations
  const {
    tankDetails,
    totalCapacity,
    totalStoredOil,
    totalAvailableCapacity,
    globalFillPercentage
  } = calculateTankStocks(tanks, parties, operations, movements, appSettings.threshold);

  const clientStockSummaries = calculateClientStocks(parties, tanks, operations, movements);

  // Audit Log Helper
  const logAudit = (action: string, moduleName: string, details: string, recordId?: string) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentProfile.display_name,
      action,
      module: moduleName,
      record_id: recordId,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Operation Handlers
  const handleSaveStockOperation = async (op: Operation, newMvts: TankMovement[]) => {
    setOperations(prev => [op, ...prev]);
    setMovements(prev => [...prev, ...newMvts]);
    setActiveModal(null);

    logAudit(
      `Création ${op.type}`,
      'Cuves & Stock',
      `Bon ${op.doc_number}: ${op.total_quantity} L pour client ${op.party_id}`,
      op.id
    );

    // Persist to Supabase
    await saveLiveOperation(op, newMvts);

    // Open print voucher preview
    const docType: PrintableDocType = op.type === 'ENTREE' ? 'STOCK_IN' : op.type === 'SORTIE' ? 'STOCK_OUT' : 'STOCK_TRANSFER';
    setActiveModal({
      type: 'PRINT',
      docType,
      format: 'A4',
      data: {
        ...op,
        party_name: parties.find(p => p.id === op.party_id)?.name,
        movements: newMvts.map(m => ({
          ...m,
          tank_code: tanks.find(t => t.id === m.tank_id)?.code
        }))
      }
    });
  };

  const handleCancelOperation = (operationId: string) => {
    setOperations(prev => prev.map(o => o.id === operationId ? { ...o, status: 'ANNULE' } : o));
    logAudit('Annulation Bon Stock', 'Cuves & Stock', `Opération ${operationId} annulée`, operationId);
  };

  const handleSaveOliveReception = (reception: OliveReception, sendToQueue: boolean) => {
    // If client is new, register in parties
    if (!parties.some(p => p.id === reception.party_id)) {
      const newParty: Party = {
        id: reception.party_id,
        code: `CLI-${String(parties.length + 1).padStart(3, '0')}`,
        name: reception.party_name,
        is_deleted: false,
        created_at: new Date().toISOString()
      };
      setParties(prev => [...prev, newParty]);
    }

    setReceptions(prev => [reception, ...prev]);
    setActiveModal(null);

    logAudit(
      'Réception Olives',
      'Olives',
      `Ticket ${reception.ticket_number}: ${reception.net_weight_kg} KG (${reception.total_milling_fee_tnd} TND) de ${reception.party_name}`,
      reception.id
    );

    // Open print preview by default in A4
    setActiveModal({
      type: 'PRINT',
      docType: 'OLIVE_RECEPTION',
      format: 'A4',
      data: reception
    });
  };

  const handleConfirmReceptionPayment = (payment: ReceptionPayment) => {
    // 1. Add to reception payments
    setReceptionPayments(prev => [payment, ...prev]);

    // 2. Update reception voucher amounts and status
    setReceptions(prev =>
      prev.map(r => {
        if (r.id !== payment.reception_id) return r;
        const currentPaid = (r.paid_amount_tnd || 0) + payment.amount_tnd;
        const total = r.total_milling_fee_tnd || 0;
        const remaining = Math.max(0, Math.round((total - currentPaid) * 1000) / 1000);
        const status = remaining <= 0.0001 ? 'PAYE' : 'PARTIEL';
        const paymentsList = [...(r.payments || []), payment];

        return {
          ...r,
          paid_amount_tnd: currentPaid,
          remaining_amount_tnd: remaining,
          payment_status: status,
          payments: paymentsList
        };
      })
    );

    logAudit(
      'Encaissement Réception',
      'Caisse & Finance',
      `Règlement de ${payment.amount_tnd.toFixed(3)} TND pour ${payment.ticket_number} (${payment.payment_mode})`,
      payment.id
    );
  };

  const handleSendToQueue = (receptionId: string) => {
    setReceptions(prev => prev.map(r => r.id === receptionId ? { ...r, status: 'EN_FILE' } : r));
    logAudit('Envoi File Trituration', 'Olives', `Lot ${receptionId} placé en file d'attente`, receptionId);
  };

  const handleSaveProductionBatch = async (batch: ProductionBatch, optionalDepositTankId?: string) => {
    setReceptions(prev => prev.map(r => r.id === batch.reception_id ? { ...r, status: 'TERMINE' } : r));
    setProductionBatches(prev => [batch, ...prev]);

    logAudit(
      'Trituration & Rendement Confirmé',
      'Trituration',
      `Bon ${batch.ticket_number}: ${batch.oil_quantity_litres} L extraits (${batch.yield_percentage}% de rendement) pour ${batch.party_name}.`,
      batch.id
    );

    // Critical invariant: only explicit deposit tank ID creates stock in
    if (optionalDepositTankId && batch.oil_destination === 'STOCKAGE_CUVE') {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const opId = `mouv-dep-${Date.now()}`;
      const stockOp: Operation = {
        id: opId,
        doc_number: `BON-REC-${year}-${rand}`,
        type: 'ENTREE',
        party_id: batch.party_id,
        operator: currentProfile.display_name,
        total_quantity: batch.oil_quantity_litres,
        notes: `Dépôt direct de l'huile produite suite trituration ${batch.ticket_number}`,
        status: 'VALIDE',
        operation_date: new Date().toISOString()
      };
      const stockMvt: TankMovement = {
        id: `tm-${opId}-${optionalDepositTankId}`,
        operation_id: opId,
        tank_id: optionalDepositTankId,
        party_id: batch.party_id,
        direction: 'IN',
        quantity: batch.oil_quantity_litres,
        notes: `Dépôt issu de ${batch.ticket_number}`,
        created_at: new Date().toISOString()
      };

      setOperations(prev => [stockOp, ...prev]);
      setMovements(prev => [...prev, stockMvt]);
      await saveLiveOperation(stockOp, [stockMvt]);
    }

    setActiveModal({
      type: 'PRINT',
      docType: 'PRODUCTION_TICKET',
      format: 'A4',
      data: batch
    });
  };

  const handleDepositCustomerOilInTank = async (batch: ProductionBatch, targetTankId: string) => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const opId = `mouv-dep-${Date.now()}`;
    const stockOp: Operation = {
      id: opId,
      doc_number: `BON-REC-${year}-${rand}`,
      type: 'ENTREE',
      party_id: batch.party_id,
      operator: currentProfile.display_name,
      total_quantity: batch.oil_quantity_litres,
      notes: `Transfert en cuve depuis lot de trituration ${batch.ticket_number}`,
      status: 'VALIDE',
      operation_date: new Date().toISOString()
    };
    const stockMvt: TankMovement = {
      id: `tm-${opId}-${targetTankId}`,
      operation_id: opId,
      tank_id: targetTankId,
      party_id: batch.party_id,
      direction: 'IN',
      quantity: batch.oil_quantity_litres,
      notes: `Dépôt cuve issu de ${batch.ticket_number}`,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [stockOp, ...prev]);
    setMovements(prev => [...prev, stockMvt]);
    setProductionBatches(prev => prev.map(b => b.id === batch.id ? { ...b, oil_destination: 'STOCKAGE_CUVE', destination_tank_id: targetTankId } : b));

    await saveLiveOperation(stockOp, [stockMvt]);

    logAudit(
      'Mise en Cuve d’Huile Client',
      'Historique Client',
      `Huile du lot ${batch.ticket_number} (${batch.oil_quantity_litres} L) déposée dans la cuve ${targetTankId}`,
      stockOp.id
    );

    alert(`Succès : L'huile (${batch.oil_quantity_litres} L) a été déposée dans la cuve et enregistrée sous le bon ${stockOp.doc_number}.`);
  };

  const handleSaveGrignonSale = (sale: GrignonSale) => {
    setGrignonSales(prev => [sale, ...prev]);
    setActiveModal(null);

    logAudit(
      'Vente Grignons',
      'Vente Grignons',
      `Bon ${sale.doc_number}: ${sale.net_weight_tonnes} T vendues à ${sale.buyer_name} pour ${sale.total_price_tnd} TND`,
      sale.id
    );

    setActiveModal({
      type: 'PRINT',
      docType: 'GRIGNON_SALE',
      format: 'A4',
      data: sale
    });
  };

  const handleSavePurchase = async (purchase: PurchaseBatch) => {
    setPurchases(prev => [purchase, ...prev]);
    setActiveModal(null);

    logAudit(
      'Achat Direct Huilerie',
      'Achats & Fournisseurs',
      `Bon ${purchase.doc_number}: ${purchase.quantity} ${purchase.item_type === 'OLIVES' ? 'KG' : 'L'} acheté(s) de ${purchase.supplier_name} pour ${purchase.total_price_tnd} TND`,
      purchase.id
    );

    if (purchase.item_type === 'HUILE_VRAC' && purchase.destination_tank_id) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const opId = `mouv-ach-${Date.now()}`;
      const stockOp: Operation = {
        id: opId,
        doc_number: `BON-REC-${year}-${rand}`,
        type: 'ENTREE',
        party_id: 'cli-huilerie-propre',
        operator: currentProfile.display_name,
        total_quantity: purchase.quantity,
        notes: `Achat huile pour compte propre de l'huilerie (${purchase.doc_number})`,
        status: 'VALIDE',
        operation_date: new Date().toISOString()
      };
      const stockMvt: TankMovement = {
        id: `tm-${opId}-${purchase.destination_tank_id}`,
        operation_id: opId,
        tank_id: purchase.destination_tank_id,
        party_id: 'cli-huilerie-propre',
        direction: 'IN',
        quantity: purchase.quantity,
        notes: `Stock propre issu de ${purchase.doc_number}`,
        created_at: new Date().toISOString()
      };

      setOperations(prev => [stockOp, ...prev]);
      setMovements(prev => [...prev, stockMvt]);
      await saveLiveOperation(stockOp, [stockMvt]);
    }

    setActiveModal({
      type: 'PRINT',
      docType: 'PURCHASE_RECEIPT',
      format: 'A4',
      data: purchase
    });
  };

  const handleAddExpense = (expense: ExpenseItem) => {
    setExpenses(prev => [expense, ...prev]);
    logAudit(
      'Dépense Exploitation',
      'Caisse & Finances',
      `Charge: ${expense.label} (${expense.amount_tnd} TND) - Catégorie ${expense.category}`,
      expense.id
    );
  };

  const handleAddNewClient = (client: { name: string; phone?: string; notes?: string }) => {
    const newParty: Party = {
      id: `cli-${Date.now()}`,
      code: `CLI-${String(parties.length + 1).padStart(3, '0')}`,
      name: client.name,
      phone: client.phone || null,
      notes: client.notes || null,
      is_deleted: false,
      created_at: new Date().toISOString()
    };
    setParties(prev => [...prev, newParty]);
    logAudit('Création Client', 'Répertoire Clients', `Nouveau producteur: ${newParty.name} (${newParty.code})`, newParty.id);
  };

  const handleDownloadZip = () => {
    window.location.href = '/huilerie-jemai-erp-latest.zip';
  };

  const queueCount = receptions.filter(r => r.status === 'EN_FILE').length;
  const alertTanksCount = tankDetails.filter(t => t.is_alert).length;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 font-sans selection:bg-amber-200">
      {/* Top Navbar */}
      <Navbar
        settings={appSettings}
        profiles={profiles}
        currentProfile={currentProfile}
        lang={lang}
        isOnline={isOnline}
        onToggleLanguage={() => setLang(l => (l === 'fr' ? 'ar' : 'fr'))}
        onSwitchProfile={(p) => setCurrentProfile(p)}
      />

      {/* Mobile Menu Bar (Phone & Tablet) */}
      <div className="md:hidden bg-stone-900 text-white px-4 py-2 flex items-center justify-between border-b border-stone-800">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 text-xs font-bold text-amber-400 py-1"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>Menu des Modules ERP</span>
        </button>
        <span className="text-[11px] text-stone-400 font-mono">
          {activeModule === 'RECEPTIONS' && '1. Réception Olives'}
          {activeModule === 'PRODUCTION' && '2. Trituration'}
          {activeModule === 'GRIGNONS' && '3. Vente Grignons'}
          {activeModule === 'PURCHASES' && '4. Achats et Fournisseurs'}
          {activeModule === 'CUVES' && '5. Gestion de Stock'}
          {activeModule === 'FINANCES' && '6. Caisse & Finance'}
          {activeModule === 'CUSTOMER_HISTORY' && '7. Historique Clients'}
          {activeModule === 'OPERATIONS' && '8. Mouvements et Bons'}
          {activeModule === 'CLIENTS' && '9. Répertoire Clients'}
        </span>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-row relative">
        {/* Sidebar Desktop */}
        <Sidebar
          activeModule={activeModule}
          lang={lang}
          queueCount={queueCount}
          alertTanksCount={alertTanksCount}
          onSelectModule={(m) => {
            setActiveModule(m);
            setIsMobileMenuOpen(false);
          }}
        />

        {/* Mobile Slide-in Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 flex">
            <div className="w-72 bg-stone-900 h-full p-4 overflow-y-auto border-r border-stone-800 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
                <span className="font-bold text-xs uppercase text-amber-400">Navigation ERP</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Exact 9-item menu order */}
              <div className="space-y-1">
                {[
                  { id: 'RECEPTIONS' as ActiveModule, num: '1', label: 'Réception Olives' },
                  { id: 'PRODUCTION' as ActiveModule, num: '2', label: 'Trituration', badge: queueCount > 0 ? `${queueCount}` : undefined },
                  { id: 'GRIGNONS' as ActiveModule, num: '3', label: 'Vente Grignons' },
                  { id: 'PURCHASES' as ActiveModule, num: '4', label: 'Achats et Fournisseurs' },
                  { id: 'CUVES' as ActiveModule, num: '5', label: 'Gestion de Stock' },
                  { id: 'FINANCES' as ActiveModule, num: '6', label: 'Caisse & Finance' },
                  { id: 'CUSTOMER_HISTORY' as ActiveModule, num: '7', label: 'Historique Clients' },
                  { id: 'OPERATIONS' as ActiveModule, num: '8', label: 'Mouvements et Bons' },
                  { id: 'CLIENTS' as ActiveModule, num: '9', label: 'Répertoire Clients' },
                  { id: 'TESTS' as ActiveModule, num: '10', label: 'Banc d’Essai (16 Tests)' },
                  { id: 'SETTINGS' as ActiveModule, num: '11', label: 'Paramètres' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      activeModule === item.id
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span>{item.num}. {item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Workspace View */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Header Summary for Current Active Module (Only for non-CUVES modules, as CUVES has its own rich header) */}
          {activeModule !== 'CUVES' && (
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {activeModule === 'RECEPTIONS' && '1. ' + translations[lang].receptionTitle}
                {activeModule === 'PRODUCTION' && '2. ' + translations[lang].productionTitle}
                {activeModule === 'GRIGNONS' && '3. ' + translations[lang].grignonsTitle}
                {activeModule === 'PURCHASES' && '4. ' + (lang === 'ar' ? 'سجل مشتريات المعصرة (زيتون وزيت)' : 'Achats et Fournisseurs (BON-ACH)')}
                {activeModule === 'FINANCES' && '6. ' + (lang === 'ar' ? 'الصندوق والمالية العامة للمعصرة' : 'Caisse & Gestion Financière ERP')}
                {activeModule === 'CUSTOMER_HISTORY' && '7. ' + translations[lang].customerHistoryTitle}
                {activeModule === 'OPERATIONS' && '8. Journal des Mouvements & Bons de Stock'}
                {activeModule === 'CLIENTS' && '9. Répertoire des Producteurs & Soldes de Stock'}
                {activeModule === 'TESTS' && (lang === 'ar' ? 'بنك الاختبارات الآلي (16 سيناريو)' : 'Banc d’Essai Automatisé (16 Scénarios Validés)')}
                {activeModule === 'SETTINGS' && 'Paramètres Généraux, Traçabilité & Sauvegarde'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                {activeModule === 'RECEPTIONS' && 'Enregistrement des arrivages, pesée brute/tare/net, tarif trituration et règlements de caisse'}
                {activeModule === 'PRODUCTION' && translations[lang].productionSubtitle}
                {activeModule === 'GRIGNONS' && translations[lang].grignonsSubtitle}
                {activeModule === 'PURCHASES' && (lang === 'ar' ? 'إدارة المشتريات المباشرة للفلاحة والمزودين لحساب المعصرة' : 'Suivi des achats d’olives et d’huile pour compte propre de l’huilerie')}
                {activeModule === 'FINANCES' && 'Rapprochement facturé vs réellement encaissé, gestion des charges et solde de trésorerie réel'}
                {activeModule === 'CUSTOMER_HISTORY' && translations[lang].customerHistorySubtitle}
                {activeModule === 'OPERATIONS' && 'Historique complet des réceptions d’huile, sorties et transferts entre cuves'}
                {activeModule === 'CLIENTS' && 'Gestion des fiches producteurs et répartition de leur huile par cuve'}
                {activeModule === 'TESTS' && 'Validation continue en 1 clic : 10 règles de cuverie + 6 workflows de mouture, bascule et grignons'}
                {activeModule === 'SETTINGS' && 'Configuration de l’établissement, synchronisation Supabase et téléchargement ZIP'}
              </p>
            </div>
          )}

          {/* Module Views */}
          
          {/* 1. RECEPTIONS OLIVES */}
          {activeModule === 'RECEPTIONS' && (
            <OliveReceptionsList
              receptions={receptions}
              currentOperator={currentProfile.display_name}
              lang={lang}
              onNewReception={() => setActiveModal({ type: 'OLIVE_RECEPTION' })}
              onSendToQueue={handleSendToQueue}
              onPrintA4={(rec) => setActiveModal({ type: 'PRINT', docType: 'OLIVE_RECEPTION', data: rec, format: 'A4' })}
              onPrintRP80={(rec) => setActiveModal({ type: 'PRINT', docType: 'OLIVE_RECEPTION', data: rec, format: 'RP80' })}
              onConfirmPayment={handleConfirmReceptionPayment}
              onExportExcel={() => exportOliveReceptionsToExcel(receptions, appSettings.company_name)}
            />
          )}

          {/* 2. TRITURATION */}
          {activeModule === 'PRODUCTION' && (
            <ProductionQueue
              queueReceptions={receptions.filter(r => r.status === 'EN_FILE')}
              productionBatches={productionBatches}
              currentRole={currentProfile.role}
              lang={lang}
              onStartMilling={(rec) => setActiveModal({ type: 'PRODUCTION_ENTRY', reception: rec })}
              onPrintBatch={(b) => setActiveModal({ type: 'PRINT', docType: 'PRODUCTION_TICKET', data: b, format: 'A4' })}
              onExportExcel={() => exportProductionToExcel(productionBatches, appSettings.company_name)}
            />
          )}

          {/* 3. VENTE GRIGNONS */}
          {activeModule === 'GRIGNONS' && (
            <GrignonsSalesList
              sales={grignonSales}
              lang={lang}
              onNewSale={() => setActiveModal({ type: 'GRIGNON_SALE' })}
              onPrintSale={(s) => setActiveModal({ type: 'PRINT', docType: 'GRIGNON_SALE', data: s, format: 'A4' })}
              onExportExcel={() => exportGrignonsToExcel(grignonSales, appSettings.company_name)}
            />
          )}

          {/* 4. ACHATS ET FOURNISSEURS */}
          {activeModule === 'PURCHASES' && (
            <PurchasesList
              purchases={purchases}
              lang={lang}
              onNewPurchase={() => setActiveModal({ type: 'PURCHASE' })}
              onPrintPurchase={(p) => setActiveModal({ type: 'PRINT', docType: 'PURCHASE_RECEIPT', data: p, format: 'A4' })}
              onExportExcel={() => exportPurchasesToExcel(purchases, appSettings.company_name)}
            />
          )}

          {/* 5. GESTION DE STOCK — MODULE ORIGINAL ZEBI INTÉGRÉ SANS AUCUNE MODIFICATION */}
          {activeModule === 'CUVES' && (
            <div className="w-full">
              <GestionDeStockOriginal />
            </div>
          )}

          {/* 6. CAISSE & FINANCE */}
          {activeModule === 'FINANCES' && (
            <FinancesManager
              receptions={receptions}
              receptionPayments={receptionPayments}
              productionBatches={productionBatches}
              grignonSales={grignonSales}
              purchases={purchases}
              expenses={expenses}
              lang={lang}
              onAddExpense={handleAddExpense}
              onExportExcel={() => {
                const millingCash = productionBatches
                  .filter(b => b.milling_fee_paid && b.milling_fee_mode === 'ESPECES')
                  .reduce((acc, b) => acc + b.milling_fee_total_tnd, 0);
                const grignonsRev = grignonSales
                  .filter(s => s.payment_status === 'PAYE')
                  .reduce((acc, s) => acc + s.total_price_tnd, 0);
                const purchasesTotal = purchases
                  .filter(p => p.payment_status === 'PAYE')
                  .reduce((acc, p) => acc + p.total_price_tnd, 0);
                exportFinancesToExcel(millingCash, grignonsRev, purchasesTotal, expenses, appSettings.company_name);
              }}
            />
          )}

          {/* 7. HISTORIQUE CLIENTS */}
          {activeModule === 'CUSTOMER_HISTORY' && (
            <CustomerProductionLedger
              parties={parties}
              batches={productionBatches}
              tanks={tankDetails}
              lang={lang}
              onPrintStatement={(summary) => setActiveModal({ type: 'PRINT', docType: 'CLIENT_STATEMENT', data: summary, format: 'A4' })}
              onDepositInTank={handleDepositCustomerOilInTank}
            />
          )}

          {/* 8. MOUVEMENTS ET BONS */}
          {activeModule === 'OPERATIONS' && (
            <OperationsList
              operations={operations}
              movements={movements}
              parties={parties}
              tanks={tanks}
              currentRole={currentProfile.role}
              lang={lang}
              onPrintOperation={(op, opMvts) => {
                const docType: PrintableDocType = op.type === 'ENTREE' ? 'STOCK_IN' : op.type === 'SORTIE' ? 'STOCK_OUT' : 'STOCK_TRANSFER';
                setActiveModal({
                  type: 'PRINT',
                  docType,
                  format: 'A4',
                  data: {
                    ...op,
                    party_name: parties.find(p => p.id === op.party_id)?.name,
                    movements: opMvts.map(m => ({
                      ...m,
                      tank_code: tanks.find(t => t.id === m.tank_id)?.code
                    }))
                  }
                });
              }}
              onCancelOperation={handleCancelOperation}
            />
          )}

          {/* 9. RÉPERTOIRE CLIENTS */}
          {activeModule === 'CLIENTS' && (
            <ClientsList
              clients={clientStockSummaries}
              lang={lang}
              onNewClient={handleAddNewClient}
              onPrintClientStatement={(clientSummary) => {
                setActiveModal({
                  type: 'PRINT',
                  docType: 'CLIENT_STATEMENT',
                  format: 'A4',
                  data: {
                    party_name: clientSummary.party.name,
                    party_code: clientSummary.party.code,
                    total_olives_kg: 0,
                    total_oil_litres: clientSummary.total_quantity,
                    average_yield_percent: 0
                  }
                });
              }}
              onExportExcel={() => exportClientsToExcel(clientStockSummaries, appSettings.company_name)}
            />
          )}

          {/* 10. BANC D'ESSAI AUTOMATISÉ */}
          {activeModule === 'TESTS' && (
            <AutomatedTestSuite />
          )}

          {/* 11. PARAMÈTRES */}
          {activeModule === 'SETTINGS' && (
            <SettingsView
              settings={appSettings}
              profiles={profiles}
              currentRole={currentProfile.role}
              isOnline={isOnline}
              auditLogs={auditLogs}
              lang={lang}
              onSaveSettings={(updated) => setAppSettings(updated)}
              onSyncSupabase={loadInitialData}
              onDownloadZip={handleDownloadZip}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {activeModal?.type === 'STOCK_OPERATION' && (
        <OperationModal
          type={activeModal.opType}
          tanks={tankDetails}
          parties={parties}
          currentOperator={currentProfile.display_name}
          preselectedTankId={activeModal.preselectedTankId}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSaveStockOperation}
        />
      )}

      {activeModal?.type === 'TANK_DETAIL' && (
        <TankDetailModal
          tankDetail={activeModal.tankDetail}
          movements={movements}
          operations={operations}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onPrint={() => {
            setActiveModal({
              type: 'PRINT',
              docType: 'CLIENT_STATEMENT',
              format: 'A4',
              data: {
                party_name: `FICHE CUVE: ${activeModal.tankDetail.tank.name} (${activeModal.tankDetail.tank.code})`,
                party_code: activeModal.tankDetail.tank.code,
                total_olives_kg: 0,
                total_oil_litres: activeModal.tankDetail.current_quantity,
                average_yield_percent: activeModal.tankDetail.fill_percentage
              }
            });
          }}
        />
      )}

      {activeModal?.type === 'OLIVE_RECEPTION' && (
        <OliveReceptionModal
          parties={parties}
          currentOperator={currentProfile.display_name}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSaveOliveReception}
        />
      )}

      {activeModal?.type === 'PRODUCTION_ENTRY' && (
        <ProductionEntryModal
          reception={activeModal.reception}
          tanks={tankDetails}
          currentOperator={currentProfile.display_name}
          defaultDensity={appSettings.oil_density}
          defaultMillingFeePerKg={appSettings.default_milling_fee_per_kg}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSaveProductionBatch}
        />
      )}

      {activeModal?.type === 'GRIGNON_SALE' && (
        <GrignonSaleModal
          currentOperator={currentProfile.display_name}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSaveGrignonSale}
        />
      )}

      {activeModal?.type === 'PURCHASE' && (
        <PurchaseModal
          tanks={tankDetails}
          currentOperator={currentProfile.display_name}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSavePurchase}
        />
      )}

      {activeModal?.type === 'PRINT' && (
        <PrintDocument
          docType={activeModal.docType}
          settings={appSettings}
          data={activeModal.data}
          initialFormat={activeModal.format || 'A4'}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
