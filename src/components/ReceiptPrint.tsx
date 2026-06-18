import React from 'react';
import { useTranslation } from 'react-i18next';
import { Invoice, StoreSettings } from '../types';

interface ReceiptPrintProps {
  invoice: Invoice;
  settings: StoreSettings;
  size: '58mm' | '80mm';
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ invoice, settings, size }) => {
  const { t } = useTranslation();
  // Format dates in Arabic locale beautifully
  const formattedDate = new Date(invoice.datetime).toLocaleDateString('ar-SA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const formattedTime = new Date(invoice.datetime).toLocaleTimeString('ar-SA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <div
      id="print-area"
      className={`mx-auto bg-white text-black p-4 system-receipt rounded border border-gray-100 shadow-sm ${
        size === '58mm' ? 'w-[58mm] text-xs' : 'w-[80mm] text-sm'
      }`}
      style={{ fontFamily: 'monospace, "Tajawal", sans-serif', direction: 'rtl' }}
    >
      {/* Receipt Logo & Header */}
      <div className="text-center pb-3 border-b border-dashed border-gray-300">
        <div className="font-bold text-lg mb-1">{settings.storeName}</div>
        <p className="text-xs text-gray-600 mb-0.5">{settings.address}</p>
        <p className="text-xs text-gray-600">{t('receipt.phone')} {settings.phoneNumber}</p>
      </div>

      {/* Invoice Meta */}
      <div className="py-2 border-b border-dashed border-gray-300 space-y-1 text-xs text-gray-700">
        <div className="flex justify-between">
          <span>{t('receipt.invoiceNumber')}</span>
          <span className="font-bold">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.date')}</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.time')}</span>
          <span>{formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.paymentMethod')}</span>
          <span className="font-bold">
            {invoice.paymentMethod === 'cash' ? t('receipt.paymentMethods.cash') : invoice.paymentMethod === 'card' ? t('receipt.paymentMethods.card') : t('receipt.paymentMethods.mobile')}
          </span>
        </div>
      </div>

      {/* Sales Items Table */}
      <div className="py-2 border-b border-dashed border-gray-300">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 font-normal">
              <th className="text-right pb-1">{t('receipt.table.item')}</th>
              <th className="text-center pb-1">{t('receipt.table.quantity')}</th>
              <th className="text-left pb-1">{t('receipt.table.total')}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50 hover:bg-zinc-50">
                <td className="py-1.5 align-top">
                  <div className="font-medium text-black">{item.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {item.price.toFixed(2)} {settings.currencySymbol}
                  </div>
                </td>
                <td className="py-1.5 text-center align-middle font-semibold text-black">
                  {item.quantity}
                </td>
                <td className="py-1.5 text-left align-middle font-medium text-black">
                  {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subtotals & Taxes */}
      <div className="py-2 space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>{t('receipt.subtotal')}</span>
          <span>{invoice.subtotal.toFixed(2)} {settings.currencySymbol}</span>
        </div>
        {invoice.discount > 0 && (
          <div className="flex justify-between text-rose-600 font-medium">
            <span>{t('receipt.discount')}</span>
            <span>-{invoice.discount.toFixed(2)} {settings.currencySymbol}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>{t('receipt.tax', { taxPercentage: settings.taxPercentage })}</span>
          <span>{invoice.tax.toFixed(2)} {settings.currencySymbol}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-black pt-1 border-t border-gray-200">
          <span>{t('receipt.finalTotal')}</span>
          <span>{invoice.total.toFixed(2)} {settings.currencySymbol}</span>
        </div>
      </div>

      {/* Cash Paid Breakdown if applicable */}
      {invoice.paymentMethod === 'cash' && invoice.cashGiven !== undefined && (
        <div className="bg-gray-50 p-1.5 rounded text-[11px] text-gray-700 mt-1 space-y-1">
          <div className="flex justify-between">
            <span>{t('receipt.cashPaid')}</span>
            <span>{invoice.cashGiven.toFixed(2)} {settings.currencySymbol}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>{t('receipt.change')}</span>
            <span>{invoice.changeGiven?.toFixed(2)} {settings.currencySymbol}</span>
          </div>
        </div>
      )}

      {/* Mock Barcode / Footer */}
      <div className="text-center pt-3 border-t border-dashed border-gray-300 mt-3 space-y-2">
        <p className="text-[10px] text-gray-500 leading-relaxed font-sans">{settings.receiptFooter}</p>
        
        {/* Fake paper barcode element */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div className="flex gap-0.5 justify-center h-8 w-2/3 bg-transparent overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
              <div 
                key={i} 
                className="bg-black h-full" 
                style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
              />
            ))}
          </div>
          <span className="text-[9px] text-gray-400 font-sans tracking-widest mt-0.5">{invoice.invoiceNumber}</span>
        </div>
        
        <p className="text-[9px] text-gray-400 font-sans">{t('receipt.footerAuto')}</p>
      </div>
    </div>
  );
};
