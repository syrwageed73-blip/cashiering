import { Product, Category, StoreSettings } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'المواد الغذائية' },
  { id: '2', name: 'المشروبات' },
  { id: '3', name: 'الحلويات والمقرمشات' },
  { id: '4', name: 'المنظفات والعناية' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    barcode: '6281001',
    name: 'حليب طازج المراعي 1 لتر',
    price: 6.50,
    stock: 12,
    category: 'المواد الغذائية',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p2',
    barcode: '6281002',
    name: 'أرز بسمتي الشعلان 5 كجم',
    price: 48.00,
    stock: 3, // Low stock (triggers warning because threshold is 5)
    category: 'المواد الغذائية',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p3',
    barcode: '6281003',
    name: 'زيت دوار الشمس عافية 1.5 لتر',
    price: 19.50,
    stock: 8,
    category: 'المواد الغذائية',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p4',
    barcode: '6281004',
    name: 'مياه معدنية نوفا 24×330 مل',
    price: 15.00,
    stock: 20,
    category: 'المشروبات',
    image: 'https://images.unsplash.com/photo-1608885898957-a599fb1698d6?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p5',
    barcode: '6281005',
    name: 'كوكاكولا علبة 320 مل',
    price: 3.00,
    stock: 40,
    category: 'المشروبات',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p6',
    barcode: '6281006',
    name: 'صابون غسيل هيد آند شولدرز 400 مل',
    price: 18.50,
    stock: 0, // Out of stock
    category: 'المنظفات والعناية',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p7',
    barcode: '6281007',
    name: 'شيبس ليز بالفلفل الحار عائلي',
    price: 7.00,
    stock: 18,
    category: 'الحلويات والمقرمشات',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'p8',
    barcode: '6281008',
    name: 'شوكولاتة جالكسي الحليب 40 جم',
    price: 4.50,
    stock: 25,
    category: 'الحلويات والمقرمشات',
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=150&auto=format&fit=crop&q=60'
  }
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'سوبرماركت التجزئة الحديث',
  storeLogo: 'store', // can match select list of lucide icon keys
  address: 'المملكة العربية السعودية، الرياض، شارع التخصصي',
  phoneNumber: '966500000000',
  receiptFooter: 'شكراً لزيارتكم! الفاتورة مستند ضريبي معتمد.',
  currencySymbol: 'ر.س',
  taxPercentage: 15,
  lowStockAlertQty: 5
};
