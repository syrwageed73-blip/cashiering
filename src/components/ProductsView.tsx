import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product, Category, StoreSettings } from '../types';
import { Plus, Edit2, Trash2, ShieldAlert, AlertTriangle, Printer } from 'lucide-react';
import { BarcodeRenderer } from './BarcodeRenderer';
import {
  Button,
  TextField,
  NumberField,
  SearchInput,
  Select,
  Checkbox,
} from './ui';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onAddProduct: (newProd: Omit<Product, 'id'>) => void;
  onEditProduct: (updatedProd: Product) => void;
  onDeleteProduct: (productId: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger'|'warning') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  settings,
  addToast,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  openConfirm
}) => {
  const { t } = useTranslation();
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Managing Drawer Overlay for Add/Edit Form
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // States for Barcode label printing selection
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [labelCopies, setLabelCopies] = useState<Record<string, number>>({});
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [defaultCopies, setDefaultCopies] = useState<number>(1);

  // Form Field States
  const [barcode, setBarcode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [lowAlert, setLowAlert] = useState<number>(5);

  // Helper Unique Code128 barcoder
  const generateUniqueBarcode = () => {
    let isUnique = false;
    let newBarcode = '';
    let attempts = 0;
    while (!isUnique && attempts < 100) {
      attempts++;
      // standard Code128 numeric prefix format e.g., 128 + 7 random numeric characters
      const randNum = Math.floor(1000000 + Math.random() * 9000000);
      newBarcode = `128${randNum}`;
      if (!products.some(p => p.barcode === newBarcode)) {
        isUnique = true;
      }
    }
    return newBarcode;
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setBarcode(generateUniqueBarcode()); // auto barcode generation
    setName('');
    setPrice(0);
    setStock(10);
    setCategory(categories[0]?.name || '');
    setImageUrl('');
    setLowAlert(settings.lowStockAlertQty);
    setFormModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setPrice(p.price);
    setStock(p.stock);
    setCategory(p.category);
    setImageUrl(p.image || '');
    setLowAlert(p.lowStockAlert || settings.lowStockAlertQty);
    setFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim() || !name.trim() || price <= 0 || stock < 0 || !category) {
      addToast(t('products.toasts.validationError'), 'error');
      return;
    }

    // Uniqueness validation on Barcode
    const duplicate = products.find(p => p.barcode === barcode.trim() && p.id !== editingProduct?.id);
    if (duplicate) {
      addToast(t('products.toasts.barcodeDuplicate', { barcode, name: duplicate.name }), 'error');
      return;
    }

    const payload = {
      barcode: barcode.trim(),
      name: name.trim(),
      price: parseFloat(price.toString()) || 0,
      stock: parseInt(stock.toString()) || 0,
      category,
      image: imageUrl.trim() || undefined,
      lowStockAlert: parseInt(lowAlert.toString()) || undefined
    };

    if (editingProduct) {
      onEditProduct({ ...payload, id: editingProduct.id });
      addToast(t('products.toasts.editSuccess', { name: payload.name }), 'success');
    } else {
      onAddProduct(payload);
      addToast(t('products.toasts.addSuccess', { name: payload.name }), 'success');
    }
    setFormModalOpen(false);
  };

  const handleDeleteWithConfirm = (product: Product) => {
    openConfirm(
      t('products.confirmDelete.title'),
      t('products.confirmDelete.message', { name: product.name }),
      () => {
        onDeleteProduct(product.id);
        addToast(t('products.toasts.deleteSuccess'), 'info');
      },
      'danger'
    );
  };

  // Filter Catalog
  const matchedList = products.filter(p => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesText = p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                        p.barcode.includes(filterQuery);
    return matchesCat && matchesText;
  });

  // Select-all state for the header checkbox (indeterminate when some but not all matched are selected)
  const allMatchedSelected = matchedList.length > 0 && matchedList.every(p => selectedProdIds.includes(p.id));
  const someMatchedSelected = matchedList.some(p => selectedProdIds.includes(p.id));

  return (
    <>
      <div className="glass-card-strong rounded-2xl p-4 sm:p-6 print:hidden animate-fade-in-up" style={{ direction: 'rtl' }}>

      {/* Top action row */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-950 dark:text-zinc-50">{t('products.pageTitle')}</h2>
          <p className="text-xs text-gray-500 mt-1">{t('products.pageSubtitle')}</p>
        </div>

        <Button
          id="add-new-product-btn"
          variant="primary"
          onClick={openAddModal}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t('products.addProduct')}
        </Button>
      </div>

      {/* Filter and search bar controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
        <div className="md:col-span-8">
          <SearchInput
            id="product-table-search"
            value={filterQuery}
            onChange={setFilterQuery}
            placeholder={t('products.searchPlaceholder')}
            aria-label={t('products.searchPlaceholder')}
          />
        </div>

        <div className="md:col-span-4">
          <Select
            ariaLabel={t('products.filterCategory')}
            value={selectedCat}
            onChange={setSelectedCat}
            options={[
              { value: 'all', label: `${t('products.allCategories')} (${products.length})` },
              ...categories.map(c => ({ value: c.name, label: c.name })),
            ]}
          />
        </div>
      </div>

      {/* Bulk print actions panel when products are selected */}
      {selectedProdIds.length > 0 && (
        <div id="bulk-print-actions-bar" className="mb-5 bg-blue-50 border border-blue-100 p-3.5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-blue-800">
              {t('products.bulk.selected', { count: selectedProdIds.length })}
            </span>
          </div>
          <div className="flex items-center gap-2.5 justify-end">
            <Button
              id="clear-products-selection-btn"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProdIds([])}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              id="open-print-labels-modal-btn"
              variant="primary"
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={() => {
                const copiesObj = { ...labelCopies };
                selectedProdIds.forEach(id => {
                  if (!copiesObj[id]) copiesObj[id] = 1;
                });
                setLabelCopies(copiesObj);
                setPrintModalOpen(true);
              }}
            >
              {t('products.bulk.printBarcodes')}
            </Button>
          </div>
        </div>
      )}

      {/* Main product table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-gray-100/50">
        <table className="w-full text-right text-xs table-premium">
          <thead>
            <tr>
              <th className="py-3.5 px-3 text-center w-10 shrink-0">
                <div className="flex justify-center">
                <Checkbox
                  id="select-all-products-cb"
                  checked={allMatchedSelected}
                  indeterminate={!allMatchedSelected && someMatchedSelected}
                  label={<span className="sr-only">{t('products.table.selectAll')}</span>}
                  onChange={(checked) => {
                    if (checked) {
                      const added = [...selectedProdIds];
                      matchedList.forEach(p => {
                        if (!added.includes(p.id)) added.push(p.id);
                      });
                      setSelectedProdIds(added);
                    } else {
                      const matchedIds = matchedList.map(p => p.id);
                      setSelectedProdIds(prev => prev.filter(id => !matchedIds.includes(id)));
                    }
                  }}
                />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right">{t('products.table.image')}</th>
              <th className="py-3.5 px-4">{t('products.table.barcode')}</th>
              <th className="py-3.5 px-4">{t('products.table.name')}</th>
              <th className="py-3.5 px-4">{t('products.table.category')}</th>
              <th className="py-3.5 px-4">{t('products.table.price')}</th>
              <th className="py-3.5 px-4">{t('products.table.stock')}</th>
              <th className="py-3.5 px-4 text-start">{t('products.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matchedList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  {t('products.table.empty')}
                </td>
              </tr>
            ) : (
              matchedList.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= (p.lowStockAlert || settings.lowStockAlertQty);

                return (
                  <tr key={p.id} className={`hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors ${selectedProdIds.includes(p.id) ? 'bg-blue-50/20' : ''}`}>
                    <td className="py-3 px-3 text-center shrink-0 w-10">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`select-product-cb-${p.id}`}
                          checked={selectedProdIds.includes(p.id)}
                          label={<span className="sr-only">{t('products.table.selectProduct', { name: p.name })}</span>}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedProdIds(prev => [...prev, p.id]);
                              if (!labelCopies[p.id]) {
                                setLabelCopies(prev => ({ ...prev, [p.id]: 1 }));
                              }
                            } else {
                              setSelectedProdIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-10 w-10 rounded-lg bg-gray-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-zinc-700">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] text-gray-300">{t('products.table.noImage')}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-600 dark:text-zinc-400">
                      {p.barcode}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-zinc-100">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-zinc-400">
                      {p.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                      {p.price.toFixed(2)} ر.س
                    </td>
                    <td className="py-3 px-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg font-bold">
                          <ShieldAlert className="h-3.5 w-3.5" /> {t('products.stockBadge.outOfStock')}
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg font-bold">
                          <AlertTriangle className="h-3.5 w-3.5" /> {t('products.stockBadge.lowStock')} ({p.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold">
                          {t('products.stockBadge.adequate')} ({p.stock})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex gap-2">
                        <Button
                          id={`product-edit-btn-${p.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={t('products.table.editLabel')}
                          title={t('products.table.editLabel')}
                          onClick={() => openEditModal(p)}
                          leftIcon={<Edit2 className="h-4 w-4" />}
                        />
                        <Button
                          id={`product-delete-btn-${p.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={t('products.table.deleteLabel')}
                          title={t('products.table.deleteLabel')}
                          onClick={() => handleDeleteWithConfirm(p)}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Overlay Form drawer */}
      {formModalOpen && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card-strong rounded-2xl p-6 relative text-right modal-content">

            <div className="flex justify-between items-center mb-5 pb-3 border-b border-indigo-100/30">
              <h3 className="text-base font-black text-gray-950 dark:text-white">
                {editingProduct ? `${t('products.form.editExisting')}: ${editingProduct.name}` : t('products.form.addNew')}
              </h3>
              <Button
                id="close-product-drawer-btn"
                variant="ghost"
                size="sm"
                aria-label={t('common.actions.close')}
                onClick={() => setFormModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </Button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Barcode */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.barcode')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBarcode(generateUniqueBarcode());
                        addToast(t('products.toasts.barcodeRegenerated'), 'info');
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 underline"
                    >
                      {t('products.form.regenerateBarcode')}
                    </Button>
                  </div>
                  <TextField
                    id="field-barcode"
                    required
                    placeholder={t('products.form.barcodePlaceholder')}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.name')}</span>
                  <TextField
                    id="field-name"
                    required
                    placeholder={t('products.form.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Sale Price */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.price')}</span>
                  <NumberField
                    id="field-price"
                    step={0.01}
                    min={0.01}
                    required
                    placeholder="0.00"
                    value={price}
                    onValueChange={(v) => setPrice(Math.max(0, v))}
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.stock')}</span>
                  <NumberField
                    id="field-stock"
                    min={0}
                    required
                    placeholder="10"
                    value={stock}
                    onValueChange={(v) => setStock(Math.max(0, Math.trunc(v)))}
                  />
                </div>

                {/* Category selector */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.category')}</span>
                  <Select
                    ariaLabel={t('products.form.category')}
                    required
                    value={category}
                    onChange={setCategory}
                    placeholder={t('common.ui.selectPlaceholder')}
                    options={categories.map(c => ({ value: c.name, label: c.name }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Custom Image URL */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.imageUrl')}</span>
                  <TextField
                    id="field-image-url"
                    type="url"
                    inputMode="url"
                    placeholder={t('products.form.imageUrlPlaceholder')}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                {/* Custom alert threshold */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('products.form.lowStockAlert')}</span>
                  <NumberField
                    id="field-low-alert"
                    min={1}
                    placeholder="5"
                    value={lowAlert}
                    onValueChange={(v) => setLowAlert(Math.max(1, Math.trunc(v)))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50 dark:border-zinc-800">
                <Button
                  id="cancel-product-submit"
                  type="button"
                  variant="ghost"
                  onClick={() => setFormModalOpen(false)}
                >
                  {t('products.form.cancel')}
                </Button>
                <Button
                  id="submit-product-form"
                  type="submit"
                  variant="primary"
                >
                  {t('products.form.save')}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      </div>

      {/* 4. Barcode label printer modal */}
      {printModalOpen && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-2xl bg-white border border-gray-150 rounded-2xl p-6 shadow-2xl relative text-right flex flex-col max-h-[90vh]">

            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-150 shrink-0">
              <h3 className="text-base font-black text-gray-950 flex items-center gap-2 font-sans">
                <Printer className="h-5 w-5 text-blue-600" /> {t('products.barcodePrint.title')}
              </h3>
              <Button
                id="close-print-labels-modal"
                variant="ghost"
                size="sm"
                aria-label={t('common.actions.close')}
                onClick={() => setPrintModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 px-1 pb-1 text-xs">

              {/* Batch copies control */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-start">
                  <div className="font-bold text-gray-805">{t('products.barcodePrint.setBulkCopiesLabel')}</div>
                  <div className="text-[10px] text-gray-500">{t('products.barcodePrint.setBulkCopiesDesc')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <NumberField
                      id="bulk-copies-input"
                      min={1}
                      max={50}
                      aria-label={t('products.barcodePrint.defaultCopiesLabel')}
                      value={defaultCopies}
                      onValueChange={(v) => setDefaultCopies(Math.max(1, Math.trunc(v)))}
                    />
                  </div>
                  <Button
                    id="apply-bulk-copies-btn"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      selectedProdIds.forEach(id => {
                        updated[id] = defaultCopies;
                      });
                      setLabelCopies(updated);
                      addToast(t('products.toasts.bulkCopiesSet', { count: defaultCopies }), 'success');
                    }}
                  >
                    {t('products.barcodePrint.applyToAll')}
                  </Button>
                </div>
              </div>

              {/* Selected products copies config */}
              <div className="space-y-2.5">
                <div className="font-bold text-gray-805 border-b border-dashed border-gray-200 pb-1.5 mb-2">{t('products.barcodePrint.selectedListTitle')}</div>
                <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto ps-2">
                  {selectedProdIds.map(id => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    const copies = labelCopies[p.id] || 1;
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-4">
                        <div className="text-start">
                          <div className="font-bold text-gray-900">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{t('products.barcodePrint.productInfo', { barcode: p.barcode, price: p.price.toFixed(2) })}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-28">
                            <NumberField
                              min={1}
                              aria-label={`${t('products.barcodePrint.quantity')} ${p.name}`}
                              value={copies}
                              onValueChange={(v) => setLabelCopies(prev => ({ ...prev, [p.id]: Math.max(1, Math.trunc(v)) }))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual print preview layout */}
              <div className="space-y-2">
                <div className="font-bold text-gray-850">{t('products.barcodePrint.previewTitle')}</div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto">
                  {selectedProdIds.map(id => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    const copies = labelCopies[p.id] || 1;
                    return (
                      <div key={p.id} className="bg-white p-2.5 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-center shadow-xs">
                        <div className="text-[9px] font-bold text-gray-805 truncate w-full">{p.name}</div>
                        <div className="my-1 shrink-0 scale-90 origin-center">
                          <BarcodeRenderer value={p.barcode} displayValue={false} height={25} width={1.0} margin={0} />
                        </div>
                        <div className="text-[9px] font-mono font-medium text-gray-500">{p.barcode}</div>
                        <div className="text-[9px] font-bold text-blue-600 mt-0.5 font-mono">{p.price.toFixed(2)} ر.س • {t('products.barcodePrint.label', { count: copies })}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Print trigger footer action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-150 shrink-0 mt-4">
              <div className="text-start">
                <div className="text-[10px] text-gray-500">{t('products.barcodePrint.totalLabelsLabel')}</div>
                <div className="text-xs font-bold font-mono text-gray-800">
                  {t('products.barcodePrint.label', { count: selectedProdIds.reduce((sum, id) => sum + (labelCopies[id] || 1), 0) })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  id="cancel-label-printing-btn"
                  variant="ghost"
                  onClick={() => setPrintModalOpen(false)}
                >
                  {t('products.barcodePrint.cancel')}
                </Button>
                <Button
                  id="trigger-print-now-btn"
                  variant="primary"
                  leftIcon={<Printer className="h-4.5 w-4.5" />}
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 150);
                  }}
                >
                  {t('products.barcodePrint.print')}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. Pure printable barcode sheet layout (HIDDEN on screen, only visible on print dialog trigger) */}
      <div className="hidden print:block w-full bg-white text-black p-0 m-0" style={{ direction: 'rtl' }}>
        <div style={{ padding: '10px' }}>
          <div className="font-bold text-lg mb-4 text-center pb-2 border-b border-black">{settings.storeName || t('products.barcodePrint.printSheetTitle')}</div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            {selectedProdIds.flatMap(id => {
              const p = products.find(prod => prod.id === id);
              if (!p) return [];
              const copies = labelCopies[p.id] || 1;
              return Array.from({ length: copies }).map((_, copyIndex) => (
                <div
                  key={`${p.id}-${copyIndex}`}
                  className="border border-gray-300 p-4 rounded-xl flex flex-col items-center justify-between bg-white text-black min-h-[140px] break-inside-avoid"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="text-xs font-black text-black w-full line-clamp-2 leading-tight mb-1">{p.name}</div>
                  <div className="my-2 flex justify-center w-full">
                    <BarcodeRenderer value={p.barcode} displayValue={false} height={38} width={1.25} margin={0} />
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-black">{p.barcode}</div>
                  <div className="text-xs font-black mt-2 text-black">{t('products.barcodePrint.priceTag', { price: p.price.toFixed(2) })}</div>
                </div>
              ));
            })}
          </div>
        </div>
      </div>
    </>
  );
};
