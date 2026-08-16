import type {
  CreditNote,
  Customer,
  DayClose,
  Invoice,
  Lead,
  Product,
  Profile,
  SaleRecord,
  SalarySlip,
  ShopOrder,
  Supplier,
} from "@/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "@/lib/types";
import { defaultShop, defaultTemplates } from "@/lib/shop-defaults";
import { defaultStaffPerms, todayKey } from "@/lib/staff";
import { ymd } from "@/lib/installments";
import { currentMonth } from "@/lib/salary";

export const DEMO_STAFF_IDS = {
  maker: "staff_ramesh",
  checker: "staff_priya",
  accountant: "staff_amit",
  hr: "staff_sunita",
} as const;

export const DEMO_UPI = "sharmakirana@upi";

function atDaysAgo(days: number, hour = 10, minute = 20): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateDaysAgo(days: number): string {
  return atDaysAgo(days).slice(0, 10);
}

function sampleAttendance(presentBias = 0.8): Profile["attendance"] {
  const days: NonNullable<Profile["attendance"]> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0) continue;
    const key = d.toISOString().slice(0, 10);
    const roll = (i * 17 + presentBias * 10) % 10;
    const status =
      roll < 7 ? "present" : roll < 8 ? "half" : roll < 9 ? "leave" : "absent";
    days.push({
      date: key,
      status,
      inAt: status === "present" || status === "half" ? `${key}T09:05:00.000Z` : null,
      outAt: status === "present" ? `${key}T18:10:00.000Z` : null,
    });
  }
  const today = todayKey();
  if (!days.some((x) => x.date === today)) {
    days.push({ date: today, status: "present", inAt: null, outAt: null });
  }
  return days;
}

export function makeGuestProfile(id = "guest_demo"): Profile {
  return {
    id,
    name: "Guest",
    phone: null,
    shopName: "Sharma Kirana",
    roles: ["maker", "checker", "accountant"],
    isGuest: true,
    createdAt: atDaysAgo(20),
    isOwner: true,
    staffPerms: defaultStaffPerms(["maker", "checker", "accountant"]),
    salary: null,
    avatarDataUrl: null,
    attendance: [],
    payMode: "cash",
    pfType: "non_pf",
    jobTitle: "Owner (guest)",
  };
}

export function demoStaffProfiles(): Profile[] {
  return [
    {
      id: DEMO_STAFF_IDS.maker,
      name: "Ramesh",
      phone: "9000000001",
      shopName: "Sharma Kirana",
      roles: ["maker"],
      isGuest: false,
      createdAt: atDaysAgo(18),
      salary: 12000,
      avatarDataUrl: null,
      isOwner: false,
      staffPerms: defaultStaffPerms(["maker"]),
      attendance: sampleAttendance(0.85),
      payMode: "cash",
      pfType: "non_pf",
      jobTitle: "Salesman",
    },
    {
      id: DEMO_STAFF_IDS.checker,
      name: "Priya",
      phone: "9000000002",
      shopName: "Sharma Kirana",
      roles: ["checker"],
      isGuest: false,
      createdAt: atDaysAgo(18),
      salary: 18000,
      avatarDataUrl: null,
      isOwner: true,
      staffPerms: defaultStaffPerms(["checker"]),
      attendance: sampleAttendance(0.9),
      payMode: "upi",
      pfType: "non_pf",
      jobTitle: "Shop owner",
    },
    {
      id: DEMO_STAFF_IDS.accountant,
      name: "Amit",
      phone: "9000000003",
      shopName: "Sharma Kirana",
      roles: ["accountant"],
      isGuest: false,
      createdAt: atDaysAgo(18),
      salary: 22000,
      avatarDataUrl: null,
      isOwner: true,
      staffPerms: defaultStaffPerms(["accountant"]),
      attendance: sampleAttendance(0.75),
      payMode: "upi",
      pfType: "pf",
      jobTitle: "Accountant",
    },
    {
      id: DEMO_STAFF_IDS.hr,
      name: "Sunita",
      phone: "9000000004",
      shopName: "Sharma Kirana",
      roles: ["hr"],
      isGuest: false,
      createdAt: atDaysAgo(18),
      salary: 15000,
      avatarDataUrl: null,
      isOwner: false,
      staffPerms: defaultStaffPerms(["hr"]),
      attendance: sampleAttendance(0.88),
      payMode: "cash",
      pfType: "pf",
      jobTitle: "HR",
    },
  ];
}

