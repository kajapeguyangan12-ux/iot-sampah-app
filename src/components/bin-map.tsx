"use client";

import dynamic from "next/dynamic";

import type { WasteBin } from "@/types/domain";

const BinMapDynamic = dynamic(
  () => import("@/components/bin-map-client").then((mod) => mod.BinMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-[1.75rem] border border-line bg-surface text-sm text-foreground/60">
        Memuat peta sebaran tong sampah...
      </div>
    ),
  },
);

type BinMapProps = {
  bins: WasteBin[];
  showDirection?: boolean;
};

export function BinMap(props: BinMapProps) {
  return <BinMapDynamic {...props} />;
}
