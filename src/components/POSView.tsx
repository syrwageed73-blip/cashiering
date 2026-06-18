import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Product, Category, StoreSettings, CartItem, Invoice } from '../types';
import { ShoppingCart, Percent, ShieldCheck, CreditCard, Trash2, Smartphone, Plus, Minus, Grid, AlertTriangle, Zap, Flame, ChevronUp, ChevronDown } from 'lucide-react';
import { Button, SearchInput, NumberField, SegmentedControl } from './ui';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onCheckoutComplete: (paymentMethod: 'cash' | 'card' | 'mobile', discountVal: number, cashPaid: number) => void;
  invoices?: Invoice[];
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  settings,
  cart,
  setCart,
  addToast,
  onCheckoutComplete,
  invoices = []
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [usePercentDiscount, setUsePercentDiscount] = useState<boolean>(true);
  
  // Quick Access Panel State
  const [bestSellersOpen, setBestSellersOpen] = useState<boolean>(true);

  // Generate list of best sellers dynamically from past transactions, or fallback to first items
  const getBestSellers = (): Product[] => {
    if (!products || products.length === 0) return [];
    
    const salesCount: Record<string, number> = {};
    if (invoices && invoices.length > 0) {
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(item => {
            salesCount[item.productId] = (salesCount[item.productId] || 0) + item.quantity;
          });
        }
      });
    }

    // Sort products by sales count, prioritizing items with record sales, or fallback to highest stock
    const sortedProducts = [...products].sort((a, b) => {
      const salesA = salesCount[a.id] || 0;
      const salesB = salesCount[b.id] || 0;
      if (salesB !== salesA) {
        return salesB - salesA;
      }
      return b.stock - a.stock;
    });

    return sortedProducts.slice(0, 8);
  };
  
  // Checkout Modal State
  const [checkoutPriceModal, setCheckoutPriceModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Beep Sound effect synthesizer
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 850;
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.log('Audio Context beep disabled:', e);
    }
  };

  // Keyboard binding to auto-focus barcode field on F2, checkout on F4
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
        addToast(t('pos.toasts.barcodeFocused'), 'info');
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          prepareCheckout();
        } else {
          addToast(t('pos.toasts.cartEmptyAlert'), 'warning');
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          clearCart();
        }
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [cart]);

  // Handle immediate barcode submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProd = products.find(p => p.barcode === barcodeInput.trim());
    if (matchedProd) {
      if (matchedProd.stock <= 0) {
        addToast(t('pos.toasts.productOutOfStock', { name: matchedProd.name }), 'error');
      } else {
        addToCart(matchedProd);
        playBeep();
      }
    } else {
      addToast(t('pos.toasts.productNotFoundBarcode', { barcode: barcodeInput }), 'error');
    }
    setBarcodeInput('');
    
    // Maintain focus on scan field
    setTimeout(() => {
      barcodeRef.current?.focus();
    }, 50);
  };

  // Safe manual product search + barcode
  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
    return matchesCat && matchesSearch;
  });
  const bestSellerProducts = getBestSellers();
  const cartUnits = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const filteredLowStockCount = filteredProducts.filter(
    (product) => product.stock > 0 && product.stock <= (product.lowStockAlert || settings.lowStockAlertQty)
  ).length;

  // Safe Cart Quantity Modifier
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        addToast(t('pos.toasts.exceedStock', { count: product.stock }), 'warning');
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      if (product.stock <= 0) {
        addToast(t('pos.toasts.productExhausted'), 'error');
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
    addToast(t('pos.toasts.added', { name: product.name }), 'success');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const index = cart.findIndex(item => item.product.id === productId);
    if (index === -1) return;

    const currentQty = cart[index].quantity;
    const itemStock = cart[index].product.stock;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > itemStock) {
      addToast(t('pos.toasts.stockLimitReached', { count: itemStock }), 'warning');
      return;
    }

    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    const matched = cart.find(c => c.product.id === productId);
    setCart(cart.filter(item => item.product.id !== productId));
    if (matched) {
      addToast(t('pos.toasts.itemRemoved', { name: matched.product.name }), 'info');
    }
  };

  const clearCart = () => {
    setCart([]);
    addToast(t('pos.toasts.cartCleared'), 'info');
  };

  // Calculate Subtotals and Final Amounts
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  
  const discountAmount = usePercentDiscount 
    ? (cartSubtotal * discountPercent / 100) 
    : Math.min(manualDiscount, cartSubtotal);

  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  const calculatedTax = taxableAmount * (settings.taxPercentage / 100);
  const cartTotal = taxableAmount + calculatedTax;

  // Prepare checkout process
  const prepareCheckout = () => {
    setPaymentMethod('cash');
    setCashReceived((Math.ceil(cartTotal / 5) * 5).toString()); // suggest rounded cash notes
    setCheckoutPriceModal(true);
  };

  const handleCheckoutSubmit = () => {
    const givenCash = parseFloat(cashReceived) || 0;
    if (paymentMethod === 'cash' && givenCash < cartTotal) {
      addToast(t('pos.toasts.insufficientCashFull', { total: cartTotal.toFixed(2) }), 'error');
      return;
    }
    onCheckoutComplete(paymentMethod, discountAmount, givenCash);
    setCheckoutPriceModal(false);
  };

  const changeDue = Math.max(0, (parseFloat(cashReceived) || 0) - cartTotal);

  return (
    <div className="flex h-full flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_460px]">
      
      {/* Right side: Product Finder Grid (7 Column width in Arabic layout flow) */}
      <div className="flex-1 flex flex-col min-w-0" style={{ direction: 'rtl' }}>
        
        {/* Upper Search Bar & Barcode input row */}
        <div className="grid grid-cols-1 gap-3 mb-4 shrink-0 md:grid-cols-12 xl:gap-4">
          
          {/* Action Form for real barcode reader entry */}
          <form onSubmit={handleBarcodeSubmit} className="md:col-span-5 relative">
            <SearchInput
              id="barcode-scanner-input"
              ref={barcodeRef}
              placeholder={t('pos.barcodeScanPlaceholder')}
              value={barcodeInput}
              onChange={(v) => setBarcodeInput(v)}
              clearable={false}
              autoFocus
              className="font-mono text-sm shadow-sm"
            />
            <span className="absolute end-2.5 top-1.5 text-[8px] font-bold bg-indigo-50 px-1.5 py-1 text-indigo-500 rounded-md border border-indigo-100/50 pointer-events-none">F2</span>
          </form>

          {/* Regular Manual Product Text Search box */}
          <div className="md:col-span-7">
            <SearchInput
              id="pos-manual-search"
              placeholder={t('pos.manualSearchPlaceholder')}
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
              className="text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Quick Access Grid: Best-selling products */}
        <div id="quick-access-section" className="mb-4 gradient-primary-soft border border-indigo-100/30 p-3.5 rounded-2xl select-none">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-200/20">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white fill-white" />
              </div>
              <span>{t('pos.quickAccessPanelTitle')}</span>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50/80 border border-amber-100/50 px-1.5 py-0.5 rounded-md mr-1.5">{t('pos.quickAccessOneClick')}</span>
            </div>
            <Button
              id="toggle-quick-access-btn"
              variant="ghost"
              size="sm"
              onClick={() => setBestSellersOpen(!bestSellersOpen)}
              className="!h-7 !min-w-[36px] !px-2 text-gray-500 hover:text-gray-700 text-[10px]"
              rightIcon={
                bestSellersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
              }
            >
              {bestSellersOpen ? t('pos.quickAccessHide') : t('pos.quickAccessShow')}
            </Button>
          </div>

          {bestSellersOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
              {bestSellerProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <button
                    id={`quick-add-${p.id}`}
                    key={`quick-${p.id}`}
                    disabled={isOutOfStock}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCart(p);
                        playBeep();
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center text-center p-2 rounded-xl border cursor-pointer select-none transition-all group shadow-sm hover-lift ${
                      isOutOfStock
                        ? 'border-gray-150 opacity-40 cursor-not-allowed'
                        : 'border-indigo-100/50 bg-white/80 hover:border-indigo-300 hover:bg-white'
                    }`}
                  >
                    {/* Compact Image/Icon Representation */}
                    <div className="h-10 w-10 bg-slate-100/80 rounded-lg flex items-center justify-center mb-1 overflow-hidden relative group-hover:scale-105 transition-transform">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 text-gray-400" />
                      )}
                      
                      {/* Popularity flame visual badge */}
                      <div className="absolute top-0.5 right-0.5 bg-amber-500 text-white p-0.5 rounded-full scale-75 origin-top-right">
                        <Flame className="h-2.5 w-2.5 fill-white" />
                      </div>
                    </div>

                    {/* Short title */}
                    <span className="text-[10px] font-bold text-gray-900 truncate w-full px-1 mb-0.5" title={p.name}>
                      {p.name}
                    </span>

                    {/* Compact Price tag */}
                    <div className="flex items-center gap-0.5 mt-auto">
                      <span className="text-[10px] font-black text-indigo-600 font-mono">
                        {p.price.toFixed(2)}
                      </span>
                      <span className="text-[8px] text-gray-400 leading-none">ر.س</span>
                    </div>

                    {/* stock label counter */}
                    {p.stock <= 5 && p.stock > 0 && (
                      <span className="absolute top-1 left-1 text-[7px] font-black bg-amber-500 text-white px-1 py-0.2 rounded-sm scale-90">
                        {t('pos.stockBadge.unit', { count: p.stock })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Horizontal Categories Ribbon */}
        <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
          <button
            id="cat-tab-all"
            key="all"
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 text-xs font-medium rounded-full transition-all cursor-pointer truncate ${
              activeCategory === 'all'
                ? 'gradient-primary text-white shadow-md'
                : 'glass-card text-gray-600 hover:text-indigo-600'
            }`}
          >
            {t('pos.allCategories')} ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.category === cat.name).length;
            return (
              <button
                id={`cat-tab-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-5 py-2 text-xs font-medium rounded-full transition-all cursor-pointer truncate ${
                  activeCategory === cat.name
                    ? 'gradient-primary text-white shadow-md'
                    : 'glass-card text-gray-600 hover:text-indigo-600'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          <div className="glass-card rounded-2xl px-4 py-3 text-right">
            <span className="text-[10px] font-bold text-gray-500 block">{t('pos.stats.searchResults')}</span>
            <span className="text-lg font-black text-gray-950 block mt-2">{filteredProducts.length}</span>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 text-right">
            <span className="text-[10px] font-bold text-gray-500 block">{t('pos.stats.cartUnits')}</span>
            <span className="text-lg font-black text-indigo-600 block mt-2">{cartUnits}</span>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 text-right">
            <span className="text-[10px] font-bold text-gray-500 block">{t('pos.stats.lowStockInView')}</span>
            <span className="text-lg font-black text-amber-500 block mt-2">{filteredLowStockCount}</span>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 text-right">
            <span className="text-[10px] font-bold text-gray-500 block">{t('pos.stats.quickProducts')}</span>
            <span className="text-lg font-black text-sky-600 block mt-2">{bestSellerProducts.length}</span>
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px] pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Grid className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-gray-950 dark:text-zinc-50 font-bold mb-1">{t('pos.emptySearch.title')}</h4>
              <p className="text-xs text-gray-500 max-w-xs">{t('pos.emptySearch.description')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= settings.lowStockAlertQty;
                
                return (
                  <button
                    id={`pos-product-${p.id}`}
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`relative flex flex-col text-right glass-card rounded-2xl p-3 hover-lift h-[180px] justify-between group overflow-hidden cursor-pointer ${
                      isOutOfStock
                        ? 'border-rose-100 bg-rose-50/10 opacity-55 cursor-not-allowed'
                        : isLowStock
                        ? 'border-amber-200 hover:border-amber-400'
                        : 'border-slate-100/50 hover:border-indigo-200'
                    }`}
                  >
                    {/* Visual Labels / Warners */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                      {isOutOfStock ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded-md">{t('pos.stockBadge.outOfStock')}</span>
                      ) : isLowStock ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded-md flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> {t('pos.stockBadge.unit', { count: p.stock })}
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-sm">
                          {t('pos.stockBadge.wafraCount', { count: p.stock })}
                        </span>
                      )}
                    </div>

                    {/* Image / Icon Selector Placeholder */}
                    <div className="h-20 w-full bg-slate-50 dark:bg-zinc-800/60 rounded-xl overflow-hidden mb-2.5 relative flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                      ) : (
                        <ShoppingCart className="h-6 w-6 text-gray-300 dark:text-zinc-600" />
                      )}
                    </div>

                    {/* Product Name & Category label */}
                    <div className="space-y-0.5 max-w-full">
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate font-semibold leading-none">{p.category}</p>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate w-full leading-tight">{p.name}</h4>
                    </div>

                    {/* Unit Cost */}
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-xs font-semibold text-indigo-600 font-mono">
                        {p.price.toFixed(2)} <span className="text-[10px] font-sans font-normal text-gray-500">{settings.currencySymbol}</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono tracking-wider">{p.barcode}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Left side: Interactive Shopping Cart (5 Column equivalent desktop display) */}
      <div className="w-full glass-card-strong rounded-2xl flex flex-col max-h-[800px] xl:max-h-[calc(100vh-8rem)] xl:sticky xl:top-24 self-start">
        
        {/* Cart top header info */}
        <div className="p-4 border-b border-gray-100/50 flex justify-between items-center gradient-primary-soft rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">{t('pos.cart.title')}</h3>
          </div>
          {cart.length > 0 && (
            <Button
              id="clear-pos-cart-btn"
              variant="danger"
              size="sm"
              onClick={clearCart}
              leftIcon={<Trash2 className="h-3 w-3" />}
              className="!h-8 !px-2.5 text-[10px]"
            >
              {t('pos.cart.clearCart')}
            </Button>
          )}
        </div>

        {/* Cart Item rows list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-400">
              <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                <ShoppingCart className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-xs">{t('pos.cart.emptyTitle')}</p>
              <p className="text-[9px] text-gray-500 mt-1">{t('pos.cart.emptyHint')}</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800/70 group relative">
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">{item.product.name}</h5>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                    {item.product.price.toFixed(2)} ر.س × {t('pos.stockBadge.unit', { count: item.quantity })}
                  </p>
                </div>

                {/* Counter controls */}
                <div className="flex items-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700/80 rounded-lg p-1">
                  <Button
                    id={`cart-minus-${item.product.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => updateCartQuantity(item.product.id, -1)}
                    className="!min-w-[28px] !h-7 !px-1"
                    aria-label={t('pos.cart.decreaseQty')}
                  >
                    <Minus className="h-3.5 w-3.5 text-gray-600 dark:text-zinc-400" />
                  </Button>
                  <span className="font-mono text-xs font-bold px-2.5 text-zinc-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <Button
                    id={`cart-plus-${item.product.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => updateCartQuantity(item.product.id, 1)}
                    className="!min-w-[28px] !h-7 !px-1"
                    aria-label={t('pos.cart.increaseQty')}
                  >
                    <Plus className="h-3.5 w-3.5 text-gray-600 dark:text-zinc-400" />
                  </Button>
                </div>

                {/* Subtotal cost display */}
                <div className="text-right pe-1">
                  <span className="text-xs font-mono font-black text-gray-900 dark:text-white block">
                    {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    id={`cart-remove-${item.product.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.product.id)}
                    className="!h-6 !min-w-[40px] !px-0 text-[10px] text-rose-500 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    {t('common.actions.delete')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic Discount / Tax input modifiers */}
        {cart.length > 0 && (
          <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/10 border-t border-gray-105 dark:border-zinc-800 space-y-3 shrink-0 text-right">
            
            {/* Discount selector mode */}
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 shrink-0"><Percent className="h-4 w-4" /> {t('pos.cart.discountsAvailable')}</span>
              <SegmentedControl
                size="sm"
                value={usePercentDiscount ? 'percent' : 'flat'}
                onChange={(v) => setUsePercentDiscount(v === 'percent')}
                options={[
                  { value: 'percent', label: t('pos.cart.discountPercent') },
                  { value: 'flat', label: t('pos.cart.discountAmount') },
                ]}
              />
            </div>

            {usePercentDiscount ? (
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 5, 10, 15].map((p) => (
                  <button
                    id={`discount-pct-${p}`}
                    key={p}
                    onClick={() => setDiscountPercent(p)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-colors border cursor-pointer ${
                      discountPercent === p
                        ? 'bg-blue-600 text-white border-transparent shadow-sm'
                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
                    }`}
                  >
                    {p === 0 ? t('pos.cart.discountNone') : `${p}%`}
                  </button>
                ))}
              </div>
            ) : (
              <NumberField
                id="pos-flat-discount-val"
                min={0}
                max={cartSubtotal}
                step={0.01}
                value={manualDiscount}
                onValueChange={(v) => setManualDiscount(Number.isNaN(v) ? 0 : Math.max(0, v))}
                placeholder={t('pos.cart.flatDiscountPlaceholder')}
                className="text-xs"
              />
            )}
          </div>
        )}

        {/* Totals panel & primary actions */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-3 bg-gray-50 dark:bg-zinc-850/50 rounded-b-2xl shrink-0 text-right">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600 dark:text-zinc-400">
              <span>{t('pos.cart.subtotal')}:</span>
              <span className="font-mono">{cartSubtotal.toFixed(2)} ر.س</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-600 font-bold">
                <span>{t('pos.cart.discountsTotal')}</span>
                <span className="font-mono">-{discountAmount.toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600 dark:text-zinc-400">
              <span>{t('pos.cart.tax')} ({settings.taxPercentage}%):</span>
              <span className="font-mono">{calculatedTax.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm text-gray-900 dark:text-zinc-100 font-black pt-2 border-t border-gray-200 dark:border-zinc-700">
              <span>{t('pos.cart.total')}:</span>
              <span className="font-mono text-zinc-950 dark:text-white text-base">
                {cartTotal.toFixed(2)} {settings.currencySymbol}
              </span>
            </div>
          </div>

          {/* Checkout Big Button */}
          <Button
            id="checkout-cart-trigger-btn"
            variant="primary"
            size="lg"
            fullWidth
            disabled={cart.length === 0}
            onClick={prepareCheckout}
            leftIcon={<ShieldCheck className="h-5 w-5" />}
          >
            {t('pos.cart.checkoutBtn')}
          </Button>
        </div>

      </div>

      {/* Pay Mode Overlays */}
      {checkoutPriceModal && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-lg glass-card-strong rounded-2xl p-6 relative text-right modal-content" style={{ direction: 'rtl' }}>
            
            {/* Header info */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-indigo-100/30">
              <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <CreditCard className="h-4.5 w-4.5 text-white" />
                </div>
                {t('pos.checkout.title')}
              </h3>
              <Button
                id="close-checkout-modal-btn"
                variant="ghost"
                size="sm"
                onClick={() => setCheckoutPriceModal(false)}
                aria-label={t('pos.checkout.closeLabel')}
                className="!h-8 !min-w-[36px] !px-2 text-gray-400 hover:text-gray-600 dark:text-zinc-400 text-lg"
              >
                ×
              </Button>
            </div>

            {/* Price Display */}
            <div className="gradient-primary-soft p-4 rounded-xl text-center mb-4 border border-indigo-100/30">
              <p className="text-xs text-gray-500">{t('pos.checkout.totalDue')}</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white font-mono mt-1">
                {cartTotal.toFixed(2)} <span className="text-sm font-sans font-normal">{settings.currencySymbol}</span>
              </h2>
            </div>

            {/* Choice of Payment Method */}
            <div className="mb-5 space-y-2">
              <label className="text-xs font-bold text-gray-600 dark:text-zinc-400 leading-none">{t('pos.checkout.choosePayment')}</label>
              <div className="grid grid-cols-3 gap-3">
                
                {/* Cash */}
                <button
                  id="pay-method-cash-btn"
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3.5 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover-scale ${
                    paymentMethod === 'cash'
                      ? 'gradient-primary text-white border-transparent shadow-md'
                      : 'glass-card text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  <Trash2 className="h-5 w-5 rotate-45" /> {/* simple bill outline mock */}
                  <span className="text-xs font-bold">{t('pos.checkout.cashFull')}</span>
                </button>

                {/* Card */}
                <button
                  id="pay-method-card-btn"
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3.5 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover-scale ${
                    paymentMethod === 'card'
                      ? 'gradient-primary text-white border-transparent shadow-md'
                      : 'glass-card text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-bold">{t('pos.checkout.cardFull')}</span>
                </button>

                {/* Mobile Pay */}
                <button
                  id="pay-method-mobile-btn"
                  type="button"
                  onClick={() => setPaymentMethod('mobile')}
                  className={`py-3.5 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover-scale ${
                    paymentMethod === 'mobile'
                      ? 'gradient-primary text-white border-transparent shadow-md'
                      : 'glass-card text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs font-bold">{t('pos.checkout.mobileFull')}</span>
                </button>

              </div>
            </div>

            {/* Dynamic Cash Calculator */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 mb-5 py-3 border-t border-b border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{t('pos.checkout.cashPaidByCustomer')}</span>
                  <span className="text-xs font-mono font-bold text-sky-600">{t('pos.checkout.amountRequired', { total: cartTotal.toFixed(2) })}</span>
                </div>
                
                <input
                  id="checkout-cash-given-input"
                  type="number"
                  placeholder={t('pos.checkout.cashInputPlaceholder')}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  inputMode="decimal"
                  className="input-premium w-full bg-slate-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-lg"
                />

                {/* Quick note buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map((note) => (
                    <Button
                      id={`note-hint-${note}`}
                      key={note}
                      variant="secondary"
                      size="sm"
                      onClick={() => setCashReceived(note.toString())}
                      className="!h-8 !px-2.5 text-xs"
                    >
                      {note} ر.س
                    </Button>
                  ))}
                  <Button
                    id="note-hint-exact"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCashReceived(cartTotal.toFixed(2))}
                    className="!h-8 !px-2.5 text-xs !bg-sky-50 dark:!bg-sky-950 !text-sky-600 !border-sky-100"
                  >
                    {t('pos.checkout.exact')}
                  </Button>
                </div>

                {/* Change calculator display */}
                {parseFloat(cashReceived) >= cartTotal && (
                  <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900 text-xs">
                    <span>{t('pos.checkout.changeDueCustomer')}</span>
                    <span className="font-mono font-black text-sm">{changeDue.toFixed(2)} ر.س</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                id="cancel-checkout-submit-btn"
                variant="ghost"
                size="md"
                onClick={() => setCheckoutPriceModal(false)}
              >
                {t('pos.checkout.continueShopping')}
              </Button>
              <Button
                id="confirm-checkout-submit-btn"
                variant="primary"
                size="md"
                onClick={handleCheckoutSubmit}
              >
                {t('pos.checkout.confirmAndPrint')}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
