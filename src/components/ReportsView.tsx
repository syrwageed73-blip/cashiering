import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Invoice, StoreSettings, Product } from '../types';
import { InteractiveCharts } from './InteractiveCharts';
import { ReceiptPrint } from './ReceiptPrint';
import { FileText, Printer, Trash2, BarChart3, Receipt, Eye } from 'lucide-react';
import { SearchInput, DateField, SegmentedControl, Button } from './ui';

interface ReportsViewProps {
  invoices: Invoice[];
  products: Product[];
  settings: StoreSettings;
  canManageInvoices?: boolean;
  onDeleteInvoice: (invoiceId: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger'|'warning') => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  settings,
  canManageInvoices = true,
  onDeleteInvoice,
  openConfirm,
  addToast
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [searchInvoiceNum, setSearchInvoiceNum] = useState<string>('');
  const [searchDate, setSearchDate] = useState<string>('');
  
  // Selected invoice for receipt preview & print modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [receiptSize, setReceiptSize] = useState<'58mm' | '80mm'>('80mm');

  // 1. Calculate Reports Metrics
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  const todayInvoices = invoices.filter(inv => inv.datetime.startsWith(todayDateStr));
  const todaySalesVal = todayInvoices.reduce((acc, c) => acc + c.total, 0);

  // Past 7 Days value
  const past7DaysInvoices = invoices.filter(inv => {
    const dDiff = (new Date().getTime() - new Date(inv.datetime).getTime()) / (1000 * 60 * 60 * 24);
    return dDiff <= 7;
  });
  const past7DaysSalesVal = past7DaysInvoices.reduce((acc, c) => acc + c.total, 0);

  // Monthly stats
  const monthlyInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.datetime);
    const now = new Date();
    return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
  });
  const monthlySalesVal = monthlyInvoices.reduce((acc, c) => acc + c.total, 0);

  const totalInvoicesCount = invoices.length;
  const totalRevenueAllTime = invoices.reduce((acc, c) => acc + c.total, 0);

  // Detailed history query list
  const filteredInvoices = invoices.filter((inv) => {
    const matchesNum = inv.invoiceNumber.toLowerCase().includes(searchInvoiceNum.toLowerCase());
    const matchesDate = !searchDate || inv.datetime.startsWith(searchDate);
    return matchesNum && matchesDate;
  });

  const handleDeleteInvoiceClick = (invoice: Invoice) => {
    openConfirm(
      t('reports.confirmDelete.title'),
      t('reports.confirmDelete.message', { invoiceNumber: invoice.invoiceNumber }),
      () => {
        onDeleteInvoice(invoice.id);
        addToast(t('reports.toasts.deleteSuccess'), 'success');
      },
      'danger'
    );
  };

  const openReceiptModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handlePrintReceipt = () => {
    // Invoke browser manual printer with @media print configured in index.css
    window.print();
    addToast(t('reports.receipt.print'), 'info');
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6" style={{ direction: 'rtl' }}>
      
      {/* Top segments tab control bar */}
      <div className="shrink-0">
        <SegmentedControl
          ariaLabel={t('reports.pageTitle')}
          fullWidth
          value={activeTab}
          onChange={(v) => setActiveTab(v)}
          options={[
            { value: 'stats', label: t('reports.tabs.overview'), icon: <BarChart3 className="h-4 w-4" /> },
            { value: 'history', label: t('reports.tabs.invoices'), icon: <FileText className="h-4 w-4" /> }
          ]}
        />
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-5">
            
            {/* Today Sales */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 block">{t('reports.stats.todaySales')}</span>
              <div className="mt-3 flex items-baseline gap-1.5 justify-between">
                <h4 className="text-xl font-black text-emerald-600 font-mono">
                  {todaySalesVal.toFixed(2)} <span className="text-xs text-gray-400 dark:text-slate-500 font-sans font-normal">{settings.currencySymbol}</span>
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{t('reports.stats.todayInvoices', { count: todayInvoices.length })}</span>
              </div>
            </div>

            {/* Weekly Sales */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 block">{t('reports.stats.week7Sales')}</span>
              <div className="mt-3 flex items-baseline gap-1.5 justify-between">
                <h4 className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
                  {past7DaysSalesVal.toFixed(2)} <span className="text-xs text-gray-400 font-sans font-normal">{settings.currencySymbol}</span>
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{t('reports.stats.invoiceCount', { count: past7DaysInvoices.length })}</span>
              </div>
            </div>

            {/* Monthly Sales */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 block">{t('reports.stats.monthSales')}</span>
              <div className="mt-3 flex items-baseline gap-1.5 justify-between">
                <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {monthlySalesVal.toFixed(2)} <span className="text-xs text-gray-400 font-sans font-normal">{settings.currencySymbol}</span>
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{t('reports.stats.monthInvoices', { count: monthlyInvoices.length })}</span>
              </div>
            </div>

            {/* All-time Revenue aggregate */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 block">{t('reports.stats.totalRevenue')}</span>
              <div className="mt-3 flex items-baseline gap-1.5 justify-between">
                <h4 className="text-xl font-black text-gray-900 dark:text-zinc-50 font-mono">
                  {totalRevenueAllTime.toFixed(2)} <span className="text-xs text-gray-400 font-sans font-normal">{settings.currencySymbol}</span>
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{t('reports.stats.allTimeInvoiceCount', { count: totalInvoicesCount })}</span>
              </div>
            </div>

          </div>

          {/* Render charts using our high fidelity InteractiveCharts */}
          <InteractiveCharts invoices={invoices} settings={settings} />

        </div>
      ) : (
        
        // History ledger lists segment
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl p-6 xl:p-7 shadow-sm">
          
          {/* Filtering row */}
          <div className="grid grid-cols-1 gap-3 mb-5 xl:grid-cols-12 xl:gap-4">

            {/* Search filter by Invoice ID / No. */}
            <div className="xl:col-span-9">
              <SearchInput
                id="search-invoice-no-field"
                aria-label={t('reports.invoiceTable.searchAriaLabel')}
                placeholder={t('reports.invoiceTable.searchPlaceholder')}
                value={searchInvoiceNum}
                onChange={(v) => setSearchInvoiceNum(v)}
              />
            </div>

            {/* Date filter picker */}
            <div className="xl:col-span-3">
              <DateField
                id="search-invoice-date"
                ariaLabel={t('reports.invoiceTable.dateFilterAriaLabel')}
                kind="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>

          </div>

          {/* Invoice Table list */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-zinc-800">
            <table className="w-full text-right text-xs xl:text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-800 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.invoiceNumber')}</th>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.datetime')}</th>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.items')}</th>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.payment')}</th>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.tax')}</th>
                  <th className="py-3 px-4">{t('reports.invoiceTable.columns.total')}</th>
                  <th className="py-3 px-4 text-left">{t('reports.invoiceTable.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-slate-500">
                      {t('reports.invoiceTable.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const formattedDateTime = new Date(inv.datetime).toLocaleString('ar-SA', {
                      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-zinc-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 dark:text-zinc-400">
                          {formattedDateTime}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px] truncate" title={inv.items.map(i => `${i.name} (${i.quantity})`).join('\n')}>
                          <span className="font-semibold text-gray-800 dark:text-zinc-200">
                            {t('reports.itemCount', { count: inv.items.length })}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block leading-tight truncate">
                            {inv.items.map(i => i.name).join('، ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {inv.paymentMethod === 'cash' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded">{t('reports.invoiceTable.paymentMethods.cash')}</span>
                          ) : inv.paymentMethod === 'card' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded">{t('reports.invoiceTable.paymentMethods.card')}</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 rounded">{t('reports.invoiceTable.paymentMethods.mobile')}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-500 dark:text-slate-400">
                          {inv.tax.toFixed(2)} ر.س
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                          {inv.total.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <div className="inline-flex gap-1.5">
                            <Button
                              id={`invoice-view-${inv.id}`}
                              variant="secondary"
                              size="sm"
                              leftIcon={<Eye className="h-3.5 w-3.5" />}
                              onClick={() => openReceiptModal(inv)}
                              title={t('reports.invoiceTable.viewReceipt')}
                            >
                              {t('reports.invoiceTable.viewReceipt')}
                            </Button>
                            {canManageInvoices && (
                              <Button
                                id={`invoice-delete-${inv.id}`}
                                variant="ghost"
                                size="sm"
                                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/35"
                                aria-label={t('reports.invoiceTable.deleteInvoice')}
                                title={t('reports.invoiceTable.deleteInvoice')}
                                onClick={() => handleDeleteInvoiceClick(inv)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Printable thermal ticket overlays */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50 dark:border-zinc-800 shrink-0">
              <h3 className="text-sm font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-gray-500 dark:text-slate-400" /> {t('reports.receipt.title')}
              </h3>
              <button
                id="close-receipt-modal-btn"
                onClick={() => setSelectedInvoice(null)}
                aria-label={t('common.actions.close')}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-650 font-bold text-lg leading-none w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Receipt Ticket size selector */}
            <div className="bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl text-xs flex flex-wrap justify-between items-center gap-2 mb-4 shrink-0">
              <span>{t('reports.receipt.paperSize')}</span>
              <SegmentedControl
                ariaLabel={t('reports.receipt.paperSize')}
                size="sm"
                value={receiptSize}
                onChange={(v) => setReceiptSize(v)}
                options={[
                  { value: '58mm', label: t('reports.receipt.thermal58') },
                  { value: '80mm', label: t('reports.receipt.thermal80') }
                ]}
              />
            </div>

            {/* Scrollable Receipt Body container */}
            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
              {/* Dynamic receipt layout that translates to paper print */}
              <ReceiptPrint invoice={selectedInvoice} settings={settings} size={receiptSize} />
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50 dark:border-zinc-800 shrink-0">
              <Button
                id="cancel-receipt-printing"
                variant="ghost"
                onClick={() => setSelectedInvoice(null)}
              >
                {t('reports.receipt.close')}
              </Button>
              <Button
                id="do-print-ticket-btn"
                variant="dark"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={handlePrintReceipt}
              >
                {t('reports.receipt.print')}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
