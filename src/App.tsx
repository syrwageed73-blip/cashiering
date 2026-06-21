import { useState, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product, Category, Invoice, StoreSettings, StockLog, CartItem, AppStatePayload, UserRole } from './types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, DEFAULT_SETTINGS } from './initialData';
import { fetchAppState, saveAppState } from './api';
import { useDirection } from './i18n/useDirection';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Modular view widgets
import { AuthScreen } from './components/AuthScreen';
import { PasswordRecoveryScreen } from './components/PasswordRecoveryScreen';
import { POSView } from './components/POSView';
import { ProductsView } from './components/ProductsView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { BackupView } from './components/BackupView';
import { CustomConfirm } from './components/CustomConfirm';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Button } from './components/ui';

// Premium icons
import { Store, Monitor, HelpCircle, Package, ShieldCheck, ClipboardList, BarChart3, Settings, Database, Keyboard, X, Maximize, Minimize, Moon, Sun, type LucideIcon } from 'lucide-react';

type ViewKey = 'pos' | 'products' | 'inventory' | 'reports' | 'settings' | 'backup';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const ROLE_VIEW_ACCESS: Record<UserRole, ViewKey[]> = {
  admin: ['pos', 'products', 'inventory', 'reports', 'settings', 'backup'],
  cashier: ['pos'],
};

const DEFAULT_ROLE: UserRole = 'cashier';

const isViewKey = (value: string): value is ViewKey =>
  ['pos', 'products', 'inventory', 'reports', 'settings', 'backup'].includes(value);

