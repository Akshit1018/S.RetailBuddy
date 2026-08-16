import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppLocale,
  AppState,
  BillFormat,
  CreditNote,
  Customer,
  DayClose,
  Invoice,
  Lead,
  LeadStatus,
  LineItem,
  PayChannel,
  PaymentStatus,
  PfType,
  Product,
  Profile,
  SaleRecord,
  SalarySlip,
  SellMode,
  ShopCard,
  ShopOrder,
  ShopOrderStatus,
  ShopSettings,
  StaffPerms,
  Supplier,
  ThemeMode,
  UserRole,
  VerificationStatus,
  WaTemplate,
} from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { guessGstRate, guessHsn, summarizeGst } from "@/lib/gst";
import { parseCsv } from "@/lib/backup";
import { decodeOrder, encodeOrder } from "@/lib/shop-order";
import {
  makeGuestProfile,
  mergeDemoStaff,
  type DemoCounts,
} from "@/lib/demo-seed";
import {
  applyShopMigrations,
  blankShopState,
  SHOP_DATA_VERSION,
  syncFill,
} from "@/lib/shop-migrate";
import {
  canCheck,
  canCloseDay,
  canSell,
  canStockIn,
  canVerify,
  denyMessage,
} from "@/lib/rbac";
import {
  defaultStaffPerms,
  DEMO_SHOP_CODE,
  effectiveStaffPerms,
  maxDiscountPctForProduct,
  normalizeShopCode,
  todayKey,
  upsertAttendance,
} from "@/lib/staff";
import { applyPayToSchedule, buildSchedule, ymd } from "@/lib/installments";
import { calcSlip } from "@/lib/salary";
import { monthCloseFromPack, buildCaPack } from "@/lib/ca-pack";

