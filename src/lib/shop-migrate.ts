import type { AppState } from "@/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "@/lib/types";
import { defaultShop, defaultTemplates } from "@/lib/shop-defaults";
import {
  DEMO_UPI,
  fillEmptyShop,
  makeGuestProfile,
  mergeDemoStaff,
  seedDayCloses,
  seedInvoices,
  seedLeads,
  seedOrders,
  seedReturns,
  seedSaleInvoices,
  seedSales,
  seedSalarySlips,
  SEED_CUSTOMERS,
  SEED_PRODUCTS,
  SEED_SUPPLIERS,
  type DemoCounts,
} from "@/lib/demo-seed";
import { defaultStaffPerms, DEMO_SHOP_CODE } from "@/lib/staff";

/** Bump when shop local data shape changes. Persist version tracks this. */
export const SHOP_DATA_VERSION = 13;

export type MigrationStep = {
  version: number;
  id: string;
  title: string;
  detail: string;
};

export const MIGRATION_STEPS: MigrationStep[] = [
  {
    version: 8,
    id: "v8-base",
    title: "Shop on this phone",
    detail: "Stock, bills, and profiles stay in the browser. No extra login.",
  },
  {
    version: 9,
    id: "v9-settings",
    title: "Shop settings + GST fields",
    detail: "Near-expiry days, credit limit, state code, GSTR-1 columns.",
  },
  {
    version: 10,
    id: "v10-demo-rbac",
    title: "Demo shop + role gates",
    detail:
      "Fills empty Bills, WhatsApp dues, Review, CRM, and orders. Maker / Checker / Accountant now lock the matching jobs.",
  },
  {
    version: 11,
    id: "v11-splash-ai",
    title: "Welcome screen + shop AI",
    detail:
      "A Get Started screen on first open. Home can turn on AI to say what to buy, what to skip, and what sells in your city.",
  },
  {
    version: 12,
    id: "v12-staff",
    title: "Shop staff + join code",
    detail:
      "Hire staff, set salary and discount limits, mark attendance, and let a helper join with the shop code. Bills can send a pay link and keep photo proof.",
  },
  {
    version: 13,
    id: "v13-books-pharmacy",
    title: "Pharmacy, EMI, salary, CA pack",
    detail:
      "Medical FIFO + 30/60/90 expiry alerts. Udhaar becomes a due-date plan with WhatsApp + UPI. Salary slips (cash/UPI, PF). CA monthly pack and GST bill papers.",
  },
];

export function blankShopState(): AppState {
  const guest = makeGuestProfile();
  return {
    theme: "light",
    locale: "en",
    onboardingDone: true,
    welcomeDismissed: true,
    splashSeen: true,
    aiEnabled: false,
    profiles: mergeDemoStaff([guest]),
    activeProfileId: guest.id,
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    invoices: [...seedInvoices(), ...seedSaleInvoices()],
    sales: seedSales(),
    customers: SEED_CUSTOMERS.map((c) => ({ ...c })),
    customerSeq: 1004,
    paymentQrDataUrl: null,
    upiId: DEMO_UPI,
    staffPinHash: null,
    shopCode: DEMO_SHOP_CODE,
    payLinks: [],
    suppliers: SEED_SUPPLIERS.map((s) => ({ ...s })),
    returns: seedReturns(),
    dayCloses: seedDayCloses(),
    voiceHints: true,
    shop: defaultShop(),
    shopOrders: seedOrders(),
    leads: seedLeads(),
    waTemplates: defaultTemplates(),
    settings: { ...DEFAULT_SHOP_SETTINGS },
    shopDataVersion: SHOP_DATA_VERSION,
    demoSyncedAt: new Date().toISOString(),
    salarySlips: seedSalarySlips(),
    monthCloses: [],
    noticeReadIds: [],
    expiryPopupOn: null,
  };
}

export function freshFirstRunState(): AppState {
  return {
    ...blankShopState(),
    onboardingDone: false,
    welcomeDismissed: false,
    splashSeen: false,
    aiEnabled: false,
    profiles: [],
    activeProfileId: null,
  };
}

