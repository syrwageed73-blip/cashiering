import React from 'react';
import { useTranslation } from 'react-i18next';
import { Product, Category, Invoice, StoreSettings, StockLog } from '../types';
import { Download, Upload, AlertTriangle, Database } from 'lucide-react';
import { Button, FileUpload } from './ui';

interface BackupViewProps {
  products: Product[];
  categories: Category[];
  invoices: Invoice[];
  settings: StoreSettings;
  stockLogs: StockLog[];
  onImportBackup: (importedData: {
    products: Product[];
    categories: Category[];
    invoices: Invoice[];
    settings: StoreSettings;
    stockLogs: StockLog[];
  }) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger'|'warning') => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  products,
  categories,
  invoices,
  settings,
  stockLogs,
  onImportBackup,
  openConfirm,
  addToast
}) => {
  const { t } = useTranslation();

  // 1. Export Database Handler
  const handleExportBackup = () => {
    try {
      const backupData = {
        products,
        categories,
        invoices,
        settings,
        stockLogs,
        exportedAt: new Date().toISOString(),
        validationHash: 'pos-v1-client'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const fileDate = new Date().toISOString().split('T')[0];
      const exportFileName = `pos_backup_${fileDate}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();

      addToast(t('backup.toasts.exportSuccess'), 'success');
    } catch (err) {
      addToast(t('backup.toasts.exportFailed'), 'error');
    }
  };

  // 2. Validate and Import JSON database file
  const processImportFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      addToast(t('backup.toasts.invalidFile'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

        // Critical Schema integrity audits
        if (!parsed.products || !parsed.settings || !parsed.categories || !parsed.invoices) {
          addToast(t('backup.toasts.importFailed'), 'error');
          return;
        }

        // Integrity checking for internal properties
        if (
          !Array.isArray(parsed.products) ||
          !Array.isArray(parsed.categories) ||
          !Array.isArray(parsed.invoices)
        ) {
          addToast(t('backup.toasts.importFailed'), 'error');
          return;
        }

        openConfirm(
          t('backup.import.confirmTitle'),
          t('backup.import.confirmMessage'),
          () => {
            onImportBackup({
              products: parsed.products,
              categories: parsed.categories,
              invoices: parsed.invoices,
              settings: parsed.settings,
              stockLogs: parsed.stockLogs || []
            });
            addToast(t('backup.toasts.importSuccess'), 'success');
          },
          'warning'
        );

      } catch (err) {
        addToast(t('backup.toasts.importFailed'), 'error');
      }
    };
    reader.readAsText(file);
  };

  // File selection handler (delegated to FileUpload primitive)
  const handleRestoreFile = (files: File[]) => {
    if (files && files[0]) {
      processImportFile(files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" style={{ direction: 'rtl' }}>

      {/* Overview Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-zinc-850">
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-sky-600 rounded-xl">
            <Database className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 dark:text-zinc-50">{t('backup.pageTitle')}</h2>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{t('backup.overviewSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Section A: Export Data Column */}
          <div className="bg-slate-50/50 dark:bg-zinc-800/10 p-5 rounded-2xl border border-gray-100 dark:border-zinc-850 flex flex-col justify-between text-right">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Download className="h-4.5 w-4.5 text-emerald-500" /> {t('backup.export.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                {t('backup.export.description')}
              </p>

              <ul className="text-[10px] text-gray-400 dark:text-slate-500 space-y-1 pt-2">
                <li className="flex items-center gap-1">✓ {t('backup.export.products', { count: products.length })}</li>
                <li className="flex items-center gap-1">✓ {t('backup.export.invoices', { count: invoices.length })}</li>
                <li className="flex items-center gap-1">✓ {t('backup.export.includesStockAndConfig')}</li>
              </ul>
            </div>

            <Button
              id="export-db-to-json"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-6"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportBackup}
            >
              {t('backup.export.button')}
            </Button>
          </div>

          {/* Section B: Import Data Drop area Column */}
          <div className="bg-slate-50/50 dark:bg-zinc-800/10 p-5 rounded-2xl border border-gray-100 dark:border-zinc-850 flex flex-col justify-between">
            <div className="space-y-2 text-right">
              <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Upload className="h-4.5 w-4.5 text-sky-500" /> {t('backup.import.title')}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('backup.import.description')}
              </p>
            </div>

            {/* Custom File Area with drag handle */}
            <div className="mt-4">
              <FileUpload
                accept=".json"
                prompt={t('backup.import.prompt')}
                buttonText={t('backup.import.buttonText')}
                onChange={handleRestoreFile}
              />
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center">{t('backup.import.fileTypeNote')}</p>
            </div>
          </div>

        </div>

        {/* Big Alert Warning banner */}
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900 text-xs leading-relaxed text-right flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-rose-800 dark:text-rose-300">{t('backup.import.warningTitle')}</h4>
            <p className="text-gray-600 dark:text-zinc-400 text-[11px]">
              {t('backup.import.warning')}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
