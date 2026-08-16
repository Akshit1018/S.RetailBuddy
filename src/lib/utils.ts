import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/lib/types";

export {
  canBackup,
  canBooks,
  canCheck,
  canCloseDay,
  canEditSettings,
  canExportGst,
  canManagePayments,
  canManageTeam,
  canReturns,
  canSalary,
  canSell,
  canStockIn,
  canVerify,
  hasPermission,
} from "@/lib/rbac";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateProductCode(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.slice(0, 3))
    .join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKU-${cleaned || "ITEM"}-${suffix}`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function roleLabel(role: UserRole): string {
  if (role === "owner") return "Owner";
  if (role === "salesman") return "Salesman";
  if (role === "hr") return "HR";
  if (role === "maker") return "Maker";
  if (role === "checker") return "Checker";
  return "Accountant";
}

export function rolesLabel(roles: UserRole[]): string {
  if (roles.length === 0) return "No role";
  if (roles.length >= 5) return "All roles";
  return roles.map(roleLabel).join(" · ");
}

export function hasRole(roles: UserRole[], role: UserRole): boolean {
  return roles.includes(role);
}
