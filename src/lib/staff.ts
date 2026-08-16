import type { Profile, StaffPerms, AttendanceDay, AttendanceStatus, UserRole } from "@/lib/types";

export const DEMO_SHOP_CODE = "DK-7K4M";

export const PRODUCT_CATEGORIES = [
  "dairy",
  "grocery",
  "snacks",
  "oil",
  "personal",
  "medicine",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export function makeShopCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `DK-${tail}`;
}

export function normalizeShopCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function defaultStaffPerms(roles: UserRole[]): StaffPerms {
  const isAcc = roles.includes("accountant") || roles.includes("owner");
  const isCheck = roles.includes("checker") || roles.includes("owner");
  const isMaker =
    roles.includes("maker") || roles.includes("salesman") || roles.includes("owner");
  return {
    viewStock: true,
    stockIn: isAcc || isMaker,
    stockOut: isAcc || isMaker,
    sell: isAcc || isMaker || isCheck,
    whatsapp: !roles.includes("hr") || isAcc,
    collectPay: isAcc || isCheck,
    discountMode: isAcc ? "all" : isCheck ? "all" : "all",
    discountMaxPct: isAcc ? 25 : isCheck ? 10 : 5,
    discountProductIds: [],
    discountCategories: [],
  };
}

export function effectiveStaffPerms(profile: Profile | null | undefined): StaffPerms {
  if (!profile) return defaultStaffPerms(["maker"]);
  if (profile.staffPerms) {
    return { ...defaultStaffPerms(profile.roles), ...profile.staffPerms };
  }
  return defaultStaffPerms(profile.roles);
}

export function guessCategory(name: string): ProductCategory {
  const n = name.toLowerCase();
  if (/(crocin|dolo|combiflam|paracetamol|ors|betadine|tablet|syrup|capsule)/.test(n))
    return "medicine";
  if (/(milk|dahi|curd|paneer|amul|ghee|butter|cheese)/.test(n)) return "dairy";
  if (/(maggi|namkeen|chips|biscuit|cookie|haldiram|snack)/.test(n)) return "snacks";
  if (/(oil|fortune|sunflower|mustard|refined)/.test(n)) return "oil";
  if (/(soap|shampoo|paste|brush|detergent|surf)/.test(n)) return "personal";
  if (/(atta|rice|dal|salt|sugar|tea|aashirvaad|tata)/.test(n)) return "grocery";
  return "other";
}

export function maxDiscountPctForProduct(
  perms: StaffPerms,
  productId: string,
  productName: string,
): number {
  if (perms.discountMode === "none") return 0;
  if (perms.discountMode === "product") {
    if (!perms.discountProductIds.includes(productId)) return 0;
    return perms.discountMaxPct;
  }
  if (perms.discountMode === "category") {
    const cat = guessCategory(productName);
    if (!perms.discountCategories.includes(cat)) return 0;
    return perms.discountMaxPct;
  }
  return perms.discountMaxPct;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function attendanceFor(
  days: AttendanceDay[] | undefined,
  date: string,
): AttendanceDay | undefined {
  return days?.find((d) => d.date === date);
}

export function upsertAttendance(
  days: AttendanceDay[] | undefined,
  next: AttendanceDay,
): AttendanceDay[] {
  const list = [...(days ?? [])];
  const i = list.findIndex((d) => d.date === next.date);
  if (i >= 0) list[i] = { ...list[i], ...next };
  else list.push(next);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function cycleStatus(cur?: AttendanceStatus): AttendanceStatus {
  if (cur === "present") return "half";
  if (cur === "half") return "leave";
  if (cur === "leave") return "absent";
  if (cur === "absent") return "present";
  return "present";
}

export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function payPagePath(token: string): string {
  return `/pay/${token}`;
}

export function payPageUrl(token: string): string {
  if (typeof window === "undefined") return payPagePath(token);
  return `${window.location.origin}${payPagePath(token)}`;
}

export function staffInitial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

export function isShopOwner(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.isOwner) return true;
  return (
    profile.roles.includes("owner") ||
    profile.roles.includes("accountant") ||
    profile.roles.includes("checker")
  );
}
