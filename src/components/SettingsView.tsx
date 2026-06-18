import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreSettings } from '../types';
import { Store, Settings, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { TextField, NumberField, Textarea, Button } from './ui';

interface SettingsViewProps {
  settings: StoreSettings;
  onSaveSettings: (updatedSet: StoreSettings) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  addToast
}) => {
  const { t } = useTranslation();

  const [storeName, setStoreName] = useState<string>(settings.storeName);
  const [logo] = useState<string>(settings.storeLogo);
  const [address, setAddress] = useState<string>(settings.address);
  const [phoneNumber, setPhoneNumber] = useState<string>(settings.phoneNumber);
  const [receiptFooter, setReceiptFooter] = useState<string>(settings.receiptFooter);
  const [currencySymbol, setCurrencySymbol] = useState<string>(settings.currencySymbol);
  const [taxPercentage, setTaxPercentage] = useState<number>(settings.taxPercentage);
  const [lowStockAlertQty, setLowStockAlertQty] = useState<number>(settings.lowStockAlertQty);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !address.trim() || !phoneNumber.trim()) {
      addToast(t('settings.toasts.storeNameRequired'), 'error');
      return;
    }

    if (taxPercentage < 0 || taxPercentage > 100) {
      addToast(t('settings.warnings.taxRangeError'), 'error');
      return;
    }

    if (lowStockAlertQty <= 0) {
      addToast(t('settings.warnings.lowStockQtyError'), 'error');
      return;
    }

    onSaveSettings({
      storeName: storeName.trim(),
      storeLogo: logo,
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      receiptFooter: receiptFooter.trim(),
      currencySymbol: currencySymbol.trim(),
      taxPercentage: parseFloat(taxPercentage.toString()) || 0,
      lowStockAlertQty: parseInt(lowStockAlertQty.toString()) || 5
    });

    addToast(t('settings.toasts.saveSuccess'), 'success');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto" style={{ direction: 'rtl' }}>

      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-100 dark:border-zinc-800">
        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-805 text-zinc-900 dark:text-zinc-100 rounded-xl">
          <Settings className="h-5.5 w-5.5" />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-950 dark:text-zinc-50">{t('settings.sectionTitle')}</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{t('settings.sectionSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSettingsSubmit} className="space-y-5">

        {/* Row 1: Store Name */}
        <TextField
          id="set-store-name"
          label={t('settings.fields.storeName')}
          required
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          leftIcon={<Store className="h-4 w-4" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Row 2: Store Address */}
          <TextField
            id="set-store-address"
            label={t('settings.fields.storeAddress')}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            leftIcon={<MapPin className="h-4 w-4" />}
          />

          {/* Phone Number */}
          <TextField
            id="set-store-phone"
            label={t('settings.fields.storePhone')}
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            leftIcon={<Phone className="h-4 w-4" />}
          />

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t border-b border-gray-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/10 p-3 rounded-xl">

          {/* Currency Symbol */}
          <TextField
            id="set-store-currency"
            label={t('settings.fields.currencySymbol')}
            required
            className="text-center font-bold"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
          />

          {/* Tax percentage */}
          <NumberField
            id="set-store-tax"
            label={t('settings.fields.taxPercentage')}
            required
            min={0}
            max={100}
            step={1}
            value={taxPercentage}
            onValueChange={(v) => setTaxPercentage(Number.isNaN(v) ? 0 : v)}
          />

          {/* Low Stock alerting quantity */}
          <NumberField
            id="set-store-low-qty"
            label={t('settings.fields.lowStockAlertQty')}
            required
            min={1}
            step={1}
            value={lowStockAlertQty}
            onValueChange={(v) => setLowStockAlertQty(Number.isNaN(v) ? 5 : v)}
          />

        </div>

        {/* Receipt Footer Message */}
        <Textarea
          id="set-receipt-footer"
          label={t('settings.fields.footerNote')}
          rows={2}
          value={receiptFooter}
          onChange={(e) => setReceiptFooter(e.target.value)}
          placeholder={t('settings.fields.footerNotePlaceholder')}
        />

        {/* Warning Indicator */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-100 dark:border-amber-900 text-[10px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <span>{t('settings.warnings.taxWarning')}</span>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3">
          <Button
            id="save-settings-btn"
            type="submit"
            variant="primary"
            size="lg"
          >
            {t('settings.saveButton')}
          </Button>
        </div>

      </form>

    </div>
  );
};
