import React from 'react';
import {
  Database,
  Scale,
  Cog,
  History,
  Truck,
  ShoppingCart,
  Wallet,
  FileText,
  Users,
  Settings as SettingsIcon,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

export type ActiveModule =
  | 'CUVES'
  | 'RECEPTIONS'
  | 'PRODUCTION'
  | 'CUSTOMER_HISTORY'
  | 'GRIGNONS'
  | 'PURCHASES'
  | 'FINANCES'
  | 'OPERATIONS'
  | 'CLIENTS'
  | 'TESTS'
  | 'SETTINGS';

interface SidebarProps {
  activeModule: ActiveModule;
  lang: Language;
  queueCount: number;
  alertTanksCount: number;
  onSelectModule: (m: ActiveModule) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  lang,
  queueCount,
  alertTanksCount,
  onSelectModule
}) => {
  const t = translations[lang];

  const navItems = [
    {
      id: 'RECEPTIONS' as ActiveModule,
      label: lang === 'ar' ? 'قبول الزيتون' : 'Réception Olives',
      icon: Scale
    },
    {
      id: 'PRODUCTION' as ActiveModule,
      label: lang === 'ar' ? 'العصر والطحن' : 'Trituration',
      icon: Cog,
      badge: queueCount > 0 ? `${queueCount}` : undefined,
      badgeColor: 'bg-amber-500 text-stone-950 font-bold'
    },
    {
      id: 'GRIGNONS' as ActiveModule,
      label: lang === 'ar' ? 'بيع الفيتورة' : 'Vente Grignons',
      icon: Truck
    },
    {
      id: 'PURCHASES' as ActiveModule,
      label: lang === 'ar' ? 'الشراء والمزودين' : 'Achats et Fournisseurs',
      icon: ShoppingCart
    },
    {
      id: 'CUVES' as ActiveModule,
      label: lang === 'ar' ? 'إدارة المخزون' : 'Gestion de Stock',
      icon: Database,
      badge: alertTanksCount > 0 ? `${alertTanksCount} alerte(s)` : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'FINANCES' as ActiveModule,
      label: lang === 'ar' ? 'الصندوق والمالية' : 'Caisse & Finance',
      icon: Wallet
    },
    {
      id: 'CUSTOMER_HISTORY' as ActiveModule,
      label: lang === 'ar' ? 'سجل الفلاحة' : 'Historique Clients',
      icon: History
    },
    {
      id: 'OPERATIONS' as ActiveModule,
      label: lang === 'ar' ? 'الحركات والوصولات' : 'Mouvements et Bons',
      icon: FileText
    },
    {
      id: 'CLIENTS' as ActiveModule,
      label: lang === 'ar' ? 'دليل الحرفاء' : 'Répertoire Clients',
      icon: Users
    },
    {
      id: 'TESTS' as ActiveModule,
      label: lang === 'ar' ? 'بنك الاختبارات (16 سيناريو)' : 'Banc d’Essai (16 Tests)',
      icon: Cpu,
      badge: '16/16',
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'SETTINGS' as ActiveModule,
      label: lang === 'ar' ? 'الإعدادات والنسخ' : 'Paramètres',
      icon: SettingsIcon
    }
  ];

  return (
    <aside className="no-print w-64 bg-stone-900 border-r border-stone-800 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-stone-800 text-[11px] text-stone-400">
        <div className="flex items-center gap-1.5 text-stone-300 font-semibold mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Module Stock Protégé</span>
        </div>
        <p className="text-[10px] text-stone-500 leading-normal">
          Traçabilité stricte par cuve et par client · Normes Oléicoles Nationales
        </p>
      </div>
    </aside>
  );
};