export function mergeDemoStaff(profiles: Profile[]): Profile[] {
  const staff = demoStaffProfiles();
  const next = [...profiles];
  for (const p of staff) {
    if (!next.some((x) => x.id === p.id)) next.push(p);
  }
  return next;
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: "prod_seed_1",
    code: "AMUL-TAZ-1L",
    name: "Amul Taaza Toned Milk 1L",
    quantity: 42,
    pendingQuantity: 0,
    unitCost: 52,
    unitPrice: 62,
    mrp: 66,
    expiryDate: "2026-08-18",
    batchNo: "AM2408",
    barcode: "8901262010014",
    reorderLevel: 20,
    lastUpdated: atDaysAgo(0, 8, 5),
    hsn: "0401",
    gstRate: 5,
    supplierId: "sup_seed_2",
  },
  {
    id: "prod_seed_2",
    code: "TATA-SALT-1K",
    name: "Tata Salt Iodized 1kg",
    quantity: 113,
    pendingQuantity: 30,
    unitCost: 22,
    unitPrice: 28,
    mrp: 30,
    expiryDate: "2027-06-01",
    batchNo: "TS1124",
    barcode: "8901042951913",
    reorderLevel: 30,
    lastUpdated: atDaysAgo(1, 11, 0),
    hsn: "2501",
    gstRate: 5,
    supplierId: "sup_seed_1",
  },
  {
    id: "prod_seed_3",
    code: "MAGGI-2M-70",
    name: "Maggi 2-Minute Noodles 70g",
    quantity: 5,
    pendingQuantity: 0,
    unitCost: 12,
    unitPrice: 16,
    mrp: 18,
    expiryDate: "2027-01-15",
    batchNo: "MG9082",
    barcode: "8901058001234",
    reorderLevel: 40,
    lastUpdated: atDaysAgo(0, 9, 10),
    hsn: "1902",
    gstRate: 5,
    supplierId: "sup_seed_1",
  },
  {
    id: "prod_seed_4",
    code: "FORT-OIL-1L",
    name: "Fortune Sunlite Refined Oil 1L",
    quantity: 32,
    pendingQuantity: 0,
    unitCost: 145,
    unitPrice: 168,
    mrp: 175,
    expiryDate: "2027-03-10",
    batchNo: "FO3310",
    barcode: "8901030865123",
    reorderLevel: 15,
    lastUpdated: atDaysAgo(0, 10, 40),
    hsn: "1507",
    gstRate: 5,
    supplierId: "sup_seed_1",
  },
  {
    id: "prod_seed_5",
    code: "YOG-CUP-200",
    name: "Mother Dairy Curd 200g",
    quantity: 12,
    pendingQuantity: 0,
    unitCost: 18,
    unitPrice: 25,
    mrp: 28,
    expiryDate: "2026-07-01",
    batchNo: "MD0701",
    barcode: "8901207001234",
    reorderLevel: 20,
    lastUpdated: atDaysAgo(12, 9, 0),
    hsn: "0403",
    gstRate: 5,
    supplierId: "sup_seed_2",
  },
  {
    id: "prod_seed_6",
    code: "BISC-OREO-120",
    name: "Oreo Vanilla Cream 120g",
    quantity: 24,
    pendingQuantity: 24,
    unitCost: 28,
    unitPrice: 40,
    mrp: 45,
    expiryDate: "2027-02-01",
    batchNo: "OR2201",
    barcode: "8901058900999",
    reorderLevel: 24,
    lastUpdated: atDaysAgo(0, 8, 40),
    hsn: "1905",
    gstRate: 5,
    supplierId: "sup_seed_1",
  },
  {
    id: "prod_med_crocin_a",
    code: "CROCIN-500",
    name: "Crocin Advance 500mg (15s)",
    quantity: 18,
    pendingQuantity: 0,
    unitCost: 28,
    unitPrice: 34,
    mrp: 36,
    expiryDate: "2026-09-08",
    batchNo: "CR2508A",
    barcode: "8901138512345",
    reorderLevel: 10,
    lastUpdated: atDaysAgo(2, 9, 0),
    hsn: "3004",
    gstRate: 12,
    supplierId: "sup_seed_3",
  },
  {
    id: "prod_med_crocin_b",
    code: "CROCIN-500",
    name: "Crocin Advance 500mg (15s)",
    quantity: 24,
    pendingQuantity: 0,
    unitCost: 28,
    unitPrice: 34,
    mrp: 36,
    expiryDate: "2027-03-01",
    batchNo: "CR2703B",
    barcode: "8901138512345",
    reorderLevel: 10,
    lastUpdated: atDaysAgo(2, 9, 0),
    hsn: "3004",
    gstRate: 12,
    supplierId: "sup_seed_3",
  },
  {
    id: "prod_med_dolo",
    code: "DOLO-650",
    name: "Dolo 650 Tablet (15s)",
    quantity: 14,
    pendingQuantity: 0,
    unitCost: 26,
    unitPrice: 32,
    mrp: 33,
    expiryDate: "2026-10-08",
    batchNo: "DL2610",
    barcode: "8901138516789",
    reorderLevel: 8,
    lastUpdated: atDaysAgo(5, 11, 0),
    hsn: "3004",
    gstRate: 12,
    supplierId: "sup_seed_3",
  },
  {
    id: "prod_med_combi",
    code: "COMBI-400",
    name: "Combiflam Tablet (20s)",
    quantity: 9,
    pendingQuantity: 0,
    unitCost: 38,
    unitPrice: 48,
    mrp: 49,
    expiryDate: "2026-11-02",
    batchNo: "CF2611",
    barcode: "8901138519990",
    reorderLevel: 6,
    lastUpdated: atDaysAgo(8, 10, 0),
    hsn: "3004",
    gstRate: 12,
    supplierId: "sup_seed_3",
  },
  {
    id: "prod_med_ors",
    code: "ORS-21",
    name: "Electral ORS Sachet",
    quantity: 40,
    pendingQuantity: 0,
    unitCost: 18,
    unitPrice: 24,
    mrp: 25,
    expiryDate: "2027-06-01",
    batchNo: "OR2706",
    barcode: "8901138520001",
    reorderLevel: 20,
    lastUpdated: atDaysAgo(3, 8, 20),
    hsn: "3004",
    gstRate: 12,
    supplierId: "sup_seed_3",
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust_seed_1",
    customerNo: "C-1001",
    name: "Ravi Kirana",
    whatsapp: "9876543210",
    phone: "9876543210",
    address: "MI Road, Jaipur",
    notes: "Weekly Maggi carton",
    createdAt: atDaysAgo(30),
    creditLimit: 8000,
    gstin: null,
    stateCode: "08",
  },
  {
    id: "cust_seed_2",
    customerNo: "C-1002",
    name: "Sita General Store",
    whatsapp: "9123456780",
    phone: "9123456780",
    address: "Malviya Nagar",
    notes: null,
    createdAt: atDaysAgo(20),
    creditLimit: 3000,
    gstin: null,
    stateCode: "08",
  },
  {
    id: "cust_seed_3",
    customerNo: "C-1003",
    name: "Mohan Tea Stall",
    whatsapp: "9988776655",
    phone: "9988776655",
    address: "Raja Park",
    notes: "Pays every Saturday",
    createdAt: atDaysAgo(14),
    creditLimit: 2000,
    gstin: null,
    stateCode: "08",
  },
];

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: "sup_seed_1",
    name: "Metro Wholesale Pvt Ltd",
    phone: "01414001001",
    gstin: "08AABCM1234F1Z5",
    address: "Sitapura, Jaipur",
    notes: "Main FMCG",
    lastBillNo: "INV-MET-8901",
    lastBillDate: dateDaysAgo(1),
    lastAmount: 660,
    dueAmount: 1332,
    createdAt: atDaysAgo(40),
  },
  {
    id: "sup_seed_2",
    name: "Jaipur Dairy Co-op",
    phone: "01412223344",
    gstin: "08AADCJ7788K1Z2",
    address: "Tonk Road",
    notes: "Milk & curd",
    lastBillNo: "JD-441",
    lastBillDate: dateDaysAgo(3),
    lastAmount: 1248,
    dueAmount: 0,
    createdAt: atDaysAgo(40),
  },
  {
    id: "sup_seed_3",
    name: "MedPlus Distributors",
    phone: "01415551212",
    gstin: "08AADCM4411Q1Z8",
    address: "Jhotwara, Jaipur",
    notes: "Medicines — FIFO / expiry",
    lastBillNo: "MP-2201",
    lastBillDate: dateDaysAgo(5),
    lastAmount: 2140,
    dueAmount: 800,
    createdAt: atDaysAgo(30),
  },
];