export function applyShopMigrations(
  persisted: Partial<AppState> | undefined,
  fromVersion: number,
): AppState {
  const base = freshFirstRunState();
  const merged: AppState = {
    ...base,
    ...(persisted || {}),
    shop: { ...defaultShop(), ...(persisted?.shop || {}) },
    shopOrders: persisted?.shopOrders ?? [],
    leads: persisted?.leads ?? [],
    waTemplates: persisted?.waTemplates?.length
      ? persisted.waTemplates
      : defaultTemplates(),
    settings: { ...DEFAULT_SHOP_SETTINGS, ...(persisted?.settings || {}) },
    shopDataVersion: persisted?.shopDataVersion ?? fromVersion,
    demoSyncedAt: persisted?.demoSyncedAt ?? null,
    splashSeen: persisted?.splashSeen ?? false,
    aiEnabled: persisted?.aiEnabled ?? false,
    shopCode: persisted?.shopCode || DEMO_SHOP_CODE,
    payLinks: persisted?.payLinks ?? [],
    profiles: persisted?.profiles ?? [],
    products: persisted?.products ?? [],
    invoices: persisted?.invoices ?? [],
    sales: persisted?.sales ?? [],
    customers: persisted?.customers ?? [],
    suppliers: persisted?.suppliers ?? [],
    returns: persisted?.returns ?? [],
    dayCloses: persisted?.dayCloses ?? [],
    salarySlips: persisted?.salarySlips ?? [],
    monthCloses: persisted?.monthCloses ?? [],
    noticeReadIds: persisted?.noticeReadIds ?? [],
    expiryPopupOn: persisted?.expiryPopupOn ?? null,
  };

  let next = merged;
  if (fromVersion < 9) {
    next = {
      ...next,
      settings: { ...DEFAULT_SHOP_SETTINGS, ...(next.settings || {}) },
    };
  }
  if (fromVersion < 10) {
    const filled = fillEmptyShop(next);
    next = {
      ...filled.state,
      shopDataVersion: SHOP_DATA_VERSION,
    };
  }
  if (fromVersion < 11) {
    next = {
      ...next,
      splashSeen: false,
      aiEnabled: next.aiEnabled ?? false,
    };
  }
  if (fromVersion < 12) {
    next = {
      ...next,
      shopCode: next.shopCode || DEMO_SHOP_CODE,
      payLinks: next.payLinks ?? [],
      profiles: (next.profiles || []).map((p) => ({
        ...p,
        salary: p.salary ?? null,
        avatarDataUrl: p.avatarDataUrl ?? null,
        staffPerms: p.staffPerms ?? defaultStaffPerms(p.roles || ["maker"]),
        attendance: p.attendance ?? [],
        isOwner: p.isOwner ?? (p.roles?.includes("accountant") || p.isGuest),
      })),
    };
  }
  if (fromVersion < 13) {
    const { state: filled } = fillEmptyShop(next);
    const seedById = new Map(seedSales().map((s) => [s.id, s]));
    next = {
      ...filled,
      settings: { ...DEFAULT_SHOP_SETTINGS, ...(filled.settings || {}) },
      salarySlips: filled.salarySlips?.length ? filled.salarySlips : seedSalarySlips(),
      monthCloses: (filled as AppState).monthCloses ?? [],
      noticeReadIds: (filled as AppState).noticeReadIds ?? [],
      expiryPopupOn: null,
      sales: (filled.sales || []).map((s) => {
        const seed = seedById.get(s.id);
        return {
          ...s,
          billFormats: s.billFormats?.length
            ? s.billFormats
            : seed?.billFormats || ["retail"],
          installments:
            s.installments?.length ? s.installments : seed?.installments ?? [],
        };
      }),
      profiles: (filled.profiles || []).map((p) => ({
        ...p,
        payMode: p.payMode ?? "cash",
        pfType: p.pfType ?? "non_pf",
      })),
    };
  }
  next.shopDataVersion = SHOP_DATA_VERSION;
  return next;
}

export function syncFill(state: AppState): { state: AppState; added: DemoCounts } {
  const { state: filled, added } = fillEmptyShop(state);
  return {
    state: { ...filled, shopDataVersion: SHOP_DATA_VERSION },
    added,
  };
}

export function addedTotal(added: DemoCounts): number {
  return Object.values(added).reduce((a, n) => a + n, 0);
}
