export type Lang = 'en' | 'ar-eg';

export const DEFAULT_LANG: Lang = 'en';

export function normalizeLang(v?: string | null): Lang {
  const s = (v || '').toLowerCase().trim();
  if (s === 'ar' || s === 'ar-eg' || s === 'ar_eg' || s === 'ar-egypt') return 'ar-eg';
  return 'en';
}

export function dirForLang(lang: Lang): 'ltr' | 'rtl' {
  return lang === 'ar-eg' ? 'rtl' : 'ltr';
}

type Dict = Record<string, string>;

const en: Dict = {
  langName: 'English',
  langSwitch: 'Language',
  login: 'Login',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  logout: 'Log out',
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  dailyRevenue: 'Daily revenue',
  totalRevenueAllTime: 'Total revenue (all time)',
  todayRevenue: "Today's revenue",
  openBookings: 'Open bookings',
  openOrders: 'Open orders',
  requests: 'Requests',
  bookings: 'Bookings',
  desks: 'Desks',
  menuItems: 'Menu items',
  users: 'Users',
  dbTools: 'DB tools',
  smsTools: 'SMS',
  save: 'Save',
  setAllHourlyRates: 'Set hourly rate for ALL desks',
  hourlyRate: 'Hourly rate',
  runDbPush: 'Push schema to DB',
  runDbReset: 'Reset DB (danger)',
  runSeed: 'Seed demo data',
  enableDbToolsHint: 'Set ENABLE_DB_TOOLS=true in backend .env to enable these buttons.',
  sendTestSms: 'Send test SMS',
  adminPhone: 'Admin phone',
  message: 'Message',
};

// Egyptian Arabic (colloquial). Keep it readable for customers.
const arEG: Dict = {
  langName: 'عربي (مصر)',
  langSwitch: 'اللغة',
  login: 'تسجيل الدخول',
  email: 'الإيميل',
  password: 'كلمة السر',
  signIn: 'دخول',
  logout: 'تسجيل خروج',
  dashboard: 'لوحة التحكم',
  analytics: 'الإحصائيات',
  dailyRevenue: 'إيراد يومي',
  totalRevenueAllTime: 'إجمالي الإيراد (من البداية)',
  todayRevenue: 'إيراد النهارده',
  openBookings: 'حجوزات مفتوحة',
  openOrders: 'طلبات مفتوحة',
  requests: 'الطلبات',
  bookings: 'الحجوزات',
  desks: 'المكاتب',
  menuItems: 'المنتجات',
  users: 'المستخدمين',
  dbTools: 'أدوات قاعدة البيانات',
  smsTools: 'رسائل SMS',
  save: 'حفظ',
  setAllHourlyRates: 'تعيين سعر الساعة لكل المكاتب',
  hourlyRate: 'سعر الساعة',
  runDbPush: 'تطبيق الـ Schema على قاعدة البيانات',
  runDbReset: 'مسح وإعادة تهيئة الداتا (خطر)',
  runSeed: 'تحميل داتا تجريبية',
  enableDbToolsHint: 'فعّل ENABLE_DB_TOOLS=true في ملف backend .env علشان الأزرار تشتغل.',
  sendTestSms: 'إرسال SMS تجريبي',
  adminPhone: 'موبايل الأدمن',
  message: 'الرسالة',
};

export const DICTS: Record<Lang, Dict> = {
  en,
  'ar-eg': arEG,
};

export function t(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
}