function snap(
  c: Customer,
): NonNullable<SaleRecord["customerSnapshot"]> {
  return {
    customerNo: c.customerNo,
    name: c.name,
    whatsapp: c.whatsapp,
    phone: c.phone,
    address: c.address,
    gstin: c.gstin,
    stateCode: c.stateCode,
  };
}

export function seedInvoices(): Invoice[] {
  const ramesh = DEMO_STAFF_IDS.maker;
  const priya = DEMO_STAFF_IDS.checker;
  const amit = DEMO_STAFF_IDS.accountant;
  return [
    {
      id: "inv_demo_pending",
      kind: "stock_in",
      invoiceNo: "INV-MET-9012",
      supplier: "Metro Wholesale Pvt Ltd",
      supplierId: "sup_seed_1",
      billDate: dateDaysAgo(0),
      imageDataUrl: null,
      rawText: "METRO WHOLESALE\nINV-MET-9012\nOreo Vanilla 24 x 28",
      lines: [
        {
          id: "il_oreo",
          productCode: "BISC-OREO-120",
          productName: "Oreo Vanilla Cream 120g",
          quantity: 24,
          unitCost: 28,
          unitPrice: 40,
          codeGenerated: false,
          expiryDate: "2027-02-01",
          batchNo: "OR2201",
          mrp: 45,
          hsn: "1905",
          gstRate: 5,
        },
      ],
      totalCost: 672,
      totalSale: 960,
      taxableAmount: 640,
      cgst: 16,
      sgst: 16,
      gstTotal: 32,
      status: "pending",
      createdAt: atDaysAgo(0, 8, 40),
      createdByProfileId: ramesh,
      createdByName: "Ramesh",
      createdByRoles: ["maker"],
      notes: "Morning carton — waiting for Priya to check",
    },
    {
      id: "inv_demo_checked",
      kind: "stock_in",
      invoiceNo: "INV-MET-8901",
      supplier: "Metro Wholesale Pvt Ltd",
      supplierId: "sup_seed_1",
      billDate: dateDaysAgo(1),
      imageDataUrl: null,
      rawText: "METRO\nINV-MET-8901\nTata Salt 30 x 22",
      lines: [
        {
          id: "il_salt",
          productCode: "TATA-SALT-1K",
          productName: "Tata Salt Iodized 1kg",
          quantity: 30,
          unitCost: 22,
          unitPrice: 28,
          codeGenerated: false,
          expiryDate: "2027-06-01",
          batchNo: "TS1124",
          mrp: 30,
          hsn: "2501",
          gstRate: 5,
        },
      ],
      totalCost: 660,
      totalSale: 840,
      taxableAmount: 628.57,
      cgst: 15.71,
      sgst: 15.71,
      gstTotal: 31.43,
      status: "checked",
      createdAt: atDaysAgo(1, 11, 0),
      createdByProfileId: ramesh,
      createdByName: "Ramesh",
      createdByRoles: ["maker"],
      checkedByProfileId: priya,
      checkedByName: "Priya",
      checkedAt: atDaysAgo(1, 16, 10),
      notes: "Checked — Amit to verify",
    },
    {
      id: "inv_demo_verified",
      kind: "stock_in",
      invoiceNo: "JD-441",
      supplier: "Jaipur Dairy Co-op",
      supplierId: "sup_seed_2",
      billDate: dateDaysAgo(3),
      imageDataUrl: null,
      rawText: "JAIPUR DAIRY\nJD-441\nAmul Taaza 24 x 52",
      lines: [
        {
          id: "il_amul",
          productCode: "AMUL-TAZ-1L",
          productName: "Amul Taaza Toned Milk 1L",
          quantity: 24,
          unitCost: 52,
          unitPrice: 62,
          codeGenerated: false,
          expiryDate: "2026-08-18",
          batchNo: "AM2408",
          mrp: 66,
          hsn: "0401",
          gstRate: 5,
        },
      ],
      totalCost: 1248,
      totalSale: 1488,
      taxableAmount: 1188.57,
      cgst: 29.71,
      sgst: 29.71,
      gstTotal: 59.43,
      status: "verified",
      createdAt: atDaysAgo(3, 9, 15),
      createdByProfileId: ramesh,
      createdByName: "Ramesh",
      createdByRoles: ["maker"],
      checkedByProfileId: priya,
      checkedByName: "Priya",
      checkedAt: atDaysAgo(3, 12, 0),
      verifiedByProfileId: amit,
      verifiedByName: "Amit",
      verifiedAt: atDaysAgo(3, 17, 40),
    },
  ];
}

