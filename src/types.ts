export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string; // Data URL or URL helper
  lowStockAlert?: number; // Custom threshold if configured on product level
}

export interface Category {
  id: string;
  name: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
  subtotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  datetime: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  cashGiven?: number;
  changeGiven?: number;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  type: 'sale' | 'add' | 'subtract' | 'adjust';
  quantity: number;
  datetime: string;
  notes: string;
}

export interface StoreSettings {
  storeName: string;
  storeLogo: string; // Dynamic base64 or SVG icon selector
  address: string;
  phoneNumber: string;
  receiptFooter: string;
  currencySymbol: string;
  taxPercentage: number;
  lowStockAlertQty: number;
}

export interface AppStatePayload {
  products: Product[];
  categories: Category[];
  invoices: Invoice[];
  settings: StoreSettings;
  stockLogs: StockLog[];
}

export type UserRole = 'admin' | 'cashier';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}