const createSeedState = (): AppStatePayload => ({
  products: INITIAL_PRODUCTS.map((product) => ({ ...product })),
  categories: INITIAL_CATEGORIES.map((category) => ({ ...category })),
  invoices: [],
  settings: { ...DEFAULT_SETTINGS },
  stockLogs: [],
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  useDirection();

  // --- Auth Context (session, role, profile managed externally) ---
  const { session, role, userProfile, isAuthLoading, isProfileLoading, authView, hasSupabaseConfig, signOut } = useAuth();

  // --- 1. State Orchestration & Persistent Engine ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeView, setActiveView] = useState<ViewKey>('pos');
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_theme');
    return saved === 'dark';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  // Auth state is now managed by AuthContext (useAuth hook above)
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Fullscreen support state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error enabling fullscreen mode:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error exiting fullscreen mode:', err);
      });
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Reusable confirmation overlay state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });

  // Theme state managed via isDarkTheme

  // Dynamic Time Clock RTL
  const [systemTimeStr, setSystemTimeStr] = useState<string>('');

  const navItems: Array<{
    key: ViewKey;
    label: string;
    shortLabel: string;
    description: string;
    icon: LucideIcon;
    accentClass: string;
  }> = [
    {
      key: 'pos',
      label: t('nav.pos.label'),
      shortLabel: t('nav.pos.shortLabel'),
      description: t('nav.pos.description'),
      icon: Monitor,
      accentClass: 'from-indigo-600 via-blue-600 to-cyan-500'
    },
    {
      key: 'products',
      label: t('nav.products.label'),
      shortLabel: t('nav.products.shortLabel'),
      description: t('nav.products.description'),
      icon: Package,
      accentClass: 'from-fuchsia-600 via-violet-600 to-indigo-600'
    },
    {
      key: 'inventory',
      label: t('nav.inventory.label'),
      shortLabel: t('nav.inventory.shortLabel'),
      description: t('nav.inventory.description'),
      icon: ClipboardList,
      accentClass: 'from-emerald-600 via-teal-600 to-cyan-600'
    },
    {
      key: 'reports',
      label: t('nav.reports.label'),
      shortLabel: t('nav.reports.shortLabel'),
      description: t('nav.reports.description'),
      icon: BarChart3,
      accentClass: 'from-amber-500 via-orange-500 to-rose-500'
    },
    {
      key: 'settings',
      label: t('nav.settings.label'),
      shortLabel: t('nav.settings.shortLabel'),
      description: t('nav.settings.description'),
      icon: Settings,
      accentClass: 'from-slate-700 via-slate-800 to-indigo-700'
    },
    {
      key: 'backup',
      label: t('nav.backup.label'),
      shortLabel: t('nav.backup.shortLabel'),
      description: t('nav.backup.description'),
      icon: Database,
      accentClass: 'from-sky-600 via-blue-600 to-indigo-600'
    }
  ];

  const currentRole = role;
  const accessibleViews = ROLE_VIEW_ACCESS[currentRole];

  const changeView = (view: ViewKey) => {
    navigate(`/app/${view}`);
  };

  const applyAppState = (nextState: AppStatePayload) => {
    setProducts(nextState.products);
    setCategories(nextState.categories);
    setInvoices(nextState.invoices);
    setSettings(nextState.settings);
    setStockLogs(nextState.stockLogs);
  };

  const buildAppState = (overrides: Partial<AppStatePayload> = {}): AppStatePayload => ({
    products: overrides.products ?? products,
    categories: overrides.categories ?? categories,
    invoices: overrides.invoices ?? invoices,
    settings: overrides.settings ?? settings,
    stockLogs: overrides.stockLogs ?? stockLogs,
  });

  const totalInventoryUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStockCount = products.filter(product => product.stock > 0 && product.stock <= (product.lowStockAlert || settings.lowStockAlertQty)).length;
  const outOfStockCount = products.filter(product => product.stock <= 0).length;
  const todayDateKey = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(invoice => invoice.datetime.startsWith(todayDateKey));
  const todaySales = todayInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const monthlyInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.datetime);
    const now = new Date();
    return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
  });
  const activeNavItem = navItems.find(item => item.key === activeView) || navItems[0];
  const activeViewSummary: Record<ViewKey, { eyebrow: string; title: string; stats: Array<{ label: string; value: string }> }> = {
    pos: {
      eyebrow: t('viewSummary.pos.eyebrow'),
      title: t('viewSummary.pos.title'),
      stats: [
        { label: t('viewSummary.pos.statAvailableProducts'), value: products.length.toString() },
        { label: t('viewSummary.pos.statCartUnits'), value: cart.reduce((sum, item) => sum + item.quantity, 0).toString() },
        { label: t('viewSummary.pos.statTodayInvoices'), value: todayInvoices.length.toString() }
      ]
    },
    products: {
      eyebrow: t('viewSummary.products.eyebrow'),
      title: t('viewSummary.products.title'),
      stats: [
        { label: t('viewSummary.products.statTotalItems'), value: products.length.toString() },
        { label: t('viewSummary.products.statCategories'), value: categories.length.toString() },
        { label: t('viewSummary.products.statOutOfStock'), value: outOfStockCount.toString() }
      ]
    },
    inventory: {
      eyebrow: t('viewSummary.inventory.eyebrow'),
      title: t('viewSummary.inventory.title'),
      stats: [
        { label: t('viewSummary.inventory.statTotalUnits'), value: totalInventoryUnits.toString() },
        { label: t('viewSummary.inventory.statLowStock'), value: lowStockCount.toString() },
        { label: t('viewSummary.inventory.statMovements'), value: stockLogs.length.toString() }
      ]
    },
    reports: {
      eyebrow: t('viewSummary.reports.eyebrow'),
      title: t('viewSummary.reports.title'),
      stats: [
        { label: t('viewSummary.reports.statTotalInvoices'), value: invoices.length.toString() },
        { label: t('viewSummary.reports.statTodaySales'), value: `${todaySales.toFixed(2)} ${settings.currencySymbol}` },
        { label: t('viewSummary.reports.statMonthInvoices'), value: monthlyInvoices.length.toString() }
      ]
    },
    settings: {
      eyebrow: t('viewSummary.settings.eyebrow'),
      title: t('viewSummary.settings.title'),
      stats: [
        { label: t('viewSummary.settings.statStoreName'), value: settings.storeName },
        { label: t('viewSummary.settings.statTax'), value: `${settings.taxPercentage}%` },
        { label: t('viewSummary.settings.statAlertThreshold'), value: t('pos.stockBadge.unit', { count: settings.lowStockAlertQty }) }
      ]
    },
    backup: {
      eyebrow: t('viewSummary.backup.eyebrow'),
      title: t('viewSummary.backup.title'),
      stats: [
        { label: t('viewSummary.backup.statItems'), value: products.length.toString() },
        { label: t('viewSummary.backup.statInvoices'), value: invoices.length.toString() },
        { label: t('viewSummary.backup.statMovements'), value: stockLogs.length.toString() }
      ]
    }
  };

  // Apply theme to document
  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pos_theme', 'light');
    }
  }, [isDarkTheme]);

  // Live timer tick
  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      setSystemTimeStr(now.toLocaleTimeString('ar-SA'));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Keyboard binding for help (F1)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
        // Reset confirm states on Esc
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/app')) {
      return;
    }

    const routeView = location.pathname.split('/')[2];
    if (!routeView || !isViewKey(routeView)) {
      return;
    }

    if (!accessibleViews.includes(routeView)) {
      navigate(`/app/${accessibleViews[0]}`, { replace: true });
      return;
    }

    setActiveView(routeView);
  }, [accessibleViews, location.pathname, navigate]);


  // --- 2. Action Handlers ---

  // Custom toast push notifier
  const addToast = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().substring(2, 5);
    setToasts(prev => [...prev, { id, text, type }]);
    
    // Auto erase toast after 3.8s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const syncAppState = (nextState: AppStatePayload) => {
    const previousState = buildAppState();
    applyAppState(nextState);

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await saveAppState(nextState);
      })
      .catch(async (error) => {
        console.error('Failed to persist app state:', error);

        try {
          const remoteState = await fetchAppState();
          if (remoteState) {
            applyAppState(remoteState);
            setCart([]);
          } else {
            applyAppState(previousState);
          }
        } catch (reloadError) {
          console.error('Failed to restore app state after save error:', reloadError);
          applyAppState(previousState);
        }

        addToast(error instanceof Error ? error.message : t('app.errors.syncFailed'), 'error');
      });
  };

  // Auth bootstrap & profile loading are now handled by AuthContext.

  useEffect(() => {
    if (isAuthLoading) return;

    if (authView === 'recovery') {
      setIsDataLoading(false);
      return;
    }

    if (session && (isProfileLoading || !userProfile)) {
      return;
    }

    if (!session) {
      applyAppState(createSeedState());
      setCart([]);
      setIsDataLoading(false);
      return;
    }

    let isMounted = true;
    setIsDataLoading(true);

    void (async () => {
      try {
        let remoteState = await fetchAppState();

        if (!remoteState) {
          const seedState = createSeedState();
          try {
            remoteState = await saveAppState(seedState);
          } catch (error) {
            console.error('Failed to seed remote state:', error);
            remoteState = seedState;
          }
        }

        if (!isMounted) return;
        applyAppState(remoteState);
        setCart([]);
      } catch (error) {
        console.error('Failed to load remote state:', error);
        if (!isMounted) return;
        applyAppState(createSeedState());
        setCart([]);
        addToast(t('app.errors.dataLoadFailed'), 'error');
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authView, isAuthLoading, isProfileLoading, session?.user.id, userProfile?.role]);

  const handleSignOut = async () => {
    await signOut();
    setCart([]);
    applyAppState(createSeedState());
    navigate('/login', { replace: true });
  };

  const handleRecoveryComplete = () => {
    navigate('/login', { replace: true });
  };

  // Simple CustomConfirm wrapper
  const openConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' | 'success' = 'warning'
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Create unique billing invoice numbers: e.g. INV-031201 (incremental sequence + index)
  const generateInvoiceNumber = (): string => {
    const sequence = (invoices.length + 1).toString().padStart(6, '0');
    return `INV-${sequence}`;
  };

  // SALE COMPLETE (POST TO DB + INVENTORY REDUCTION)
  const handleCheckoutComplete = (
    paymentMethod: 'cash' | 'card' | 'mobile',
    discountAmount: number,
    cashPaid: number
  ) => {
    if (cart.length === 0) return;

    // A. Calculate billing metrics
    const subtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
    const taxableTotal = Math.max(0, subtotal - discountAmount);
    const calculatedTax = taxableTotal * (settings.taxPercentage / 100);
    const finalTotal = taxableTotal + calculatedTax;

    const uniqueNo = generateInvoiceNumber();
    const currentDateTime = new Date().toISOString();

    const invoiceItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      barcode: item.product.barcode,
      subtotal: item.product.price * item.quantity
    }));

    // B. Assemble Invoice Document
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: uniqueNo,
      datetime: currentDateTime,
      items: invoiceItems,
      subtotal,
      discount: discountAmount,
      tax: calculatedTax,
      total: finalTotal,
      paymentMethod,
      cashGiven: paymentMethod === 'cash' ? cashPaid : undefined,
      changeGiven: paymentMethod === 'cash' ? Math.max(0, cashPaid - finalTotal) : undefined
    };

    // C. Recompile Products Catalog Stock & Log Actions
    const updatedProductsList = [...products];
    const newStockLogs = [...stockLogs];

    cart.forEach((cartItem) => {
      const prodIdx = updatedProductsList.findIndex(p => p.id === cartItem.product.id);
      if (prodIdx > -1) {
        // Reduct stock safely
        updatedProductsList[prodIdx].stock = Math.max(0, updatedProductsList[prodIdx].stock - cartItem.quantity);
        
        // Push stock ledger audit log for each sold item
        newStockLogs.unshift({
          id: Date.now().toString() + Math.random().toString().substring(2, 6),
          productId: cartItem.product.id,
          productName: cartItem.product.name,
          barcode: cartItem.product.barcode,
          type: 'sale',
          quantity: cartItem.quantity,
          datetime: currentDateTime,
          notes: `فاتورة مبيعات برقم ${uniqueNo}`
        });
      }
    });

    // D. Write actions to database
    syncAppState(buildAppState({
      products: updatedProductsList,
      invoices: [newInvoice, ...invoices],
      stockLogs: newStockLogs,
    }));

    // E. Flush and reset cart indicators
    setCart([]);
    addToast(t('app.toasts.saleSuccess', { invoiceNo: uniqueNo }), 'success');

    // Trigger autofocus on scanner field safely
    setTimeout(() => {
      const scanInput = document.getElementById('barcode-scanner-input');
      scanInput?.focus();
    }, 100);
  };

  // SHIFT / UNSUBMIT INVOICE WITH AUTOMATIC STOCK RETRIEVAL SYSTEM
  const handleDeleteInvoice = (invoiceId: string) => {
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) return;

    // Reconstruct catalog stocks and remove logs
    const updatedProductsList = [...products];
    const newStockLogs = [...stockLogs];

    targetInvoice.items.forEach((item) => {
      const prodIdx = updatedProductsList.findIndex(p => p.id === item.productId);
      if (prodIdx > -1) {
        // Return stock units safely
        updatedProductsList[prodIdx].stock += item.quantity;
        
        // Push log entries documenting returning units
        newStockLogs.unshift({
          id: Date.now().toString() + Math.random().toString().substring(2, 6),
          productId: item.productId,
          productName: item.name,
          barcode: item.barcode,
          type: 'add',
          quantity: item.quantity,
          datetime: new Date().toISOString(),
          notes: `إرجاع كميات بسبب حذف العقد للفاتورة ${targetInvoice.invoiceNumber}`
        });
      }
    });

    // Delete invoice document
    const finalInvoices = invoices.filter(inv => inv.id !== invoiceId);

    syncAppState(buildAppState({
      products: updatedProductsList,
      invoices: finalInvoices,
      stockLogs: newStockLogs,
    }));
  };

  // DIRECT CATALOG EDIT AND LOG CREATION
  const handleAddNewProduct = (newProd: Omit<Product, 'id'>) => {
    const id = Date.now().toString();
    const compiled: Product = { ...newProd, id };
    const newList = [...products, compiled];
    
    // Create inventory audit log for this insertion
    const newLog: StockLog = {
      id: Date.now().toString() + '-init',
      productId: id,
      productName: newProd.name,
      barcode: newProd.barcode,
      type: 'add',
      quantity: newProd.stock,
      datetime: new Date().toISOString(),
      notes: 'إضافة صنف جديد كلياً إلى قاعدة البيانات'
    };

    syncAppState(buildAppState({
      products: newList,
      stockLogs: [newLog, ...stockLogs],
    }));
  };

  const handleEditProduct = (updatedProd: Product) => {
    const oldProd = products.find(p => p.id === updatedProd.id);
    const newList = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    
    // Log stock changes if quantities were shifted manually during edit-operation
    let finalLogs = [...stockLogs];
    if (oldProd && oldProd.stock !== updatedProd.stock) {
      const delta = updatedProd.stock - oldProd.stock;
      finalLogs.unshift({
        id: Date.now().toString() + '-edit',
        productId: updatedProd.id,
        productName: updatedProd.name,
        barcode: updatedProd.barcode,
        type: delta > 0 ? 'add' : 'subtract',
        quantity: Math.abs(delta),
        datetime: new Date().toISOString(),
        notes: `تحديث كميات مباشرة من نافذة تعديل بيانات الأصناف`
      });
    }

    syncAppState(buildAppState({
      products: newList,
      stockLogs: finalLogs,
    }));
  };

  const handleDeleteProduct = (productId: string) => {
    const newList = products.filter(p => p.id !== productId);
    syncAppState(buildAppState({ products: newList }));
  };

  // DIRECT BULK STOCK ADJUSTMENT
  const handleAdjustStock = (
    productId: string,
    delta: number,
    type: 'add' | 'subtract' | 'adjust',
    notes: string
  ) => {
    const updatedProductsList = [...products];
    const prodIdx = updatedProductsList.findIndex(p => p.id === productId);
    if (prodIdx === -1) return;

    const oldStock = updatedProductsList[prodIdx].stock;
    let computedNewStock = oldStock;

    if (type === 'add') {
      computedNewStock += delta;
    } else if (type === 'subtract') {
      computedNewStock = Math.max(0, oldStock - delta);
    } else if (type === 'adjust') {
      computedNewStock = delta;
    }

    updatedProductsList[prodIdx].stock = computedNewStock;

    // Push log entries safely
    const logDelta = type === 'adjust' ? Math.abs(computedNewStock - oldStock) : delta;
    const logType = type === 'adjust' ? (computedNewStock >= oldStock ? 'add' : 'subtract') : type;

    const newLog: StockLog = {
      id: Date.now().toString() + '-direct',
      productId,
      productName: updatedProductsList[prodIdx].name,
      barcode: updatedProductsList[prodIdx].barcode,
      type: logType,
      quantity: logDelta,
      datetime: new Date().toISOString(),
      notes
    };

    syncAppState(buildAppState({
      products: updatedProductsList,
      stockLogs: [newLog, ...stockLogs],
    }));
  };

  // RESTORE FULL DB FROM BACKUP FILES
  const handleImportBackup = (imported: {
    products: Product[];
    categories: Category[];
    invoices: Invoice[];
    settings: StoreSettings;
    stockLogs: StockLog[];
  }) => {
    syncAppState({
      products: imported.products,
      categories: imported.categories,
      invoices: imported.invoices,
      settings: imported.settings,
      stockLogs: imported.stockLogs,
    });
    setCart([]); // reset current basket
  };


  // --- 3. View Switcher Compilation ---
  const renderActiveComponent = () => {
    switch (activeView) {
      case 'pos':
        return (
          <ProtectedRoute allowedRoles={['admin', 'cashier']} fallbackPath="/app/pos">
            <POSView
              products={products}
              categories={categories}
              settings={settings}
              cart={cart}
              setCart={setCart}
              addToast={addToast}
              onCheckoutComplete={handleCheckoutComplete}
            />
          </ProtectedRoute>
        );
      case 'products':
        return (
          <ProtectedRoute allowedRoles={['admin']} fallbackPath="/app/pos" showAccessDenied>
            <ProductsView
              products={products}
              categories={categories}
              settings={settings}
              addToast={addToast}
              onAddProduct={handleAddNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              openConfirm={openConfirmDialog}
            />
          </ProtectedRoute>
        );
      case 'inventory':
        return (
          <ProtectedRoute allowedRoles={['admin']} fallbackPath="/app/pos" showAccessDenied>
            <InventoryView
              products={products}
              settings={settings}
              stockLogs={stockLogs}
              onAdjustStock={handleAdjustStock}
              addToast={addToast}
            />
          </ProtectedRoute>
        );
      case 'reports':
        return (
          <ProtectedRoute allowedRoles={['admin']} fallbackPath="/app/pos" showAccessDenied>
            <ReportsView
              invoices={invoices}
              products={products}
              settings={settings}
              canManageInvoices={currentRole === 'admin'}
              onDeleteInvoice={handleDeleteInvoice}
              openConfirm={openConfirmDialog}
              addToast={addToast}
            />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute allowedRoles={['admin']} fallbackPath="/app/pos" showAccessDenied>
            <SettingsView
              settings={settings}
              onSaveSettings={(updatedSet) => {
                syncAppState(buildAppState({ settings: updatedSet }));
              }}
              addToast={addToast}
            />
          </ProtectedRoute>
        );
      case 'backup':
        return (
          <ProtectedRoute allowedRoles={['admin']} fallbackPath="/app/pos" showAccessDenied>
            <BackupView
              products={products}
              categories={categories}
              invoices={invoices}
              settings={settings}
              stockLogs={stockLogs}
              onImportBackup={handleImportBackup}
              openConfirm={openConfirmDialog}
              addToast={addToast}
            />
          </ProtectedRoute>
        );
    }
  };

  const loadingScreen = (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.16),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#f0f9ff_100%)] flex items-center justify-center p-6 dark:bg-[#0f0f1a]">
      <div className="app-shell-bg" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>
      <div className="glass-card-strong rounded-[28px] p-8 text-center relative z-10 max-w-md w-full">
        <div className="w-12 h-12 mx-auto rounded-2xl gradient-primary animate-pulse" />
        <h2 className="mt-5 text-lg font-black text-gray-950 dark:text-slate-100">
          {isAuthLoading ? t('app.loading.authCheck') : t('app.loading.dataLoad')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          {isAuthLoading
            ? t('app.loading.authDesc')
            : t('app.loading.dataDesc')}
        </p>
      </div>
    </div>
  );

  const appShell = (
    <div className="min-h-screen flex flex-col transition-colors relative">
      <div className="app-shell-bg" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>
      
      {/* 1. Premium Header with Glassmorphism */}
      <header className="glass-header sticky top-0 z-[1000] shrink-0 px-4 py-3.5 md:px-5 xl:px-8 print:hidden select-none">
        <div className="mx-auto flex w-full max-w-[1720px] flex-wrap items-center justify-between gap-4 xl:gap-6">
          
          {/* Brand Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-md animate-fade-in">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">{t('app.brand')}</h1>
              <p className="text-[10px] font-bold text-indigo-500">v2.4 • {activeNavItem.label}</p>
            </div>
          </div>

          {/* Quick Actions & Clock */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 xl:max-w-[60%]">
            <span className="hidden lg:inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/70 px-3 py-2 rounded-xl border border-white/70 shadow-sm dark:text-slate-300 dark:bg-white/10 dark:border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {session?.user.email}
            </span>
            <span className="hidden lg:inline-flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-3 py-2 rounded-xl border border-indigo-100/50 shadow-sm capitalize dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20">
              {currentRole === 'admin' ? t('app.roles.admin') : t('app.roles.cashier')}
            </span>
            
            {/* Dynamic Clock */}
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono font-bold text-xs text-indigo-700 bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-100/50 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {systemTimeStr}
            </span>

            {/* Dark Theme Toggle */}
            <Button
              id="theme-toggle-btn"
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkTheme(prev => !prev)}
              title={isDarkTheme ? 'الوضع الفاتح' : 'الوضع الداكن'}
              aria-label="Toggle theme"
              leftIcon={
                isDarkTheme ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />
              }
              className="bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-gray-500 dark:text-indigo-300 hover:text-indigo-600 hover:shadow-sm"
            >
              <span className="hidden md:inline">{isDarkTheme ? 'فاتح' : 'داكن'}</span>
            </Button>

            {/* Fullscreen */}
            <Button
              id="window-fullscreen-toggle"
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={t('app.header.fullscreen')}
              aria-label={t('app.header.fullscreen')}
              leftIcon={
                isFullscreen ? <Minimize className="h-4 w-4 text-indigo-500" /> : <Maximize className="h-4 w-4 text-indigo-500" />
              }
              className="bg-white/60 border border-gray-200/50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 hover:shadow-sm"
            >
              <span className="hidden md:inline">{isFullscreen ? t('app.header.exitFullscreen') : t('app.header.fullscreen')}</span>
            </Button>

            {/* Shortcuts */}
            <Button
              id="help-shortcuts-trigger"
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              title={t('app.header.shortcutsTitle')}
              aria-label={t('app.header.shortcutsLabel')}
              leftIcon={<Keyboard className="h-4.5 w-4.5" />}
              className="bg-white/60 border border-gray-200/50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 hover:shadow-sm"
            >
              <span className="hidden md:inline">{t('app.header.shortcuts')}</span>
            </Button>

            <Button
              id="sign-out-trigger"
              variant="ghost"
              size="sm"
              onClick={() => {
                void handleSignOut();
              }}
              title={t('app.header.signOutTitle')}
              aria-label={t('app.header.signOutLabel')}
              leftIcon={<ShieldCheck className="h-4.5 w-4.5" />}
              className="bg-white/60 border border-gray-200/50 hover:bg-rose-50 text-rose-500 hover:text-rose-600 hover:shadow-sm"
            >
              <span className="hidden md:inline">{t('app.header.signOut')}</span>
            </Button>

            {installPrompt && (
              <Button
                id="install-app-trigger"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleInstallApp();
                }}
                className="bg-white/60 border border-gray-200/50 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 hover:shadow-sm"
              >
                <span className="hidden md:inline">تثبيت التطبيق</span>
                <span className="md:hidden">تثبيت</span>
              </Button>
            )}

          </div>

        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1720px] flex-1 flex-col gap-5 p-4 pb-24 md:p-5 md:pb-5 xl:flex-row xl:items-start xl:gap-6 xl:px-8 xl:pb-8 print:p-0">
        
        {/* Premium Sidebar */}
        {accessibleViews.length > 1 && (
          <aside className="hidden md:flex w-[250px] xl:w-[290px] glass-sidebar p-4 rounded-2xl flex-col justify-between shrink-0 print:hidden select-none animate-fade-in xl:sticky xl:top-[5.75rem] xl:max-h-[calc(100vh-7.25rem)] xl:overflow-y-auto">
            <div className="space-y-1 text-right">
              <span className="text-[9px] font-black tracking-[0.15em] text-indigo-400/70 mb-3 block leading-none px-3 uppercase">{t('app.sidebar.gateways')}</span>
              
              {navItems.filter((tab) => accessibleViews.includes(tab.key)).map((tab) => {
                const TabIcon = tab.icon;
                return (
                <button
                  id={`side-menu-tab-${tab.key}`}
                  key={tab.key}
                  onClick={() => changeView(tab.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeView === tab.key
                      ? 'sidebar-item-active font-bold'
                      : 'sidebar-item-inactive text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <TabIcon className="h-4 w-4 sidebar-icon" />
                  <span>{tab.label}</span>
                  {activeView === tab.key && (
                    <span className="mr-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-80"></span>
                  )}
                </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-100/30 dark:border-indigo-500/20 text-[10px] text-gray-400 text-center leading-relaxed">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></span>
                <span className="font-bold text-emerald-600">{t('app.sidebar.connected')}</span>
              </div>
              <p className="text-gray-400">{t('app.sidebar.storeProtected')}</p>
              <p className="font-sans text-[9px] mt-0.5 text-gray-300">{t('app.sidebar.versionProtected')}</p>
            </div>
          </aside>
        )}

        {/* Main Content Stage */}
        <main className="flex-1 min-w-0 flex flex-col animate-fade-in-up xl:min-h-0">
          <section className="view-hero-card glass-card-strong rounded-[28px] p-5 md:p-6 mb-5 overflow-hidden">
            <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
              <div className="max-w-3xl text-right">
                <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-indigo-700/80 bg-white/70 border border-white/70 px-3 py-1.5 rounded-full uppercase dark:bg-white/10 dark:text-indigo-300 dark:border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {activeViewSummary[activeView].eyebrow}
                </span>
                <div className="mt-4 flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeNavItem.accentClass} text-white shadow-lg flex items-center justify-center shrink-0`}>
                    <activeNavItem.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-950 leading-tight dark:text-slate-100">{activeNavItem.label}</h2>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-2xl dark:text-slate-400">{activeNavItem.description}</p>
                    <p className="text-xs text-indigo-700/80 mt-3 font-bold">{activeViewSummary[activeView].title}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 xl:min-w-[460px] 2xl:min-w-[540px]">
                {activeViewSummary[activeView].stats.map((stat) => (
                  <div key={stat.label} className="hero-stat-card rounded-2xl p-4 text-right">
                    <span className="text-[10px] font-bold text-gray-500 block leading-none dark:text-slate-400">{stat.label}</span>
                    <span className="text-sm md:text-base font-black text-gray-950 mt-2 block break-words dark:text-slate-100">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {renderActiveComponent()}
        </main>

      </div>

      {accessibleViews.length > 1 && (
        <nav className="md:hidden mobile-bottom-nav print:hidden">
          <div className={`grid gap-2 ${accessibleViews.length <= 2 ? 'grid-cols-2' : 'grid-cols-6'}`}>
            {navItems.filter((item) => accessibleViews.includes(item.key)).map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeView === item.key;

              return (
                <button
                  id={`mobile-nav-tab-${item.key}`}
                  key={item.key}
                  type="button"
                  onClick={() => changeView(item.key)}
                  className={`mobile-nav-button ${isActive ? 'mobile-nav-button-active' : 'mobile-nav-button-inactive'}`}
                >
                  <ItemIcon className="h-4 w-4" />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* --- 4. Toast Indicator Panels --- */}
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* --- 5. Generic HTML5 Confirmation dialogs stack --- */}
      <CustomConfirm
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* --- 6. Helper Keyboard shortcuts modal overlays --- */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 modal-backdrop select-none">
          <div className="w-full max-w-md glass-card-strong rounded-2xl p-6 relative text-right modal-content" style={{ direction: 'rtl' }}>
            
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-indigo-100/30">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2 dark:text-slate-100">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <HelpCircle className="h-4.5 w-4.5 text-white" />
                </div>
                {t('app.shortcuts.title')}
              </h3>
              <Button
                id="close-shortcuts-modal"
                variant="ghost"
                size="sm"
                onClick={() => setShortcutsOpen(false)}
                aria-label={t('app.shortcuts.closeLabel')}
                className="!w-8 !h-8 !min-w-[32px] !px-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-xs text-gray-700 dark:text-slate-300">
              {[
                { label: t('app.shortcuts.barcodeFocus'), key: 'F2' },
                { label: t('app.shortcuts.checkout'), key: 'F4' },
                { label: t('app.shortcuts.clearCart'), key: 'F8' },
                { label: t('app.shortcuts.toggleHelp'), key: 'F1' },
                { label: t('app.shortcuts.closeDialog'), key: 'Esc' }
              ].map((shortcut, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-indigo-50/50 transition-colors border-b border-gray-100/50 last:border-0 dark:hover:bg-indigo-500/10 dark:border-slate-700/50">
                  <span>{shortcut.label}</span>
                  <kbd className="px-2.5 py-1 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg font-mono font-bold text-indigo-600 text-[11px] border border-gray-200/80 shadow-sm dark:from-slate-800 dark:to-slate-700 dark:border-slate-600 dark:text-indigo-400">{shortcut.key}</kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-indigo-100/20 text-[10px] text-gray-400 leading-relaxed dark:border-indigo-500/20 dark:text-slate-500">
              {t('app.shortcuts.footnote')}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                id="close-shortcuts-dialog-done"
                variant="dark"
                size="md"
                onClick={() => setShortcutsOpen(false)}
                className="text-xs"
              >
                {t('app.shortcuts.understood')}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  if (isAuthLoading || (session && authView !== 'recovery' && (isProfileLoading || isDataLoading))) {
    return loadingScreen;
  }

  const defaultAppPath = role === 'admin' && accessibleViews.includes('reports') 
    ? '/app/reports' 
    : `/app/${accessibleViews[0]}`;
  const loginConfigError = hasSupabaseConfig
    ? undefined
    : t('app.errors.supabaseConfig');

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to={authView === 'recovery' ? '/reset-password' : defaultAppPath} replace /> : <AuthScreen configError={loginConfigError} />}
      />
      <Route
        path="/reset-password"
        element={session && authView === 'recovery' ? <PasswordRecoveryScreen onDone={handleRecoveryComplete} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/app"
        element={session ? (authView === 'recovery' ? <Navigate to="/reset-password" replace /> : <Navigate to={defaultAppPath} replace />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/app/:view"
        element={session ? (authView === 'recovery' ? <Navigate to="/reset-password" replace /> : appShell) : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to={session ? (authView === 'recovery' ? '/reset-password' : defaultAppPath) : '/login'} replace />} />
      <Route path="*" element={<Navigate to={session ? (authView === 'recovery' ? '/reset-password' : defaultAppPath) : '/login'} replace />} />
    </Routes>
  );
}