export function seedSales(): SaleRecord[] {
  const ravi = SEED_CUSTOMERS[0]!;
  const sita = SEED_CUSTOMERS[1]!;
  const mohan = SEED_CUSTOMERS[2]!;
  const ramesh = DEMO_STAFF_IDS.maker;

  const saleTodayPaid: SaleRecord = {
    id: "sale_demo_today_paid",
    billNo: "SS-1044",
    invoiceId: "inv_sale_1044",
    mode: "product",
    lines: [
      {
        productId: "prod_seed_3",
        productCode: "MAGGI-2M-70",
        productName: "Maggi 2-Minute Noodles 70g",
        quantity: 2,
        unitCost: 12,
        unitPrice: 16,
        hsn: "1902",
        gstRate: 5,
      },
      {
        productId: "prod_seed_2",
        productCode: "TATA-SALT-1K",
        productName: "Tata Salt Iodized 1kg",
        quantity: 2,
        unitCost: 22,
        unitPrice: 28,
        hsn: "2501",
        gstRate: 5,
      },
    ],
    totalRevenue: 88,
    totalCost: 68,
    profit: 20,
    taxableAmount: 83.81,
    cgst: 2.1,
    sgst: 2.1,
    gstTotal: 4.19,
    soldByProfileId: ramesh,
    soldByName: "Ramesh",
    soldByRoles: ["maker"],
    customerId: ravi.id,
    customerSnapshot: snap(ravi),
    createdAt: atDaysAgo(0, 9, 10),
    paymentStatus: "paid",
    amountPaid: 88,
    paymentUpdatedAt: atDaysAgo(0, 9, 12),
    lastPaymentCheckAt: atDaysAgo(0, 9, 12),
    ledgerActive: false,
    payments: [
      { id: "pay_1044", amount: 88, note: "UPI", at: atDaysAgo(0, 9, 12) },
    ],
  };

  const saleTodayDue: SaleRecord = {
    id: "sale_demo_today_due",
    billNo: "SS-1045",
    invoiceId: "inv_sale_1045",
    mode: "list",
    lines: [
      {
        productId: "prod_seed_4",
        productCode: "FORT-OIL-1L",
        productName: "Fortune Sunlite Refined Oil 1L",
        quantity: 4,
        unitCost: 145,
        unitPrice: 168,
        hsn: "1507",
        gstRate: 5,
      },
    ],
    totalRevenue: 672,
    totalCost: 580,
    profit: 92,
    taxableAmount: 640,
    cgst: 16,
    sgst: 16,
    gstTotal: 32,
    soldByProfileId: ramesh,
    soldByName: "Ramesh",
    soldByRoles: ["maker"],
    customerId: sita.id,
    customerSnapshot: snap(sita),
    createdAt: atDaysAgo(0, 10, 40),
    paymentStatus: "pending",
    amountPaid: 0,
    paymentUpdatedAt: atDaysAgo(0, 10, 40),
    lastPaymentCheckAt: null,
    ledgerActive: false,
    payments: [],
  };

  const saleOverdue: SaleRecord = {
    id: "sale_demo_overdue",
    billNo: "SS-1031",
    invoiceId: "inv_sale_1031",
    mode: "product",
    lines: [
      {
        productId: "prod_seed_3",
        productCode: "MAGGI-2M-70",
        productName: "Maggi 2-Minute Noodles 70g",
        quantity: 1,
        unitCost: 12,
        unitPrice: 16,
        hsn: "1902",
        gstRate: 5,
      },
      {
        productId: "prod_seed_2",
        productCode: "TATA-SALT-1K",
        productName: "Tata Salt Iodized 1kg",
        quantity: 5,
        unitCost: 22,
        unitPrice: 28,
        hsn: "2501",
        gstRate: 5,
      },
    ],
    totalRevenue: 156,
    totalCost: 122,
    profit: 34,
    taxableAmount: 148.57,
    cgst: 3.71,
    sgst: 3.71,
    gstTotal: 7.43,
    soldByProfileId: ramesh,
    soldByName: "Ramesh",
    soldByRoles: ["maker"],
    customerId: mohan.id,
    customerSnapshot: snap(mohan),
    createdAt: atDaysAgo(4, 18, 5),
    paymentStatus: "overdue",
    amountPaid: 0,
    paymentUpdatedAt: atDaysAgo(4, 18, 5),
    lastPaymentCheckAt: atDaysAgo(1, 10, 0),
    nextDueDate: dateDaysAgo(1),
    ledgerActive: false,
    billFormats: ["tax_invoice"],
    payments: [],
  };

  const saleLedger: SaleRecord = {
    id: "sale_demo_ledger",
    billNo: "SS-1028",
    invoiceId: "inv_sale_1028",
    mode: "bill",
    lines: [
      {
        productId: "prod_seed_1",
        productCode: "AMUL-TAZ-1L",
        productName: "Amul Taaza Toned Milk 1L",
        quantity: 6,
        unitCost: 52,
        unitPrice: 62,
        hsn: "0401",
        gstRate: 5,
        expiryDate: "2026-08-18",
        batchNo: "AM2408",
      },
    ],
    totalRevenue: 372,
    totalCost: 312,
    profit: 60,
    taxableAmount: 354.29,
    cgst: 8.86,
    sgst: 8.86,
    gstTotal: 17.71,
    soldByProfileId: ramesh,
    soldByName: "Ramesh",
    soldByRoles: ["maker"],
    customerId: ravi.id,
    customerSnapshot: snap(ravi),
    createdAt: atDaysAgo(6, 8, 30),
    paymentStatus: "ledger",
    amountPaid: 120,
    paymentUpdatedAt: atDaysAgo(2, 19, 0),
    lastPaymentCheckAt: atDaysAgo(2, 19, 0),
    nextDueDate: dateDaysAgo(-5),
    monthlyInstallment: 120,
    ledgerNote: "Weekly milk khata",
    ledgerActive: true,
    billFormats: ["retail"],
    installments: [
      {
        id: "emi_1028_1",
        dueDate: dateDaysAgo(7),
        amount: 120,
        paidAt: atDaysAgo(2, 19, 0),
        paidAmount: 120,
        note: "Week 1",
      },
      {
        id: "emi_1028_2",
        dueDate: ymd(),
        amount: 126,
        paidAt: null,
        paidAmount: 0,
        note: "Week 2 — call today",
      },
      {
        id: "emi_1028_3",
        dueDate: dateDaysAgo(-7),
        amount: 126,
        paidAt: null,
        paidAmount: 0,
      },
    ],
    payments: [
      { id: "pay_1028a", amount: 120, note: "Week 1", at: atDaysAgo(2, 19, 0) },
    ],
  };

  const saleYday: SaleRecord = {
    id: "sale_demo_yday",
    billNo: "SS-1038",
    invoiceId: "inv_sale_1038",
    mode: "barcode",
    lines: [
      {
        productId: "prod_seed_6",
        productCode: "BISC-OREO-120",
        productName: "Oreo Vanilla Cream 120g",
        quantity: 2,
        unitCost: 28,
        unitPrice: 40,
        hsn: "1905",
        gstRate: 5,
      },
    ],
    totalRevenue: 80,
    totalCost: 56,
    profit: 24,
    taxableAmount: 76.19,
    cgst: 1.9,
    sgst: 1.9,
    gstTotal: 3.81,
    soldByProfileId: ramesh,
    soldByName: "Ramesh",
    soldByRoles: ["maker"],
    customerId: mohan.id,
    customerSnapshot: snap(mohan),
    createdAt: atDaysAgo(1, 17, 20),
    paymentStatus: "paid",
    amountPaid: 80,
    paymentUpdatedAt: atDaysAgo(1, 17, 22),
    lastPaymentCheckAt: atDaysAgo(1, 17, 22),
    ledgerActive: false,
    payments: [
      { id: "pay_1038", amount: 80, note: "Cash", at: atDaysAgo(1, 17, 22) },
    ],
  };

  return [saleTodayPaid, saleTodayDue, saleOverdue, saleLedger, saleYday];
}

