import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { AttendanceDay, AttendanceStatus } from "@/lib/types";
import { attendanceFor, cycleStatus, monthGrid, todayKey } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export function AttendanceMonth({
  days,
  onCycle,
  readOnly,
}: {
  days: AttendanceDay[] | undefined;
  onCycle: (date: string, status: AttendanceStatus) => void;
  readOnly?: boolean;
}) {
  const { t } = useT();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const today = todayKey();
  const label = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated"
          onClick={() =>
            setCursor((c) =>
              c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
            )
          }
          aria-label={t("staff.prevMonth")}
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-[13px] font-semibold text-fg">{label}</p>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated"
          onClick={() =>
            setCursor((c) =>
              c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
            )
          }
          aria-label={t("staff.nextMonth")}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((d, i) => (
          <p key={`${d}-${i}`} className="text-center text-[10px] font-semibold text-muted">
            {d}
          </p>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const rec = attendanceFor(days, date);
          const status = rec?.status;
          return (
            <button
              key={date}
              type="button"
              disabled={readOnly}
              onClick={() => onCycle(date, cycleStatus(status))}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-md text-[11px] font-semibold",
                date === today && "ring-1 ring-primary",
                status === "present" && "bg-success/20 text-success",
                status === "half" && "bg-warning/20 text-warning",
                status === "leave" && "bg-primary/15 text-primary",
                status === "absent" && "bg-danger/15 text-danger",
                !status && "bg-elevated text-muted",
              )}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted">{t("staff.calHint")}</p>
    </div>
  );
}
