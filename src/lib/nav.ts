export type AppHref =
  | "/"
  | "/stock"
  | "/stock-in"
  | "/sell"
  | "/bills"
  | "/whatsapp"
  | "/orders"
  | "/crm"
  | "/shop"
  | "/shop-edit"
  | "/review"
  | "/suppliers"
  | "/returns"
  | "/close-day"
  | "/ca"
  | "/connect"
  | "/tools"
  | "/profile"
  | "/help"
  | "/staff";

export type NavItem = {
  to: AppHref;
  search?: Record<string, string>;
  key: string;
  icon:
    | "home"
    | "stock"
    | "in"
    | "sell"
    | "bills"
    | "wa"
    | "orders"
    | "crm"
    | "shop"
    | "shopEdit"
    | "review"
    | "suppliers"
    | "returns"
    | "day"
    | "ca"
    | "live"
    | "tools"
    | "profile"
    | "help"
    | "staff";
};

export const DOCK_ITEMS: NavItem[] = [
  { to: "/", key: "nav.home", icon: "home" },
  { to: "/stock", key: "nav.stock", icon: "stock" },
  { to: "/sell", search: { mode: "product" }, key: "nav.sell", icon: "sell" },
  { to: "/bills", key: "nav.bills", icon: "bills" },
  { to: "/whatsapp", key: "nav.wa", icon: "wa" },
];

export const MORE_ITEMS: NavItem[] = [
  { to: "/stock-in", key: "menu.stockIn", icon: "in" },
  { to: "/review", key: "menu.review", icon: "review" },
  { to: "/returns", key: "menu.returns", icon: "returns" },
  { to: "/suppliers", key: "menu.suppliers", icon: "suppliers" },
  { to: "/close-day", key: "menu.day", icon: "day" },
  { to: "/ca", key: "menu.ca", icon: "ca" },
  { to: "/shop-edit", key: "menu.shopFront", icon: "shop" },
  { to: "/orders", key: "menu.orders", icon: "orders" },
  { to: "/crm", key: "menu.crm", icon: "crm" },
  { to: "/staff", key: "menu.staff", icon: "staff" },
  { to: "/profile", key: "menu.profile", icon: "profile" },
  { to: "/tools", key: "menu.tools", icon: "tools" },
  { to: "/help", key: "menu.help", icon: "help" },
];

export function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  if (to === "/stock")
    return pathname.startsWith("/stock") && !pathname.startsWith("/stock-in");
  if (to === "/sell") return pathname.startsWith("/sell");
  if (to === "/bills") return pathname.startsWith("/bills");
  if (to === "/shop") return pathname === "/shop";
  if (to === "/shop-edit") return pathname.startsWith("/shop-edit");
  return pathname.startsWith(to);
}

export function isMorePath(pathname: string) {
  return !DOCK_ITEMS.some((item) => isActivePath(pathname, item.to));
}