export function seedOrders(): ShopOrder[] {
  return [
    {
      id: "ord_demo_new",
      token: "SS1.demo-ravi-maggi",
      customerName: "Ravi Kirana",
      customerPhone: "9876543210",
      note: "Need by 6pm",
      fulfillment: "pickup",
      lines: [
        {
          productCode: "MAGGI-2M-70",
          productName: "Maggi 2-Minute Noodles 70g",
          quantity: 10,
          unitPrice: 16,
        },
      ],
      total: 160,
      status: "new",
      saleId: null,
      createdAt: atDaysAgo(0, 11, 5),
      source: "shop",
    },
    {
      id: "ord_demo_ok",
      token: "SS1.demo-sita-oil",
      customerName: "Sita General Store",
      customerPhone: "9123456780",
      note: "",
      fulfillment: "delivery",
      lines: [
        {
          productCode: "FORT-OIL-1L",
          productName: "Fortune Sunlite Refined Oil 1L",
          quantity: 2,
          unitPrice: 168,
        },
      ],
      total: 336,
      status: "accepted",
      saleId: null,
      createdAt: atDaysAgo(1, 14, 0),
      source: "paste",
    },
  ];
}

export function seedLeads(): Lead[] {
  return [
    {
      id: "lead_seed_1",
      name: "Ravi Kirana",
      phone: "9876543210",
      source: "walk-in",
      status: "quoted",
      note: "Wants 2 carton Maggi weekly",
      value: 2400,
      createdAt: atDaysAgo(10),
      lastTouchAt: atDaysAgo(1),
    },
    {
      id: "lead_seed_2",
      name: "Anita Super",
      phone: "9012345678",
      source: "shop-link",
      status: "new",
      note: "Asked oil rate on WhatsApp",
      value: 1800,
      createdAt: atDaysAgo(2),
      lastTouchAt: atDaysAgo(2),
    },
    {
      id: "lead_seed_3",
      name: "Hotel Pink City",
      phone: "9829011122",
      source: "referral",
      status: "won",
      note: "Monthly milk",
      value: 12000,
      createdAt: atDaysAgo(25),
      lastTouchAt: atDaysAgo(5),
    },
  ];
}

