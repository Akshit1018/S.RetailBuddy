import {
  BookOpen,
  CalendarCheck,
  Camera,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Package,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Undo2,
  UserRound,
  Users,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";

const MAP = {
  home: LayoutDashboard,
  stock: Package,
  in: ScanLine,
  sell: ShoppingBag,
  bills: FileText,
  wa: MessageCircle,
  orders: Inbox,
  crm: Users,
  shop: Store,
  shopEdit: Store,
  review: ClipboardList,
  suppliers: Truck,
  returns: Undo2,
  day: CalendarCheck,
  ca: FileSpreadsheet,
  live: Sparkles,
  tools: Database,
  profile: UserRound,
  help: BookOpen,
  staff: Users,
} as const;

export function NavIcon({
  name,
  className,
  active,
}: {
  name: NavItem["icon"];
  className?: string;
  active?: boolean;
}) {
  const Icon = MAP[name] ?? Camera;
  return <Icon className={className} strokeWidth={active ? 2.35 : 1.85} />;
}
