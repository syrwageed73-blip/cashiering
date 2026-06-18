import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product, StoreSettings, StockLog } from '../types';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, ClipboardList, Database, AlertCircle } from 'lucide-react';
import { Button, NumberField, Textarea, Select } from './ui';

interface InventoryViewProps {
  products: Product[];
  settings: StoreSettings;
  stockLogs: StockLog[];
  onAdjustStock: (productId: string, delta: number, type: 'add' | 'subtract' | 'adjust', notes: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  settings,
  stockLogs,
  onAdjustStock,
  addToast
}) => {
  const { t } = useTranslation();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'adjust'>('add');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // 1. Calculate Aggregates
  const totalProducts = products.length;
  const totalInventoryUnits = products.reduce((acc, curr) => acc + curr.stock, 0);

  const lowStockList = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockAlert || settings.lowStockAlertQty));
  const outOfStockList = products.filter(p => p.stock <= 0);

  // Form submit handler
  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      addToast(t('inventory.toasts.productRequired'), 'error');
      return;
    }

    if (adjustmentQty <= 0) {
      addToast(t('inventory.toasts.invalidQuantity'), 'error');
      return;
    }

    const targetProduct = products.find(p => p.id === selectedProductId);
    if (!targetProduct) return;

    if (adjustType === 'subtract' && targetProduct.stock < adjustmentQty) {
      addToast(t('inventory.toasts.exceedStock', { count: targetProduct.stock }), 'error');
      return;
    }

    // Call callback to commit to LocalStorage & Log history
    onAdjustStock(
      selectedProductId,
      adjustmentQty,
      adjustType,
      adjustNotes.trim() || (adjustType === 'add' ? 'شحنة توريد جديدة' : adjustType === 'subtract' ? 'تسوية عجز/تالف' : 'تحديث جرد مباشر')
    );

    addToast(t('inventory.toasts.adjustSuccess'), 'success');

    // Reset Fields
    setSelectedProductId('');
    setAdjustmentQty(0);
    setAdjustNotes('');
  };

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>

      {/* Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Total Products */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">{t('inventory.metrics.totalProducts')}</span>
            <span className="p-1 px-2.5 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 font-sans text-[10px] font-bold rounded-md">{t('inventory.metrics.catalogBadge')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-gray-950 dark:text-white font-mono">{totalProducts}</h4>
            <span className="text-xs text-gray-400">{t('inventory.metrics.itemsInCashier')}</span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">{t('inventory.metrics.totalWarehouseUnits')}</span>
            <span className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-sans text-[10px] font-bold rounded-md">{t('inventory.metrics.assetsBadge')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-gray-950 dark:text-white font-mono">{totalInventoryUnits}</h4>
            <span className="text-xs text-gray-400">{t('inventory.metrics.saleUnit')}</span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">{t('inventory.metrics.nearlyOutOfStock')}</span>
            <span className="p-1 px-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 font-sans text-[10px] font-bold rounded-md">{t('inventory.metrics.alertBadge')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-amber-500 font-mono">{lowStockList.length}</h4>
            <span className="text-xs text-gray-400">{t('inventory.metrics.belowSafetyLevel')}</span>
          </div>
        </div>

        {/* Out of Stock Warning */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">{t('inventory.metrics.completelyOutOfStock')}</span>
            <span className="p-1 px-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 font-sans text-[10px] font-bold rounded-md">{t('inventory.metrics.criticalBadge')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-rose-500 font-mono">{outOfStockList.length}</h4>
            <span className="text-xs text-gray-400">{t('inventory.metrics.needsImmediateSupply')}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Adjustments Editor Form Panel (5 Column width) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="mb-5">
            <h4 className="text-sm font-black text-gray-900 dark:text-zinc-50 flex items-center gap-2">
              <RefreshCcw className="h-4.5 w-4.5 text-sky-500" /> {t('inventory.adjust.title')}
            </h4>
            <p className="text-[11px] text-gray-500 mt-1">{t('inventory.adjust.subtitle')}</p>
          </div>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">

            {/* Select product */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1 block">{t('inventory.adjust.productLabel')}:</span>
              <Select
                ariaLabel={t('inventory.adjust.productLabel')}
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder={t('inventory.adjust.productPlaceholder')}
                options={products.map(p => ({
                  value: p.id,
                  label: `${p.name} (${t('inventory.adjust.currentStock')}: ${p.stock})`,
                }))}
              />
            </div>

            {/* Adjustment operation type */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1.5 block">{t('inventory.adjust.typeLabel')}:</span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 'add', label: t('inventory.adjust.typeAdd'), class: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 text-emerald-800 dark:text-emerald-300' },
                  { value: 'subtract', label: t('inventory.adjust.typeSubtract'), class: 'bg-rose-50 dark:bg-rose-950/25 border-rose-250 text-rose-800 dark:text-rose-300' },
                  { value: 'adjust', label: t('inventory.adjust.typeAdjust'), class: 'bg-indigo-50 dark:bg-indigo-950/25 border-indigo-250 text-indigo-805 dark:text-indigo-300' }
                ].map((item) => (
                  <button
                    id={`adjust-type-btn-${item.value}`}
                    key={item.value}
                    type="button"
                    aria-pressed={adjustType === item.value}
                    onClick={() => setAdjustType(item.value as any)}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ui-press ${
                      adjustType === item.value
                        ? item.class + ' ring-2 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">

              {/* Quantities */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1 block">
                  {adjustType === 'adjust' ? t('inventory.adjust.quantityLabelNew') : t('inventory.adjust.quantityLabelDelta')}
                </span>
                <NumberField
                  min={0}
                  required
                  aria-label={t('inventory.adjust.quantityLabel')}
                  placeholder={t('inventory.adjust.quantityPlaceholder')}
                  value={adjustmentQty}
                  onValueChange={(v) => setAdjustmentQty(Math.max(0, Math.trunc(v)))}
                />
              </div>

              {/* Adjust Notes */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 mb-1 block">{t('inventory.adjust.notesLabel')}:</span>
                <Textarea
                  id="adjust-notes-field"
                  placeholder={t('inventory.adjust.notesPlaceholder')}
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

            </div>

            {/* Submit Adjust button */}
            <Button
              id="submit-adjust-inventory-btn"
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
            >
              {t('inventory.adjust.submitButton')}
            </Button>

          </form>
        </div>

        {/* History stock audit ledger list (7 Column width) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-black text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-indigo-500" /> {t('inventory.history.title')}
              </h4>
              <p className="text-[11px] text-gray-500 mt-1">{t('inventory.history.subtitle')}</p>
            </div>

            <div className="overflow-x-auto max-h-[380px] rounded-xl border border-gray-100 dark:border-zinc-800">
              <table className="w-full text-right text-[11px] min-w-[560px]">
                <thead className="bg-slate-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t('inventory.history.columns.datetime')}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t('inventory.history.columns.productName')}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t('inventory.history.columns.movementType')}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t('inventory.history.columns.quantity')}</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">{t('inventory.history.columns.detailedNotes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {stockLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        {t('inventory.history.empty')}
                      </td>
                    </tr>
                  ) : (
                    stockLogs.map((log) => {
                      let typeLabel = <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">{t('inventory.adjust.typeAdjust')}</span>;

                      if (log.type === 'sale') {
                        typeLabel = <span className="text-[10px] bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded text-sky-600 dark:text-sky-450 font-bold flex items-center gap-0.5 w-max"><ArrowDownRight className="h-2.5 w-2.5" /> {t('inventory.history.types.sale')}</span>;
                      } else if (log.type === 'add') {
                        typeLabel = <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-0.5 w-max"><ArrowUpRight className="h-2.5 w-2.5" /> {t('inventory.history.types.supply')}</span>;
                      } else if (log.type === 'subtract') {
                        typeLabel = <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-450 font-bold flex items-center gap-0.5 w-max"><ArrowDownRight className="h-2.5 w-2.5" /> {t('inventory.history.types.deficitDamaged')}</span>;
                      } else if (log.type === 'adjust') {
                        typeLabel = <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 w-max"><Database className="h-2.5 w-2.5" /> {t('inventory.history.types.adjust')}</span>;
                      }

                      const logTime = new Date(log.datetime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                      const logDate = new Date(log.datetime).toLocaleDateString('ar-SA', { month: '2-digit', day: '2-digit' });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                          <td className="py-2 px-3 text-gray-500 font-mono whitespace-nowrap">
                            {logDate} {logTime}
                          </td>
                          <td className="py-2 px-3 font-bold text-gray-800 dark:text-zinc-200">
                            {log.productName}
                          </td>
                          <td className="py-2 px-3">
                            {typeLabel}
                          </td>
                          <td className="py-2 px-3 font-mono font-black text-gray-950 dark:text-white">
                            {t('inventory.unit', { count: log.quantity })}
                          </td>
                          <td className="py-2 px-3 text-gray-500 truncate max-w-[150px]" title={log.notes}>
                            {log.notes}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-zinc-800 text-[10px] text-gray-400 flex items-center gap-1.5 justify-end">
            <AlertCircle className="h-3.5 w-3.5 text-sky-500" />
            <span>{t('inventory.history.systemNote')}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