export function seedReturns(): CreditNote[] {
  return [
    {
      id: "ret_demo_1",
      noteNo: "CN-12",
      saleId: "sale_demo_yday",
      billNo: "SS-1038",
      reason: "Pack torn",
      lines: [
        {
          productId: "prod_seed_6",
          productCode: "BISC-OREO-120",
          productName: "Oreo Vanilla Cream 120g",
          quantity: 1,
          unitPrice: 40,
        },
      ],
      total: 40,
      createdAt: atDaysAgo(1, 18, 0),
      createdByName: "Ramesh",
    },
  ];
}

export function seedDayCloses(): DayClose[] {
  return [
    {
      id: "close_demo_yday",
      date: dateDaysAgo(1),
      salesCount: 1,
      cash: 80,
      upi: 0,
      credit: 0,
      returns: 40,
      gross: 80,
      note: "Quiet evening",
      closedAt: atDaysAgo(1, 21, 10),
      closedByName: "Amit",
    },
  ];
}

export function seedSaleInvoices(): Invoice[] {
  return seedSales().map((s) => ({
    id: s.invoiceId || `inv_${s.id}`,
    kind: "stock_out" as const,
    invoiceNo: s.billNo,
    supplier: null,
    supplierId: null,
    billDate: s.createdAt.slice(0, 10),
    imageDataUrl: null,
    rawText: null,
    lines: s.lines.map((l, i) => ({
      id: `sol_${s.id}_${i}`,
      productCode: l.productCode,
      productName: l.productName,
      quantity: l.quantity,
      unitCost: l.unitCost,
      unitPrice: l.unitPrice,
      codeGenerated: false,
      expiryDate: l.expiryDate,
      batchNo: l.batchNo,
      hsn: l.hsn,
      gstRate: l.gstRate,
    })),
    totalCost: s.totalCost,
    totalSale: s.totalRevenue,
    taxableAmount: s.taxableAmount,
    cgst: s.cgst,
    sgst: s.sgst,
    gstTotal: s.gstTotal,
    status: "verified" as const,
    createdAt: s.createdAt,
    createdByProfileId: s.soldByProfileId,
    createdByName: s.soldByName,
    createdByRoles: s.soldByRoles,
    sellMode: s.mode,
    saleId: s.id,
    customerId: s.customerId,
    customerSnapshot: s.customerSnapshot,
  }));
}

