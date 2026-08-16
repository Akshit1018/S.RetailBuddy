export type ThemeMode = "dark" | "light";

export type UserRole =
  | "maker"
  | "checker"
  | "accountant"
  | "owner"
  | "salesman"
  | "hr";

export type VerificationStatus = "pending" | "checked" | "verified";

export type PaymentStatus = "paid" | "pending" | "overdue" | "ledger";

export type StockBucket = "current" | "reorder" | "near_expiry" | "expired";

export type SellMode = "bill" | "product" | "barcode" | "list";

export type AttendanceStatus = "present" | "absent" | "half" | "leave";

export type DiscountMode = "none" | "all" | "category" | "product";

export type ShopKind = "kirana" | "pharmacy" | "general";

export type GstScheme = "regular" | "composition" | "unregistered";

export type PayChannel = "cash" | "upi";

export type PfType = "pf" | "non_pf";

export type BillFormat =
  | "retail"
  | "tax_invoice"
  | "bill_of_supply"
  | "invoice_cum_bos"
  | "receipt_voucher"
  | "refund_voucher"
  | "payment_voucher"
  | "self_invoice"
  | "delivery_challan"
  | "credit_note"
  | "debit_note"
  | "e_invoice"
  | "e_way"
  | "estimate";

export interface StaffPerms {
  viewStock: boolean;
  stockIn: boolean;
  stockOut: boolean;
  sell: boolean;
  whatsapp: boolean;
  collectPay: boolean;
  discountMode: DiscountMode;
  discountMaxPct: number;
  discountProductIds: string[];
  discountCategories: string[];
}

export interface AttendanceDay {
  date: string;
  status: AttendanceStatus;
  inAt?: string | null;
  outAt?: string | null;
}

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  shopName: string | null;
  roles: UserRole[];
  isGuest: boolean;
  createdAt: string;
  phoneVerified?: boolean;
  avatarDataUrl?: string | null;
  salary?: number | null;
  isOwner?: boolean;
  staffPerms?: StaffPerms;
  attendance?: AttendanceDay[];
  payMode?: PayChannel;
  pfType?: PfType;
  jobTitle?: string;
}

export interface PayLink {
  id: string;
  token: string;
  saleId: string | null;
  amount: number;
  customerPhone: string | null;
  createdByProfileId: string | null;
  createdAt: string;
  remark?: string | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  quantity: number;
  pendingQuantity: number;
  unitCost: number;
  unitPrice: number;
  mrp: number | null;
  expiryDate: string | null;
  batchNo: string | null;
  barcode: string | null;
  reorderLevel: number;
  lastUpdated: string;
  hsn?: string | null;
  gstRate?: number;
  supplierId?: string | null;
}

export interface LineItem {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  codeGenerated: boolean;
  expiryDate?: string | null;
  batchNo?: string | null;
  mrp?: number | null;
  hsn?: string | null;
  gstRate?: number;
}

export interface CustomerSnapshot {
  customerNo: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
}

export interface Invoice {
  id: string;
  kind: "stock_in" | "stock_out";
  invoiceNo?: string | null;
  supplier?: string | null;
  supplierId?: string | null;
  billDate?: string | null;
  imageDataUrl?: string | null;
  rawText?: string | null;
  lines: LineItem[];
  totalCost: number;
  totalSale?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  gstTotal?: number;
  status: VerificationStatus;
  createdAt: string;
  createdByProfileId?: string | null;
  createdByName?: string | null;
  createdByRoles?: UserRole[];
  checkedByProfileId?: string | null;
  checkedByName?: string | null;
  checkedAt?: string | null;
  verifiedByProfileId?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  sellMode?: SellMode;
  saleId?: string | null;
  customerId?: string | null;
  customerSnapshot?: CustomerSnapshot | null;
}

export interface Customer {
  id: string;
  customerNo: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  creditLimit?: number | null;
  gstin?: string | null;
  stateCode?: string | null;
}

export interface SaleLine {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  hsn?: string | null;
  gstRate?: number;
  expiryDate?: string | null;
  batchNo?: string | null;
}

export interface PaymentEntry {
  id: string;
  amount: number;
  note: string | null;
  at: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  paidAt: string | null;
  paidAmount: number;
  note?: string | null;
}

