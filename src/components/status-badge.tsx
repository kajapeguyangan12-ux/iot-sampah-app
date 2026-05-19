import { getBinStatusLabel } from "@/lib/bin-status";
import { getStatusTone } from "@/lib/demo-data";
import type { BinStatus } from "@/types/domain";

type StatusBadgeProps = {
  status: BinStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusTone(
        status,
      )}`}
    >
      {getBinStatusLabel(status)}
    </span>
  );
}