export function seedSalarySlips(): SalarySlip[] {
  const month = currentMonth();
  return [
    {
      id: "slip_ramesh_demo",
      staffId: DEMO_STAFF_IDS.maker,
      staffName: "Ramesh",
      month,
      basic: 12000,
      pfEmployee: 0,
      pfEmployer: 0,
      netPay: 12000,
      channel: "cash",
      pfType: "non_pf",
      paidAt: null,
      createdAt: atDaysAgo(1, 18, 0),
    },
    {
      id: "slip_sunita_demo",
      staffId: DEMO_STAFF_IDS.hr,
      staffName: "Sunita",
      month,
      basic: 15000,
      pfEmployee: 1800,
      pfEmployer: 1800,
      netPay: 13200,
      channel: "cash",
      pfType: "pf",
      paidAt: null,
      createdAt: atDaysAgo(1, 18, 5),
    },
  ];
}

export type DemoCounts = {
  products: number;
  customers: number;
  suppliers: number;
  invoices: number;
  sales: number;
  orders: number;
  leads: number;
  returns: number;
  staff: number;
  slips: number;
};

export function emptyDemoCounts(): DemoCounts {
  return {
    products: 0,
    customers: 0,
    suppliers: 0,
    invoices: 0,
    sales: 0,
    orders: 0,
    leads: 0,
    returns: 0,
    staff: 0,
    slips: 0,
  };
}