interface StockActions {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: AppLocale) => void;
  setPaymentQr: (dataUrl: string | null) => void;
  setUpiId: (id: string | null) => void;
  setVoiceHints: (on: boolean) => void;
  setStaffPinHash: (hash: string | null) => void;
  ensureGuest: () => void;
  dismissWelcome: () => void;
  completeSplash: () => void;
  setAiEnabled: (on: boolean) => void;
  completeOnboarding: (profile: {
    name: string;
    phone?: string;
    shopName?: string;
    roles: UserRole[];
    locale?: AppLocale;
    phoneVerified?: boolean;
  }) => void;
  skipAsGuest: (locale?: AppLocale) => void;
  upgradeFromGuest: (profile: {
    name: string;
    phone?: string;
    shopName?: string;
    roles: UserRole[];
    phoneVerified?: boolean;
  }) => void;
  addProfile: (profile: {
    name: string;
    phone?: string;
    shopName?: string;
    roles: UserRole[];
    salary?: number | null;
    avatarDataUrl?: string | null;
    staffPerms?: StaffPerms;
    activate?: boolean;
  }) => string;
  updateProfile: (
    id: string,
    patch: Partial<
      Pick<
        Profile,
        | "name"
        | "phone"
        | "shopName"
        | "roles"
        | "phoneVerified"
        | "avatarDataUrl"
        | "salary"
        | "staffPerms"
        | "attendance"
        | "isOwner"
        | "payMode"
        | "pfType"
        | "jobTitle"
      >
    >,
  ) => void;
  hireStaff: (profile: {
    name: string;
    phone?: string;
    salary?: number | null;
    roles: UserRole[];
    avatarDataUrl?: string | null;
    staffPerms?: StaffPerms;
  }) => string;
  joinShopStaff: (input: {
    code: string;
    name: string;
    phone?: string;
    avatarDataUrl?: string | null;
  }) => { ok: true; id: string } | { ok: false; error: string };
  markAttendance: (
    profileId: string,
    date: string,
    status: import("@/lib/types").AttendanceStatus,
  ) => void;
  punchAttendance: (
    profileId: string,
    kind: "in" | "out",
  ) => { ok: true } | { ok: false; error: string };
  createPayLink: (input: {
    saleId?: string | null;
    amount: number;
    customerPhone?: string | null;
    remark?: string | null;
  }) => { ok: true; token: string } | { ok: false; error: string };
  attachSaleProof: (
    saleId: string,
    patch: {
      paymentProofDataUrl?: string | null;
      orderRemark?: string | null;
      voiceRemarkDataUrl?: string | null;
    },
  ) => { ok: true } | { ok: false; error: string };
  ensureShopCode: () => string;
  setActiveProfile: (id: string) => void;
  findDuplicateInvoice: (invoiceNo: string) => Invoice | null;
  submitStockIn: (payload: {
    invoiceNo?: string | null;
    supplier?: string | null;
    billDate?: string | null;
    imageDataUrl?: string | null;
    rawText?: string | null;
    lines: LineItem[];
    notes?: string | null;
    force?: boolean;
  }) => { ok: true; id: string } | { ok: false; error: string; duplicateId?: string };
  updateInvoiceLines: (invoiceId: string, lines: LineItem[]) => void;
  setInvoiceStatus: (invoiceId: string, status: VerificationStatus) => void;
  submitSale: (payload: {
    mode: SellMode;
    lines: Array<{
      productId?: string;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice?: number;
    }>;
    imageDataUrl?: string | null;
    customerId?: string | null;
    customerDraft?: {
      name: string;
      whatsapp?: string;
      phone?: string;
      address?: string;
      notes?: string;
      save: boolean;
    } | null;
    discountPct?: number;
    orderRemark?: string | null;
    voiceRemarkDataUrl?: string | null;
  }) => { ok: true; saleId: string; billNo: string } | { ok: false; error: string };
  upsertCustomer: (data: {
    id?: string;
    name: string;
    whatsapp?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    creditLimit?: number | null;
    gstin?: string | null;
    stateCode?: string | null;
  }) => string;
  recordPayment: (
    saleId: string,
    amount: number,
    note?: string,
  ) => { ok: true } | { ok: false; error: string };
  setPaymentStatus: (
    saleId: string,
    status: PaymentStatus,
    opts?: {
      nextDueDate?: string | null;
      monthlyInstallment?: number | null;
      ledgerNote?: string | null;
    },
  ) => void;
  markPaymentChecked: (saleId: string) => void;
  upsertSupplier: (data: {
    id?: string;
    name: string;
    phone?: string | null;
    gstin?: string | null;
    address?: string | null;
    notes?: string | null;
  }) => string;
  submitReturn: (payload: {
    saleId?: string | null;
    reason: string;
    lines: Array<{
      productId?: string;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => { ok: true; id: string; noteNo: string } | { ok: false; error: string };
  closeDay: (payload: {
    cash: number;
    upi: number;
    note?: string;
  }) => { ok: true; id: string } | { ok: false; error: string };
  importProductsCsv: (
    text: string,
  ) => { ok: true; added: number; updated: number } | { ok: false; error: string };
  importBackupState: (partial: Partial<AppState>) => void;
  updateShop: (patch: Partial<ShopCard>) => void;
  importShopOrder: (
    raw: string,
  ) => { ok: true; id: string } | { ok: false; error: string };
  setShopOrderStatus: (id: string, status: ShopOrderStatus) => void;
  billShopOrder: (
    id: string,
  ) =>
    | { ok: true; saleId: string; billNo: string }
    | { ok: false; error: string };
  addLead: (data: {
    name: string;
    phone: string;
    source?: string;
    note?: string;
    value?: number;
  }) => string;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  upsertTemplate: (tpl: { id?: string; name: string; body: string }) => string;
  deleteTemplate: (id: string) => void;
  addCatalogProduct: (data: {
    name: string;
    code?: string;
    barcode?: string | null;
    unitPrice?: number;
    unitCost?: number;
    quantity?: number;
    hsn?: string | null;
    gstRate?: number;
  }) => string;
  updateSettings: (patch: Partial<ShopSettings>) => void;
  resetDemo: () => void;
  syncDemoData: () => DemoCounts;
  scheduleInstallments: (
    saleId: string,
    opts: { count: number; firstDue: string; monthly?: boolean; gapDays?: number },
  ) => { ok: true } | { ok: false; error: string };
  payInstallment: (
    saleId: string,
    amount: number,
    note?: string,
  ) => { ok: true } | { ok: false; error: string };
  setSaleFormats: (
    saleId: string,
    formats: BillFormat[],
    extra?: { irn?: string | null; ewbNo?: string | null },
  ) => void;
  createSalarySlip: (input: {
    staffId: string;
    month: string;
    basic?: number;
    pfType?: PfType;
    channel?: PayChannel;
  }) => { ok: true; id: string } | { ok: false; error: string };
  markSlipPaid: (slipId: string) => void;
  closeMonth: (month: string) => { ok: true; id: string } | { ok: false; error: string };
  markNoticesRead: (ids: string[]) => void;
  dismissExpiryPopup: () => void;
}

type Store = AppState & StockActions;

function sumCost(lines: LineItem[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
}

function sumSale(lines: LineItem[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
}

function activeActor(state: AppState) {
  const p = state.profiles.find((x) => x.id === state.activeProfileId) ?? null;
  return {
    profileId: p?.id ?? null,
    name: p?.name ?? "Guest",
    roles: p?.roles ?? (["maker", "checker", "accountant"] as UserRole[]),
  };
}

function enrichLine(line: LineItem): LineItem {
  return {
    ...line,
    hsn: line.hsn || guessHsn(line.productName),
    gstRate: line.gstRate ?? guessGstRate(line.productName),
  };
}

function upsertStockFromLines(
  products: Product[],
  lines: LineItem[],
  pending: boolean,
): Product[] {
  const next = products.map((p) => ({ ...p }));
  for (const raw of lines) {
    const line = enrichLine(raw);
    const idx = next.findIndex(
      (p) => p.code.toLowerCase() === line.productCode.toLowerCase(),
    );
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity + line.quantity,
        pendingQuantity: pending
          ? next[idx].pendingQuantity + line.quantity
          : next[idx].pendingQuantity,
        unitCost: line.unitCost || next[idx].unitCost,
        unitPrice: line.unitPrice || next[idx].unitPrice,
        expiryDate: line.expiryDate ?? next[idx].expiryDate,
        batchNo: line.batchNo ?? next[idx].batchNo,
        hsn: line.hsn ?? next[idx].hsn,
        gstRate: line.gstRate ?? next[idx].gstRate,
        lastUpdated: todayISO(),
      };
    } else {
      next.push({
        id: uid("prod"),
        code: line.productCode,
        name: line.productName,
        quantity: line.quantity,
        pendingQuantity: pending ? line.quantity : 0,
        unitCost: line.unitCost,
        unitPrice: line.unitPrice,
        mrp: line.mrp ?? null,
        expiryDate: line.expiryDate ?? null,
        batchNo: line.batchNo ?? null,
        barcode: null,
        reorderLevel: 10,
        lastUpdated: todayISO(),
        hsn: line.hsn ?? guessHsn(line.productName),
        gstRate: line.gstRate ?? guessGstRate(line.productName),
      });
    }
  }
  return next;
}

function clearPendingForInvoice(
  products: Product[],
  lines: LineItem[],
): Product[] {
  return products.map((p) => {
    const matched = lines.filter(
      (l) => l.productCode.toLowerCase() === p.code.toLowerCase(),
    );
    if (!matched.length) return p;
    const qty = matched.reduce((s, l) => s + l.quantity, 0);
    return {
      ...p,
      pendingQuantity: Math.max(0, p.pendingQuantity - qty),
    };
  });
}

function newGuestProfile(): Profile {
  return makeGuestProfile(uid("guest"));
}

function initialState(): AppState {
  return {
    ...blankShopState(),
    onboardingDone: false,
    welcomeDismissed: false,
    splashSeen: false,
    aiEnabled: false,
    profiles: [],
    activeProfileId: null,
    theme: "light",
    locale: "en",
  };
}

function nextBillNo(sales: SaleRecord[]): string {
  const nums = sales
    .map((s) => Number((s.billNo || "").replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const n = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `SS-${n}`;
}

function nextNoteNo(notes: CreditNote[]): string {
  return `CN-${notes.length + 1}`;
}

export const useStockStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setLocale: (locale) => set({ locale }),
      setPaymentQr: (dataUrl) => set({ paymentQrDataUrl: dataUrl }),
      setUpiId: (id) => set({ upiId: id?.trim() || null }),
      setVoiceHints: (on) => set({ voiceHints: on }),
      setStaffPinHash: (hash) => set({ staffPinHash: hash }),

      ensureGuest: () => {
        const s = get();
        const extra: Partial<AppState> = {};
        if (!s.shopCode) extra.shopCode = DEMO_SHOP_CODE;
        if (s.profiles.length > 0 && s.activeProfileId) {
          const patch: Partial<AppState> = { ...extra };
          if (!s.onboardingDone) patch.onboardingDone = true;
          const merged = mergeDemoStaff(s.profiles);
          if (merged.length !== s.profiles.length) patch.profiles = merged;
          if (Object.keys(patch).length) set(patch);
          return;
        }
        const guest = s.profiles.find((p) => p.isGuest) ?? newGuestProfile();
        set({
          onboardingDone: true,
          shopCode: s.shopCode || DEMO_SHOP_CODE,
          profiles: mergeDemoStaff(
            s.profiles.some((p) => p.id === guest.id)
              ? s.profiles
              : [guest, ...s.profiles],
          ),
          activeProfileId: guest.id,
        });
      },

      dismissWelcome: () => set({ welcomeDismissed: true }),

      completeSplash: () =>
        set({
          splashSeen: true,
          welcomeDismissed: true,
          onboardingDone: true,
        }),

      setAiEnabled: (on) => set({ aiEnabled: on }),

      completeOnboarding: (profile) => {
        const id = uid("prof");
        const p: Profile = {
          id,
          name: profile.name.trim(),
          phone: profile.phone?.trim() || null,
          shopName: profile.shopName?.trim() || null,
          roles: profile.roles,
          isGuest: false,
          createdAt: todayISO(),
          phoneVerified: profile.phoneVerified ?? false,
        };
        set((s) => ({
          onboardingDone: true,
          welcomeDismissed: true,
          splashSeen: true,
          profiles: mergeDemoStaff([
            p,
            ...s.profiles.filter((x) => !x.isGuest && x.id !== id),
          ]),
          activeProfileId: id,
          locale: profile.locale ?? s.locale,
        }));
      },

      skipAsGuest: (locale) => {
        const existing = get().profiles.find((p) => p.isGuest);
        const guest = existing ?? newGuestProfile();
        set((s) => ({
          onboardingDone: true,
          welcomeDismissed: true,
          splashSeen: true,
          profiles: mergeDemoStaff([
            guest,
            ...s.profiles.filter((x) => !x.isGuest && x.id !== guest.id),
          ]),
          activeProfileId: guest.id,
          locale: locale ?? s.locale,
        }));
      },

      upgradeFromGuest: (profile) => {
        const id = uid("prof");
        const p: Profile = {
          id,
          name: profile.name.trim() || "Staff",
          phone: profile.phone?.trim() || null,
          shopName: profile.shopName?.trim() || null,
          roles:
            profile.roles.length > 0
              ? profile.roles
              : ["maker", "checker", "accountant"],
          isGuest: false,
          createdAt: todayISO(),
          phoneVerified: profile.phoneVerified ?? false,
        };
        set((s) => ({
          profiles: mergeDemoStaff([
            p,
            ...s.profiles.filter((x) => !x.isGuest),
          ]),
          activeProfileId: id,
          onboardingDone: true,
          welcomeDismissed: true,
          splashSeen: true,
        }));
      },

      addProfile: (profile) => {
        const id = uid("prof");
        const roles = profile.roles;
        const p: Profile = {
          id,
          name: profile.name.trim(),
          phone: profile.phone?.trim() || null,
          shopName: profile.shopName?.trim() || null,
          roles,
          isGuest: false,
          createdAt: todayISO(),
          salary: profile.salary ?? null,
          avatarDataUrl: profile.avatarDataUrl ?? null,
          staffPerms: profile.staffPerms ?? defaultStaffPerms(roles),
          attendance: [],
          isOwner: roles.includes("accountant"),
        };
        const activate = profile.activate !== false;
        set((s) => ({
          profiles: mergeDemoStaff([
            p,
            ...s.profiles.filter((x) => !x.isGuest && x.id !== id),
          ]),
          activeProfileId: activate ? id : s.activeProfileId,
          onboardingDone: true,
        }));
        return id;
      },

      updateProfile: (id, patch) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  name: patch.name?.trim() ?? p.name,
                  phone:
                    patch.phone !== undefined
                      ? patch.phone?.trim() || null
                      : p.phone,
                  shopName:
                    patch.shopName !== undefined
                      ? patch.shopName?.trim() || null
                      : p.shopName,
                  roles: patch.roles ?? p.roles,
                  staffPerms: patch.staffPerms ?? p.staffPerms,
                  isGuest: p.isGuest && !patch.name ? p.isGuest : false,
                }
              : p,
          ),
        }));
      },

      hireStaff: (profile) => {
        const id = uid("prof");
        const roles = profile.roles;
        const p: Profile = {
          id,
          name: profile.name.trim(),
          phone: profile.phone?.trim() || null,
          shopName: get().shop.name,
          roles,
          isGuest: false,
          createdAt: todayISO(),
          salary: profile.salary ?? null,
          avatarDataUrl: profile.avatarDataUrl ?? null,
          staffPerms: profile.staffPerms ?? defaultStaffPerms(roles),
          attendance: [],
          isOwner: roles.includes("accountant"),
        };
        set((s) => ({
          profiles: [...s.profiles.filter((x) => x.id !== id), p],
        }));
        return id;
      },

      joinShopStaff: (input) => {
        const code = normalizeShopCode(input.code);
        const shopCode = normalizeShopCode(get().shopCode || DEMO_SHOP_CODE);
        if (!code || code !== shopCode) {
          return { ok: false, error: "Shop code does not match this shop." };
        }
        const name = input.name.trim();
        if (!name) return { ok: false, error: "Enter your name." };
        const id = get().addProfile({
          name,
          phone: input.phone,
          shopName: get().shop.name,
          roles: ["maker"],
          avatarDataUrl: input.avatarDataUrl,
          staffPerms: defaultStaffPerms(["maker"]),
          activate: true,
        });
        set({
          splashSeen: true,
          welcomeDismissed: true,
          onboardingDone: true,
        });
        return { ok: true, id };
      },

      markAttendance: (profileId, date, status) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  attendance: upsertAttendance(p.attendance, { date, status }),
                }
              : p,
          ),
        }));
      },

      punchAttendance: (profileId, kind) => {
        const p = get().profiles.find((x) => x.id === profileId);
        if (!p) return { ok: false, error: "Staff not found" };
        const date = todayKey();
        const existing = p.attendance?.find((d) => d.date === date);
        const now = new Date().toISOString();
        set((s) => ({
          profiles: s.profiles.map((x) =>
            x.id === profileId
              ? {
                  ...x,
                  attendance: upsertAttendance(x.attendance, {
                    date,
                    status: existing?.status || "present",
                    inAt: kind === "in" ? now : existing?.inAt ?? now,
                    outAt: kind === "out" ? now : existing?.outAt ?? null,
                  }),
                }
              : x,
          ),
        }));
        return { ok: true };
      },

      createPayLink: (input) => {
        if (input.amount < 0) return { ok: false, error: "Amount is wrong" };
        const token = uid("pay").replace("pay_", "");
        const link = {
          id: uid("plink"),
          token,
          saleId: input.saleId ?? null,
          amount: input.amount,
          customerPhone: input.customerPhone ?? null,
          createdByProfileId: get().activeProfileId,
          createdAt: todayISO(),
          remark: input.remark ?? null,
        };
        set((s) => ({
          payLinks: [link, ...s.payLinks],
          sales: input.saleId
            ? s.sales.map((sale) =>
                sale.id === input.saleId ? { ...sale, payLinkToken: token } : sale,
              )
            : s.sales,
        }));
        return { ok: true, token };
      },

      attachSaleProof: (saleId, patch) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale) return { ok: false, error: "Bill not found" };
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  ...patch,
                  paymentProofAt: patch.paymentProofDataUrl
                    ? new Date().toISOString()
                    : x.paymentProofAt,
                }
              : x,
          ),
        }));
        return { ok: true };
      },

      ensureShopCode: () => {
        const code = get().shopCode || DEMO_SHOP_CODE;
        if (!get().shopCode) set({ shopCode: code });
        return code;
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      findDuplicateInvoice: (invoiceNo) => {
        const no = invoiceNo.trim().toLowerCase();
        if (!no) return null;
        return (
          get().invoices.find(
            (i) =>
              i.kind === "stock_in" &&
              (i.invoiceNo || "").trim().toLowerCase() === no,
          ) ?? null
        );
      },

      submitStockIn: (payload) => {
        const actor = activeActor(get());
        const actorProfile = get().profiles.find((p) => p.id === actor.profileId);
        if (!canStockIn(actor.roles) || !effectiveStaffPerms(actorProfile).stockIn) {
          return { ok: false, error: denyMessage("stock_in") };
        }
        const invNo = payload.invoiceNo?.trim() || "";
        if (invNo && !payload.force) {
          const dup = get().findDuplicateInvoice(invNo);
          if (dup) {
            return {
              ok: false,
              error: `Invoice ${invNo} already exists`,
              duplicateId: dup.id,
            };
          }
        }
        const lines = payload.lines.map(enrichLine);
        const gst = summarizeGst(
          lines.map((l) => ({
            quantity: l.quantity,
            unitPrice: l.unitCost,
            gstRate: l.gstRate,
          })),
        );
        const id = uid("inv");
        let supplierId: string | null = null;
        if (payload.supplier?.trim()) {
          const existing = get().suppliers.find(
            (s) =>
              s.name.toLowerCase() === payload.supplier!.trim().toLowerCase(),
          );
          supplierId = existing
            ? existing.id
            : get().upsertSupplier({ name: payload.supplier.trim() });
        }
        const invoice: Invoice = {
          id,
          kind: "stock_in",
          invoiceNo: invNo || null,
          supplier: payload.supplier ?? null,
          supplierId,
          billDate: payload.billDate ?? null,
          imageDataUrl: payload.imageDataUrl ?? null,
          rawText: payload.rawText ?? null,
          lines,
          status: "pending",
          createdByProfileId: actor.profileId,
          createdByName: actor.name,
          createdByRoles: actor.roles,
          createdAt: todayISO(),
          notes: payload.notes ?? null,
          totalCost: sumCost(lines),
          totalSale: sumSale(lines),
          taxableAmount: gst.taxable,
          cgst: gst.cgst,
          sgst: gst.sgst,
          gstTotal: gst.gstTotal,
        };

        set((s) => ({
          invoices: [invoice, ...s.invoices],
          products: upsertStockFromLines(s.products, lines, true),
          suppliers: s.suppliers.map((sup) =>
            sup.id === supplierId
              ? {
                  ...sup,
                  lastBillNo: invNo || sup.lastBillNo,
                  lastBillDate: payload.billDate || todayISO().slice(0, 10),
                  lastAmount: invoice.totalCost,
                  dueAmount: sup.dueAmount + invoice.totalCost,
                }
              : sup,
          ),
        }));
        return { ok: true, id };
      },

      updateInvoiceLines: (invoiceId, lines) => {
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          if (!inv || inv.kind !== "stock_in") return s;
          const nextLines = lines.map(enrichLine);
          const gst = summarizeGst(
            nextLines.map((l) => ({
              quantity: l.quantity,
              unitPrice: l.unitCost,
              gstRate: l.gstRate,
            })),
          );

          let products = s.products.map((p) => ({ ...p }));
          for (const line of inv.lines) {
            const p = products.find(
              (x) => x.code.toLowerCase() === line.productCode.toLowerCase(),
            );
            if (p) {
              p.quantity = Math.max(0, p.quantity - line.quantity);
              if (inv.status !== "verified") {
                p.pendingQuantity = Math.max(
                  0,
                  p.pendingQuantity - line.quantity,
                );
              }
            }
          }
          products = upsertStockFromLines(
            products,
            nextLines,
            inv.status !== "verified",
          );

          return {
            products,
            invoices: s.invoices.map((i) =>
              i.id === invoiceId
                ? {
                    ...i,
                    lines: nextLines,
                    totalCost: sumCost(nextLines),
                    totalSale: sumSale(nextLines),
                    taxableAmount: gst.taxable,
                    cgst: gst.cgst,
                    sgst: gst.sgst,
                    gstTotal: gst.gstTotal,
                  }
                : i,
            ),
          };
        });
      },

      setInvoiceStatus: (invoiceId, status) => {
        const actor = activeActor(get());
        if (status === "checked" && !canCheck(actor.roles)) {
          return;
        }
        if (status === "verified" && !canVerify(actor.roles)) {
          return;
        }
        set((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          if (!inv) return s;

          let products = s.products;
          if (status === "verified" && inv.status !== "verified") {
            products = clearPendingForInvoice(products, inv.lines);
          }

          return {
            products,
            invoices: s.invoices.map((i) => {
              if (i.id !== invoiceId) return i;
              return {
                ...i,
                status,
                checkedByProfileId:
                  status === "checked" || status === "verified"
                    ? (i.checkedByProfileId ?? actor.profileId)
                    : i.checkedByProfileId,
                checkedByName:
                  status === "checked" || status === "verified"
                    ? (i.checkedByName ?? actor.name)
                    : i.checkedByName,
                checkedAt:
                  status === "checked" || status === "verified"
                    ? (i.checkedAt ?? todayISO())
                    : i.checkedAt,
                verifiedByProfileId:
                  status === "verified"
                    ? actor.profileId
                    : i.verifiedByProfileId,
                verifiedByName:
                  status === "verified" ? actor.name : i.verifiedByName,
                verifiedAt: status === "verified" ? todayISO() : i.verifiedAt,
              };
            }),
          };
        });
      },

      upsertCustomer: (data) => {
        const s = get();
        if (data.id) {
          set({
            customers: s.customers.map((c) =>
              c.id === data.id
                ? {
                    ...c,
                    name: data.name.trim(),
                    whatsapp: data.whatsapp?.trim() || null,
                    phone: data.phone?.trim() || null,
                    address: data.address?.trim() || null,
                    notes: data.notes?.trim() || null,
                    creditLimit:
                      data.creditLimit !== undefined
                        ? data.creditLimit
                        : c.creditLimit,
                    gstin:
                      data.gstin !== undefined
                        ? data.gstin?.trim() || null
                        : c.gstin,
                    stateCode:
                      data.stateCode !== undefined
                        ? data.stateCode
                        : c.stateCode,
                  }
                : c,
            ),
          });
          return data.id;
        }
        const seq = s.customerSeq;
        const id = uid("cust");
        const customer: Customer = {
          id,
          customerNo: `C-${seq}`,
          name: data.name.trim(),
          whatsapp: data.whatsapp?.trim() || null,
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          notes: data.notes?.trim() || null,
          createdAt: todayISO(),
          creditLimit: data.creditLimit ?? get().settings.defaultCreditLimit,
          gstin: data.gstin?.trim() || null,
          stateCode: data.stateCode || get().settings.stateCode,
        };
        set({
          customers: [customer, ...s.customers],
          customerSeq: seq + 1,
        });
        return id;
      },

      submitSale: (payload) => {
        const state = get();
        const actor = activeActor(state);
        const actorProfile = state.profiles.find((p) => p.id === actor.profileId) ?? null;
        const perms = effectiveStaffPerms(actorProfile);
        if (!canSell(actor.roles) || !perms.sell) {
          return { ok: false, error: denyMessage("sell") };
        }
        if (!actor.profileId) {
          return { ok: false, error: "Create a profile before selling." };
        }

        const discountPct = Math.max(0, Math.min(100, payload.discountPct ?? 0));
        if (discountPct > 0) {
          if (perms.discountMode === "none") {
            return { ok: false, error: "This staff cannot give discount." };
          }
          for (const line of payload.lines) {
            const allowed = maxDiscountPctForProduct(
              perms,
              line.productId || "",
              line.productName,
            );
            if (discountPct > allowed + 0.01) {
              return {
                ok: false,
                error: `Max discount for ${line.productName} is ${allowed}%.`,
              };
            }
          }
        }

        const products = state.products.map((p) => ({ ...p }));
        const saleLines: SaleRecord["lines"] = [];

        for (const line of payload.lines) {
          if (line.quantity <= 0) {
            return { ok: false, error: "Quantity must be at least 1." };
          }
          const product = pickFefo(products, line.productCode, line.productId);
          if (!product) {
            return {
              ok: false,
              error: `Product ${line.productCode} not in stock. Stock-in first.`,
            };
          }
          if (product.quantity < line.quantity) {
            return {
              ok: false,
              error: `Only ${product.quantity} of ${product.name} in stock.`,
            };
          }
          product.quantity -= line.quantity;
          product.lastUpdated = todayISO();
          const rawPrice = line.unitPrice ?? product.unitPrice;
          const unitPrice =
            discountPct > 0 ? Math.round(rawPrice * (1 - discountPct / 100) * 100) / 100 : rawPrice;
          saleLines.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            quantity: line.quantity,
            unitCost: product.unitCost,
            unitPrice,
            hsn: product.hsn,
            gstRate: product.gstRate,
            expiryDate: product.expiryDate,
            batchNo: product.batchNo,
          });
        }

        let customerId = payload.customerId ?? null;
        if (!customerId && payload.customerDraft?.save && payload.customerDraft.name) {
          customerId = get().upsertCustomer({
            name: payload.customerDraft.name,
            whatsapp: payload.customerDraft.whatsapp,
            phone: payload.customerDraft.phone,
            address: payload.customerDraft.address,
            notes: payload.customerDraft.notes,
          });
        }
        const customer =
          (customerId
            ? get().customers.find((c) => c.id === customerId)
            : null) ?? null;
        const snapshot = customer
          ? {
              customerNo: customer.customerNo,
              name: customer.name,
              whatsapp: customer.whatsapp,
              phone: customer.phone,
              address: customer.address,
              gstin: customer.gstin,
              stateCode: customer.stateCode,
            }
          : payload.customerDraft?.name
            ? {
                customerNo: "WALKIN",
                name: payload.customerDraft.name,
                whatsapp: payload.customerDraft.whatsapp ?? null,
                phone: payload.customerDraft.phone ?? null,
                address: payload.customerDraft.address ?? null,
                gstin: null,
                stateCode: get().settings.stateCode,
              }
            : null;

        const gst = summarizeGst(
          saleLines.map((l) => ({
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            gstRate: l.gstRate,
          })),
        );
        const totalRevenue = saleLines.reduce(
          (a, l) => a + l.quantity * l.unitPrice,
          0,
        );
        const totalCost = saleLines.reduce(
          (a, l) => a + l.quantity * l.unitCost,
          0,
        );
        const rawTotal = payload.lines.reduce((a, l) => {
          const p = saleLines.find((x) => x.productCode === l.productCode);
          const raw = l.unitPrice ?? p?.unitPrice ?? 0;
          return a + l.quantity * raw;
        }, 0);
        const discountAmount =
          discountPct > 0 ? Math.max(0, rawTotal - totalRevenue) : 0;
        const saleId = uid("sale");
        const invoiceId = uid("inv");
        const billNo = nextBillNo(get().sales);
        const sale: SaleRecord = {
          id: saleId,
          billNo,
          invoiceId,
          mode: payload.mode,
          lines: saleLines,
          totalRevenue,
          totalCost,
          profit: totalRevenue - totalCost,
          taxableAmount: gst.taxable,
          cgst: gst.cgst,
          sgst: gst.sgst,
          gstTotal: gst.gstTotal,
          imageDataUrl: payload.imageDataUrl ?? null,
          soldByProfileId: actor.profileId,
          soldByName: actor.name,
          soldByRoles: actor.roles,
          customerId,
          customerSnapshot: snapshot,
          createdAt: todayISO(),
          paymentStatus: "pending",
          amountPaid: 0,
          paymentUpdatedAt: todayISO(),
          lastPaymentCheckAt: null,
          ledgerActive: false,
          payments: [],
          discountPct: discountPct || undefined,
          discountAmount: discountAmount || undefined,
          orderRemark: payload.orderRemark ?? null,
          voiceRemarkDataUrl: payload.voiceRemarkDataUrl ?? null,
          billFormats: get().settings.defaultBillFormats?.length
            ? [...get().settings.defaultBillFormats]
            : ["retail"],
          installments: [],
        };
        const invoice: Invoice = {
          id: invoiceId,
          kind: "stock_out",
          invoiceNo: billNo,
          lines: saleLines.map((l, i) => ({
            id: `sol_${saleId}_${i}`,
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
          totalCost,
          totalSale: totalRevenue,
          taxableAmount: gst.taxable,
          cgst: gst.cgst,
          sgst: gst.sgst,
          gstTotal: gst.gstTotal,
          status: "verified",
          createdAt: todayISO(),
          createdByProfileId: actor.profileId,
          createdByName: actor.name,
          createdByRoles: actor.roles,
          sellMode: payload.mode,
          saleId,
          customerId,
          customerSnapshot: snapshot,
        };

        set((s) => ({
          products,
          sales: [sale, ...s.sales],
          invoices: [invoice, ...s.invoices],
        }));
        return { ok: true, saleId, billNo };
      },

      recordPayment: (saleId, amount, note) => {
        if (amount <= 0) return { ok: false, error: "Amount must be more than 0" };
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale) return { ok: false, error: "Bill not found" };
        const nextPaid = Math.min(sale.totalRevenue, sale.amountPaid + amount);
        const paidOff = nextPaid >= sale.totalRevenue - 0.01;
        const at = todayISO();
        const installments = sale.installments?.length
          ? applyPayToSchedule(sale.installments, amount, at)
          : sale.installments;
        const nextDue =
          installments?.find((i) => i.paidAmount < i.amount - 0.01)?.dueDate ??
          (paidOff ? null : sale.nextDueDate);
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  amountPaid: nextPaid,
                  paymentStatus: paidOff ? "paid" : x.paymentStatus,
                  ledgerActive: paidOff ? false : x.ledgerActive,
                  paymentUpdatedAt: at,
                  nextDueDate: nextDue,
                  installments,
                  payments: [
                    {
                      id: uid("pay"),
                      amount,
                      note: note ?? null,
                      at,
                    },
                    ...x.payments,
                  ],
                }
              : x,
          ),
        }));
        return { ok: true };
      },

      setPaymentStatus: (saleId, status, opts) => {
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  paymentStatus: status,
                  ledgerActive: status === "ledger",
                  amountPaid:
                    status === "paid" ? x.totalRevenue : x.amountPaid,
                  paymentUpdatedAt: todayISO(),
                  nextDueDate:
                    opts?.nextDueDate !== undefined
                      ? opts.nextDueDate
                      : x.nextDueDate,
                  monthlyInstallment:
                    opts?.monthlyInstallment !== undefined
                      ? opts.monthlyInstallment
                      : x.monthlyInstallment,
                  ledgerNote:
                    opts?.ledgerNote !== undefined
                      ? opts.ledgerNote
                      : x.ledgerNote,
                }
              : x,
          ),
        }));
      },

      markPaymentChecked: (saleId) => {
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId ? { ...x, lastPaymentCheckAt: todayISO() } : x,
          ),
        }));
      },

      upsertSupplier: (data) => {
        const s = get();
        if (data.id) {
          set({
            suppliers: s.suppliers.map((sup) =>
              sup.id === data.id
                ? {
                    ...sup,
                    name: data.name.trim(),
                    phone: data.phone?.trim() || null,
                    gstin: data.gstin?.trim() || null,
                    address: data.address?.trim() || null,
                    notes: data.notes?.trim() || null,
                  }
                : sup,
            ),
          });
          return data.id;
        }
        const existing = s.suppliers.find(
          (sup) => sup.name.toLowerCase() === data.name.trim().toLowerCase(),
        );
        if (existing) return existing.id;
        const id = uid("sup");
        const row: Supplier = {
          id,
          name: data.name.trim(),
          phone: data.phone?.trim() || null,
          gstin: data.gstin?.trim() || null,
          address: data.address?.trim() || null,
          notes: data.notes?.trim() || null,
          lastBillNo: null,
          lastBillDate: null,
          lastAmount: 0,
          dueAmount: 0,
          createdAt: todayISO(),
        };
        set({ suppliers: [row, ...s.suppliers] });
        return id;
      },

      submitReturn: (payload) => {
        const actor = activeActor(get());
        if (payload.lines.length === 0) {
          return { ok: false, error: "Add at least one item" };
        }
        const id = uid("ret");
        const noteNo = nextNoteNo(get().returns);
        const total = payload.lines.reduce(
          (a, l) => a + l.quantity * l.unitPrice,
          0,
        );
        const sale = payload.saleId
          ? get().sales.find((x) => x.id === payload.saleId)
          : null;
        const note: CreditNote = {
          id,
          noteNo,
          saleId: payload.saleId ?? null,
          billNo: sale?.billNo ?? null,
          reason: payload.reason,
          lines: payload.lines,
          total,
          createdAt: todayISO(),
          createdByName: actor.name,
        };
        set((s) => {
          const products = s.products.map((p) => ({ ...p }));
          for (const line of payload.lines) {
            const hit = products.find(
              (p) =>
                p.id === line.productId ||
                p.code.toLowerCase() === line.productCode.toLowerCase(),
            );
            if (hit) {
              hit.quantity += line.quantity;
              hit.lastUpdated = todayISO();
            }
          }
          return { products, returns: [note, ...s.returns] };
        });
        return { ok: true, id, noteNo };
      },

      closeDay: (payload) => {
        const actor = activeActor(get());
        if (!canCloseDay(actor.roles)) {
          return { ok: false, error: denyMessage("close_day") };
        }
        const today = todayISO().slice(0, 10);
        if (get().dayCloses.some((d) => d.date === today)) {
          return { ok: false, error: "Today is already closed" };
        }
        const todays = get().sales.filter((s) => s.createdAt.slice(0, 10) === today);
        const credit = todays
          .filter((s) => s.paymentStatus !== "paid")
          .reduce((a, s) => a + Math.max(0, s.totalRevenue - s.amountPaid), 0);
        const returns = get()
          .returns.filter((r) => r.createdAt.slice(0, 10) === today)
          .reduce((a, r) => a + r.total, 0);
        const gross = todays.reduce((a, s) => a + s.totalRevenue, 0);
        const id = uid("close");
        const row: DayClose = {
          id,
          date: today,
          salesCount: todays.length,
          cash: payload.cash,
          upi: payload.upi,
          credit,
          returns,
          gross,
          note: payload.note?.trim() || null,
          closedAt: todayISO(),
          closedByName: actor.name,
        };
        set((s) => ({ dayCloses: [row, ...s.dayCloses] }));
        return { ok: true, id };
      },

      importProductsCsv: (text) => {
        const rows = parseCsv(text);
        if (rows.length < 2) return { ok: false, error: "CSV has no data rows" };
        const header = rows[0]!.map((h) => h.toLowerCase().replace(/\s+/g, ""));
        const idx = (names: string[]) =>
          header.findIndex((h) => names.includes(h));
        const iCode = idx(["code", "sku", "productcode"]);
        const iName = idx(["name", "product", "productname", "item"]);
        const iQty = idx(["quantity", "qty", "stock"]);
        const iCost = idx(["unitcost", "cost", "rate", "purchase"]);
        const iPrice = idx(["unitprice", "price", "mrp", "sell"]);
        const iExp = idx(["expiry", "expirydate", "exp"]);
        const iBar = idx(["barcode", "ean"]);
        const iHsn = idx(["hsn", "hsncode"]);
        const iGst = idx(["gstrate", "gst", "tax"]);
        if (iName < 0) return { ok: false, error: "CSV needs a name column" };
        let added = 0;
        let updated = 0;
        set((s) => {
          const products = s.products.map((p) => ({ ...p }));
          for (const row of rows.slice(1)) {
            const name = (row[iName] || "").trim();
            if (!name) continue;
            const code =
              (iCode >= 0 ? row[iCode] : "")?.trim() ||
              name.slice(0, 8).toUpperCase().replace(/\s+/g, "-");
            const hit = products.find(
              (p) => p.code.toLowerCase() === code.toLowerCase(),
            );
            const qty = iQty >= 0 ? Number(row[iQty]) || 0 : 0;
            const cost = iCost >= 0 ? Number(row[iCost]) || 0 : 0;
            const price = iPrice >= 0 ? Number(row[iPrice]) || 0 : 0;
            const expiry = iExp >= 0 ? row[iExp]?.trim() || null : null;
            const barcode = iBar >= 0 ? row[iBar]?.trim() || null : null;
            const hsn = iHsn >= 0 ? row[iHsn]?.trim() || null : null;
            const gstRate = iGst >= 0 ? Number(row[iGst]) || 5 : 5;
            if (hit) {
              hit.name = name;
              if (iQty >= 0) hit.quantity = qty;
              if (iCost >= 0) hit.unitCost = cost;
              if (iPrice >= 0) hit.unitPrice = price;
              if (expiry) hit.expiryDate = expiry;
              if (barcode) hit.barcode = barcode;
              if (hsn) hit.hsn = hsn;
              if (iGst >= 0) hit.gstRate = gstRate;
              hit.lastUpdated = todayISO();
              updated += 1;
            } else {
              products.push({
                id: uid("prod"),
                code,
                name,
                quantity: qty,
                pendingQuantity: 0,
                unitCost: cost,
                unitPrice: price,
                mrp: price || null,
                expiryDate: expiry,
                batchNo: null,
                barcode,
                reorderLevel: s.settings.defaultReorderLevel,
                lastUpdated: todayISO(),
                hsn,
                gstRate,
              });
              added += 1;
            }
          }
          return { products };
        });
        return { ok: true, added, updated };
      },

      importBackupState: (partial) => {
        set((s) =>
          applyShopMigrations(
            {
              ...s,
              ...partial,
              theme: partial.theme ?? s.theme,
              locale: partial.locale ?? s.locale,
            },
            SHOP_DATA_VERSION,
          ),
        );
      },

      updateShop: (patch) => {
        set((s) => ({ shop: { ...s.shop, ...patch } }));
      },

      importShopOrder: (raw) => {
        const p = decodeOrder(raw);
        if (!p) {
          return {
            ok: false,
            error: "Could not read order. Paste SS1. token or item list.",
          };
        }
        const token = raw.includes("SS1.")
          ? raw.slice(raw.indexOf("SS1.")).split(/\s+/)[0]!
          : encodeOrder(p);
        if (
          get().shopOrders.some(
            (o) => o.token === token && o.status !== "cancelled",
          )
        ) {
          return { ok: false, error: "This order is already in the inbox" };
        }
        const id = uid("ord");
        const order: ShopOrder = {
          id,
          token,
          customerName: p.name,
          customerPhone: p.phone,
          note: p.note,
          fulfillment: p.fulfill,
          lines: p.lines,
          total: p.total,
          status: "new",
          saleId: null,
          createdAt: todayISO(),
          source: raw.includes("SS1.") ? "shop" : "paste",
        };
        set((s) => ({
          shopOrders: [order, ...s.shopOrders],
          leads: upsertLeadFromOrder(s.leads, order),
        }));
        return { ok: true, id };
      },

      setShopOrderStatus: (id, status) => {
        set((s) => ({
          shopOrders: s.shopOrders.map((o) =>
            o.id === id ? { ...o, status } : o,
          ),
        }));
      },

      billShopOrder: (id) => {
        const order = get().shopOrders.find((o) => o.id === id);
        if (!order) return { ok: false, error: "Order not found" };
        if (order.status === "billed" && order.saleId) {
          const sale = get().sales.find((s) => s.id === order.saleId);
          if (sale) return { ok: true, saleId: sale.id, billNo: sale.billNo };
        }
        const res = get().submitSale({
          mode: "list",
          lines: order.lines.map((l) => ({
            productCode: l.productCode,
            productName: l.productName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          customerDraft: {
            name: order.customerName,
            phone: order.customerPhone,
            whatsapp: order.customerPhone,
            save: true,
          },
        });
        if (!res.ok) return res;
        set((s) => ({
          shopOrders: s.shopOrders.map((o) =>
            o.id === id
              ? { ...o, status: "billed", saleId: res.saleId }
              : o,
          ),
        }));
        return res;
      },

      addLead: (data) => {
        const id = uid("lead");
        const row: Lead = {
          id,
          name: data.name.trim(),
          phone: data.phone.trim(),
          source: data.source || "manual",
          status: "new",
          note: data.note || "",
          value: data.value ?? 0,
          createdAt: todayISO(),
          lastTouchAt: todayISO(),
        };
        set((s) => ({ leads: [row, ...s.leads] }));
        return id;
      },

      updateLead: (id, patch) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id ? { ...l, ...patch, lastTouchAt: todayISO() } : l,
          ),
        }));
      },

      setLeadStatus: (id, status) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id ? { ...l, status, lastTouchAt: todayISO() } : l,
          ),
        }));
      },

      upsertTemplate: (tpl) => {
        if (tpl.id) {
          set((s) => ({
            waTemplates: s.waTemplates.map((t) =>
              t.id === tpl.id ? { ...t, name: tpl.name, body: tpl.body } : t,
            ),
          }));
          return tpl.id;
        }
        const id = uid("tpl");
        set((s) => ({
          waTemplates: [...s.waTemplates, { id, name: tpl.name, body: tpl.body }],
        }));
        return id;
      },

      deleteTemplate: (id) => {
        set((s) => ({
          waTemplates: s.waTemplates.filter((t) => t.id !== id),
        }));
      },

      addCatalogProduct: (data) => {
        const code =
          data.code?.trim() ||
          data.name.slice(0, 8).toUpperCase().replace(/\s+/g, "-");
        const existing = get().products.find(
          (p) => p.code.toLowerCase() === code.toLowerCase(),
        );
        if (existing) {
          set((s) => ({
            products: s.products.map((p) =>
              p.id === existing.id
                ? {
                    ...p,
                    name: data.name || p.name,
                    barcode: data.barcode ?? p.barcode,
                    unitPrice: data.unitPrice ?? p.unitPrice,
                    lastUpdated: todayISO(),
                  }
                : p,
            ),
          }));
          return existing.id;
        }
        const id = uid("prod");
        set((s) => ({
          products: [
            {
              id,
              code,
              name: data.name,
              quantity: data.quantity ?? 0,
              pendingQuantity: 0,
              unitCost: data.unitCost ?? 0,
              unitPrice: data.unitPrice ?? 0,
              mrp: data.unitPrice ?? null,
              expiryDate: null,
              batchNo: null,
              barcode: data.barcode ?? null,
              reorderLevel: 10,
              lastUpdated: todayISO(),
              hsn: data.hsn ?? null,
              gstRate: data.gstRate ?? 5,
            },
            ...s.products,
          ],
        }));
        return id;
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      resetDemo: () => {
        const { theme, locale } = get();
        set({
          ...blankShopState(),
          theme,
          locale,
          onboardingDone: true,
          welcomeDismissed: true,
        });
      },

      syncDemoData: () => {
        const { state, added } = syncFill(get());
        set({
          ...state,
          demoSyncedAt: new Date().toISOString(),
          shopDataVersion: SHOP_DATA_VERSION,
        });
        return added;
      },

      scheduleInstallments: (saleId, opts) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale) return { ok: false, error: "Bill not found" };
        const remaining = Math.max(0, sale.totalRevenue - sale.amountPaid);
        if (remaining <= 0) return { ok: false, error: "Nothing left to split" };
        const rows = buildSchedule({
          remaining,
          count: opts.count,
          firstDue: opts.firstDue || ymd(),
          monthly: opts.monthly,
          gapDays: opts.gapDays,
        });
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  paymentStatus: "ledger",
                  ledgerActive: true,
                  installments: rows,
                  nextDueDate: rows[0]?.dueDate ?? opts.firstDue,
                  monthlyInstallment: rows[0]?.amount ?? remaining,
                }
              : x,
          ),
        }));
        return { ok: true };
      },

      payInstallment: (saleId, amount, note) => {
        return get().recordPayment(saleId, amount, note || "Installment");
      },

      setSaleFormats: (saleId, formats, extra) => {
        set((s) => ({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  billFormats: formats.length ? formats : ["retail"],
                  irn: extra?.irn !== undefined ? extra.irn : x.irn,
                  ewbNo: extra?.ewbNo !== undefined ? extra.ewbNo : x.ewbNo,
                }
              : x,
          ),
        }));
      },

      createSalarySlip: (input) => {
        const staff = get().profiles.find((p) => p.id === input.staffId);
        if (!staff) return { ok: false, error: "Staff not found" };
        const exists = get().salarySlips.some(
          (s) => s.staffId === input.staffId && s.month === input.month,
        );
        if (exists) return { ok: false, error: "Slip already made for this month" };
        const id = uid("slip");
        const body = calcSlip({
          staff,
          month: input.month,
          basic: input.basic,
          pfType: input.pfType,
          channel: input.channel,
          pfRate: get().settings.salaryPfRate,
        });
        const slip: SalarySlip = { ...body, id, createdAt: todayISO() };
        set((s) => ({ salarySlips: [slip, ...s.salarySlips] }));
        return { ok: true, id };
      },

      markSlipPaid: (slipId) => {
        set((s) => ({
          salarySlips: s.salarySlips.map((x) =>
            x.id === slipId ? { ...x, paidAt: todayISO() } : x,
          ),
        }));
      },

      closeMonth: (month) => {
        const actor = activeActor(get());
        if (get().monthCloses.some((m) => m.month === month)) {
          return { ok: false, error: "This month is already closed" };
        }
        const pack = buildCaPack({
          month,
          scheme: get().settings.gstScheme,
          sales: get().sales,
          invoices: get().invoices,
          returns: get().returns,
          dayCloses: get().dayCloses,
          slips: get().salarySlips,
        });
        const row = monthCloseFromPack(
          pack,
          actor.name,
          get().settings.caPin || "1234",
        );
        set((s) => ({ monthCloses: [row, ...s.monthCloses] }));
        return { ok: true, id: row.id };
      },

      markNoticesRead: (ids) => {
        set((s) => ({
          noticeReadIds: [...new Set([...s.noticeReadIds, ...ids])],
        }));
      },

      dismissExpiryPopup: () => {
        set({ expiryPopupOn: ymd() });
      },
    }),
    {
      name: "stockscan-v8",
      version: SHOP_DATA_VERSION,
      partialize: (s) => ({
        theme: s.theme,
        locale: s.locale,
        onboardingDone: s.onboardingDone,
        welcomeDismissed: s.welcomeDismissed,
        splashSeen: s.splashSeen,
        aiEnabled: s.aiEnabled,
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        products: s.products,
        invoices: s.invoices,
        sales: s.sales,
        customers: s.customers,
        customerSeq: s.customerSeq,
        paymentQrDataUrl: s.paymentQrDataUrl,
        upiId: s.upiId,
        staffPinHash: s.staffPinHash,
        shopCode: s.shopCode,
        payLinks: s.payLinks,
        suppliers: s.suppliers,
        returns: s.returns,
        dayCloses: s.dayCloses,
        voiceHints: s.voiceHints,
        shop: s.shop,
        shopOrders: s.shopOrders,
        leads: s.leads,
        waTemplates: s.waTemplates,
        settings: s.settings,
        shopDataVersion: s.shopDataVersion,
        demoSyncedAt: s.demoSyncedAt,
        salarySlips: s.salarySlips,
        monthCloses: s.monthCloses,
        noticeReadIds: s.noticeReadIds,
        expiryPopupOn: s.expiryPopupOn,
      }),
      migrate: (persisted, fromVersion) =>
        applyShopMigrations(persisted as Partial<AppState>, fromVersion ?? 0),
    },
  ),
);