export interface SaleRecord {
  id: string;
  billNo: string;
  invoiceId?: string;
  mode: SellMode;
  lines: SaleLine[];
  totalRevenue: number;
  totalCost: number;
  profit: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  gstTotal?: number;
  imageDataUrl?: string | null;
  soldByProfileId: string | null;
  soldByName: string | null;
  soldByRoles: UserRole[];
  customerId: string | null;
  customerSnapshot: CustomerSnapshot | null;
  createdAt: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  paymentUpdatedAt: string | null;
  lastPaymentCheckAt: string | null;
  nextDueDate?: string | null;
  monthlyInstallment?: number | null;
  ledgerNote?: string | null;
  ledgerActive: boolean;
  payments: PaymentEntry[];
  discountPct?: number;
  discountAmount?: number;
  orderRemark?: string | null;
  voiceRemarkDataUrl?: string | null;
  paymentProofDataUrl?: string | null;
  paymentProofAt?: string | null;
  payLinkToken?: string | null;
  billFormats?: BillFormat[];
  installments?: Installment[];
  irn?: string | null;
  ewbNo?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  notes: string | null;
  lastBillNo: string | null;
  lastBillDate: string | null;
  lastAmount: number;
  dueAmount: number;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  noteNo: string;
  saleId: string | null;
  billNo: string | null;
  reason: string;
  lines: Array<{
    productId?: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  createdAt: string;
  createdByName: string | null;
}

export interface DayClose {
  id: string;
  date: string;
  salesCount: number;
  cash: number;
  upi: number;
  credit: number;
  returns: number;
  gross: number;
  note: string | null;
  closedAt: string;
  closedByName: string | null;
}

export interface SalarySlip {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basic: number;
  pfEmployee: number;
  pfEmployer: number;
  netPay: number;
  channel: PayChannel;
  pfType: PfType;
  paidAt: string | null;
  createdAt: string;
}

export interface MonthClose {
  id: string;
  month: string;
  scheme: GstScheme;
  salesTotal: number;
  purchaseTotal: number;
  gstOut: number;
  gstIn: number;
  cash: number;
  upi: number;
  credit: number;
  salaries: number;
  note: string | null;
  closedAt: string;
  closedByName: string | null;
  pin: string | null;
}

export type AppLocale =
  | "en"
  | "hi"
  | "mr"
  | "gu"
  | "ta"
  | "bn"
  | "te"
  | "kn"
  | "ml"
  | "pa"
  | "es"
  | "ar";

export interface ShopSettings {
  nearExpiryDays: number;
  defaultReorderLevel: number;
  overdueDays: number;
  enforceCreditLimit: boolean;
  defaultCreditLimit: number;
  stateCode: string;
  offlineQueueEnabled: boolean;
  shopKind: ShopKind;
  gstScheme: GstScheme;
  expiryAlertDays: number[];
  caPhone: string | null;
  caPin: string | null;
  defaultBillFormats: BillFormat[];
  salaryPfRate: number;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  nearExpiryDays: 30,
  defaultReorderLevel: 10,
  overdueDays: 1,
  enforceCreditLimit: true,
  defaultCreditLimit: 5000,
  stateCode: "08",
  offlineQueueEnabled: true,
  shopKind: "kirana",
  gstScheme: "regular",
  expiryAlertDays: [30, 60, 90],
  caPhone: null,
  caPin: "1234",
  defaultBillFormats: ["tax_invoice", "retail"],
  salaryPfRate: 12,
};

export interface AppState {
  theme: ThemeMode;
  locale: AppLocale;
  onboardingDone: boolean;
  welcomeDismissed: boolean;
  splashSeen: boolean;
  aiEnabled: boolean;
  profiles: Profile[];
  activeProfileId: string | null;
  products: Product[];
  invoices: Invoice[];
  sales: SaleRecord[];
  customers: Customer[];
  customerSeq: number;
  paymentQrDataUrl: string | null;
  upiId: string | null;
  staffPinHash: string | null;
  shopCode: string;
  payLinks: PayLink[];
  suppliers: Supplier[];
  returns: CreditNote[];
  dayCloses: DayClose[];
  voiceHints: boolean;
  shop: ShopCard;
  shopOrders: ShopOrder[];
  leads: Lead[];
  waTemplates: WaTemplate[];
  settings: ShopSettings;
  shopDataVersion: number;
  demoSyncedAt: string | null;
  salarySlips: SalarySlip[];
  monthCloses: MonthClose[];
  noticeReadIds: string[];
  expiryPopupOn: string | null;
}

export interface ShopCard {
  name: string;
  tagline: string;
  address: string;
  city: string;
  hours: string;
  phone: string;
  whatsapp: string;
  mapsUrl: string;
  gstin: string;
  about: string;
  logoDataUrl: string | null;
  coverHue: number;
  showPrices: boolean;
  showOutOfStock: boolean;
}

export type ShopOrderStatus = "new" | "accepted" | "billed" | "cancelled";

export interface ShopOrderLine {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ShopOrder {
  id: string;
  token: string;
  customerName: string;
  customerPhone: string;
  note: string;
  fulfillment: "pickup" | "delivery";
  lines: ShopOrderLine[];
  total: number;
  status: ShopOrderStatus;
  saleId: string | null;
  createdAt: string;
  source: "shop" | "paste";
}

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: LeadStatus;
  note: string;
  value: number;
  createdAt: string;
  lastTouchAt: string;
}

export interface WaTemplate {
  id: string;
  name: string;
  body: string;
}