/** Merge missing demo rows. Never overwrites a user's extra records. */
export function fillEmptyShop<T extends {
  products: Product[];
  customers: Customer[];
  customerSeq: number;
  suppliers: Supplier[];
  invoices: Invoice[];
  sales: SaleRecord[];
  shopOrders: ShopOrder[];
  leads: Lead[];
  returns: CreditNote[];
  dayCloses: DayClose[];
  profiles: Profile[];
  upiId: string | null;
  shop: ReturnType<typeof defaultShop>;
  waTemplates: ReturnType<typeof defaultTemplates>;
  settings: typeof DEFAULT_SHOP_SETTINGS;
  demoSyncedAt?: string | null;
  salarySlips?: SalarySlip[];
}>(state: T): { state: T; added: DemoCounts } {
  const added = emptyDemoCounts();
  const next = { ...state };

  if (!next.products.length) {
    next.products = SEED_PRODUCTS.map((p) => ({ ...p }));
    added.products = next.products.length;
  } else {
    const missingMeds = SEED_PRODUCTS.filter(
      (p) =>
        p.id.startsWith("prod_med_") && !next.products.some((x) => x.id === p.id),
    );
    if (missingMeds.length) {
      next.products = [...next.products, ...missingMeds];
      added.products += missingMeds.length;
    }
  }
  if (!next.customers.length) {
    next.customers = SEED_CUSTOMERS.map((c) => ({ ...c }));
    next.customerSeq = Math.max(next.customerSeq || 0, 1004);
    added.customers = next.customers.length;
  } else {
    const missing = SEED_CUSTOMERS.filter(
      (c) => !next.customers.some((x) => x.id === c.id),
    );
    if (missing.length && next.customers.length < 3) {
      next.customers = [...next.customers, ...missing];
      added.customers = missing.length;
    }
  }
  if (!next.suppliers.length) {
    next.suppliers = SEED_SUPPLIERS.map((s) => ({ ...s }));
    added.suppliers = next.suppliers.length;
  }
  if (!next.invoices.length) {
    next.invoices = [...seedInvoices(), ...seedSaleInvoices()];
    added.invoices = next.invoices.length;
  }
  if (!next.sales.length) {
    next.sales = seedSales();
    added.sales = next.sales.length;
  }
  if (!next.shopOrders.length) {
    next.shopOrders = seedOrders();
    added.orders = next.shopOrders.length;
  }
  if (!next.leads.length) {
    next.leads = seedLeads();
    added.leads = next.leads.length;
  }
  if (!next.returns.length) {
    next.returns = seedReturns();
    added.returns = next.returns.length;
  }
  if (!next.dayCloses.length) {
    next.dayCloses = seedDayCloses();
  }
  const beforeStaff = next.profiles.length;
  next.profiles = mergeDemoStaff(next.profiles);
  added.staff = Math.max(0, next.profiles.length - beforeStaff);
  if (!next.salarySlips?.length) {
    next.salarySlips = seedSalarySlips();
    added.slips = next.salarySlips.length;
  }
  if (!next.upiId) next.upiId = DEMO_UPI;
  if (!next.shop?.name) next.shop = { ...defaultShop(), ...(next.shop || {}) };
  if (!next.shop.gstin) {
    next.shop = { ...next.shop, gstin: "08AABCS8821P1Z3" };
  }
  if (!next.waTemplates?.length) next.waTemplates = defaultTemplates();
  if (!next.settings) next.settings = { ...DEFAULT_SHOP_SETTINGS };
  const filledSomething = Object.values(added).some((n) => n > 0);
  if (filledSomething && !next.demoSyncedAt) {
    next.demoSyncedAt = new Date().toISOString();
  }
  return { state: next, added };
}