function upsertLeadFromOrder(leads: Lead[], order: ShopOrder): Lead[] {
  const phone = order.customerPhone.replace(/\D/g, "");
  const hit = leads.find(
    (l) =>
      (phone && l.phone.replace(/\D/g, "") === phone) ||
      l.name.toLowerCase() === order.customerName.toLowerCase(),
  );
  if (hit) {
    return leads.map((l) =>
      l.id === hit.id
        ? {
            ...l,
            status: l.status === "lost" ? "new" : l.status,
            lastTouchAt: todayISO(),
            value: Math.max(l.value, order.total),
            note: `${l.note}\nShop order ${order.id}`.trim(),
          }
        : l,
    );
  }
  return [
    {
      id: uid("lead"),
      name: order.customerName,
      phone: order.customerPhone,
      source: "shop-link",
      status: "new",
      note: `WhatsApp order ₹${Math.round(order.total)}`,
      value: order.total,
      createdAt: todayISO(),
      lastTouchAt: todayISO(),
    },
    ...leads,
  ];
}

/** Prefer nearest-expiry product (FEFO) among matching SKUs */
export function pickFefo(
  products: Product[],
  code: string,
  productId?: string,
): Product | undefined {
  const c = code.toLowerCase();
  const matches = products.filter(
    (p) =>
      p.id === productId ||
      p.code.toLowerCase() === c ||
      (p.barcode && p.barcode.toLowerCase() === c),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => {
    const ae = a.expiryDate || "9999-12-31";
    const be = b.expiryDate || "9999-12-31";
    return ae.localeCompare(be);
  })[0];
}

