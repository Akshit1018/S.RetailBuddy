import type { StaffPerms, UserRole } from "@/lib/types";

/** One shop job. Roles are bags of these. */
export type Permission =
  | "stock_in"
  | "sell"
  | "check"
  | "verify"
  | "close_day"
  | "gstr"
  | "settings"
  | "payments"
  | "returns"
  | "team"
  | "backup"
  | "salary"
  | "books";

export const ROLE_PERMS: Record<UserRole, readonly Permission[]> = {
  maker: ["stock_in", "sell", "returns"],
  salesman: ["sell", "returns"],
  checker: ["check", "sell", "payments"],
  owner: [
    "stock_in",
    "sell",
    "check",
    "verify",
    "close_day",
    "gstr",
    "settings",
    "payments",
    "returns",
    "team",
    "backup",
    "salary",
    "books",
  ],
  accountant: [
    "stock_in",
    "sell",
    "check",
    "verify",
    "close_day",
    "gstr",
    "settings",
    "payments",
    "returns",
    "team",
    "backup",
    "salary",
    "books",
  ],
  hr: ["team", "salary", "payments"],
};

export const PERM_LABEL: Record<Permission, string> = {
  stock_in: "Add stock",
  sell: "Sell",
  check: "Check bills",
  verify: "Verify stock",
  close_day: "Close the day",
  gstr: "GSTR export",
  settings: "Shop settings",
  payments: "Collect money",
  returns: "Returns",
  team: "Team roles",
  backup: "Backup / restore",
  salary: "Salary slips",
  books: "CA books",
};

export const ROLE_BLURB: Record<UserRole, string> = {
  maker: "Shop staff — add stock and sell.",
  salesman: "Counter — sell and take returns.",
  checker: "Owner helper — check bills and collect money.",
  owner: "Shop owner — everything, including staff and books.",
  accountant: "Accounts — GST, close day, CA pack, salary.",
  hr: "HR — attendance and salary slips only.",
};

export const ALL_ROLES: UserRole[] = [
  "owner",
  "salesman",
  "accountant",
  "hr",
  "maker",
  "checker",
];

/** Roles shown to a layman first. Maker/checker stay for old shops. */
export const HIRE_ROLES: UserRole[] = ["owner", "salesman", "accountant", "hr"];

export function hasPermission(
  roles: UserRole[] | null | undefined,
  perm: Permission,
): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => ROLE_PERMS[r]?.includes(perm));
}

export function hasAnyPermission(
  roles: UserRole[] | null | undefined,
  perms: Permission[],
): boolean {
  return perms.some((p) => hasPermission(roles, p));
}

export function canStockIn(roles: UserRole[]): boolean {
  return hasPermission(roles, "stock_in");
}

export function canCheck(roles: UserRole[]): boolean {
  return hasPermission(roles, "check");
}

export function canVerify(roles: UserRole[]): boolean {
  return hasPermission(roles, "verify");
}

export function canSell(roles: UserRole[]): boolean {
  return hasPermission(roles, "sell");
}

export function canCloseDay(roles: UserRole[]): boolean {
  return hasPermission(roles, "close_day");
}

export function canExportGst(roles: UserRole[]): boolean {
  return hasPermission(roles, "gstr");
}

export function canEditSettings(roles: UserRole[]): boolean {
  return hasPermission(roles, "settings");
}

export function canManagePayments(roles: UserRole[]): boolean {
  return hasPermission(roles, "payments");
}

export function canReturns(roles: UserRole[]): boolean {
  return hasPermission(roles, "returns");
}

export function canManageTeam(roles: UserRole[]): boolean {
  return hasPermission(roles, "team");
}

export function canSalary(roles: UserRole[]): boolean {
  return hasPermission(roles, "salary");
}

export function canBooks(roles: UserRole[]): boolean {
  return hasPermission(roles, "books");
}

export function canBackup(roles: UserRole[]): boolean {
  return hasPermission(roles, "backup") || (roles?.length ?? 0) > 0;
}

export function staffAllows(perm: Permission, perms?: StaffPerms | null): boolean {
  if (!perms) return true;
  if (perm === "stock_in") return perms.stockIn;
  if (perm === "sell") return perms.sell;
  if (perm === "payments") return perms.collectPay;
  return true;
}

/** Path-level gate. Open pages return true. */
export function canAccessPath(
  roles: UserRole[] | null | undefined,
  pathname: string,
  perms?: StaffPerms | null,
): boolean {
  if (pathname.startsWith("/stock-in"))
    return hasPermission(roles, "stock_in") && staffAllows("stock_in", perms);
  if (pathname.startsWith("/close-day")) return hasPermission(roles, "close_day");
  if (pathname.startsWith("/ca")) return hasPermission(roles, "books");
  if (pathname.startsWith("/returns")) return hasPermission(roles, "returns");
  if (pathname.startsWith("/review"))
    return hasAnyPermission(roles, ["check", "verify", "stock_in"]);
  if (pathname.startsWith("/sell"))
    return hasPermission(roles, "sell") && staffAllows("sell", perms);
  if (pathname.startsWith("/whatsapp")) return !perms || perms.whatsapp;
  if (pathname === "/stock" || (pathname.startsWith("/stock") && !pathname.startsWith("/stock-in")))
    return !perms || perms.viewStock;
  if (pathname.startsWith("/staff")) return true;
  return true;
}

export function pathPermission(pathname: string): Permission | Permission[] | null {
  if (pathname.startsWith("/stock-in")) return "stock_in";
  if (pathname.startsWith("/close-day")) return "close_day";
  if (pathname.startsWith("/ca")) return "books";
  if (pathname.startsWith("/returns")) return "returns";
  if (pathname.startsWith("/review")) return ["check", "verify"];
  if (pathname.startsWith("/sell")) return "sell";
  return null;
}

export function rolesForPermission(perm: Permission): UserRole[] {
  return ALL_ROLES.filter((r) => ROLE_PERMS[r].includes(perm));
}

export function denyMessage(perm: Permission): string {
  const who = rolesForPermission(perm)
    .slice(0, 3)
    .map((r) =>
      r === "maker"
        ? "Maker"
        : r === "checker"
          ? "Checker"
          : r === "owner"
            ? "Owner"
            : r === "salesman"
              ? "Salesman"
              : r === "hr"
                ? "HR"
                : "Accountant",
    )
    .join(" or ");
  return `Need ${who} role to ${PERM_LABEL[perm].toLowerCase()}.`;
}
