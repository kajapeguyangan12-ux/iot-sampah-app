import type { BinStatus } from "@/types/domain";

export function deriveBinStatusFromFillPercent(fillPercent: number): BinStatus {
  if (fillPercent >= 90) {
    return "penuh";
  }

  if (fillPercent > 40) {
    return "setengah";
  }

  return "kosong";
}

export function getBinStatusLabel(status: BinStatus) {
  switch (status) {
    case "setengah":
      return "sedang";
    default:
      return status;
  }
}