export function useActiveProfile() {
  return useStockStore((s) => {
    if (!s.activeProfileId) return null;
    return s.profiles.find((p) => p.id === s.activeProfileId) ?? null;
  });
}

export function selectDashboard(state: AppState) {
  const purchase = state.invoices
    .filter((i) => i.kind === "stock_in")
    .reduce((s, i) => s + i.totalCost, 0);
  const salesRevenue = state.sales.reduce((s, x) => s + x.totalRevenue, 0);
  const salesCost = state.sales.reduce((s, x) => s + x.totalCost, 0);
  const profit = salesRevenue - salesCost;
  const unitsSold = state.sales.reduce(
    (s, sale) => s + sale.lines.reduce((a, l) => a + l.quantity, 0),
    0,
  );
  const totalUnits = state.products.reduce((s, p) => s + p.quantity, 0);
  const skus = state.products.filter((p) => p.quantity > 0).length;
  const pendingInvoices = state.invoices.filter(
    (i) => i.kind === "stock_in" && i.status !== "verified",
  ).length;
  const today = todayISO().slice(0, 10);
  const todaySales = state.sales.filter((s) => s.createdAt.slice(0, 10) === today);
  const todayRev = todaySales.reduce((a, s) => a + s.totalRevenue, 0);
  const todayCredit = todaySales.reduce(
    (a, s) => a + Math.max(0, s.totalRevenue - s.amountPaid),
    0,
  );
  const expireSoon = state.products.filter((p) => {
    if (!p.expiryDate || p.quantity <= 0) return false;
    const d = (new Date(p.expiryDate).getTime() - Date.now()) / 86400000;
    return d >= 0 && d <= 7;
  }).length;
  const low = state.products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.reorderLevel,
  ).length;
  return {
    purchase,
    salesRevenue,
    profit,
    profitPerPiece: unitsSold > 0 ? profit / unitsSold : 0,
    totalUnits,
    skus,
    pendingInvoices,
    todayRev,
    todayCredit,
    todayCount: todaySales.length,
    expireSoon,
    low,
  };
}
