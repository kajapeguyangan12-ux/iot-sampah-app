"use client";

import L from "leaflet";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import type { WasteBin } from "@/types/domain";

const createIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 8px 18px rgba(0,0,0,0.18)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const icons = {
  kosong: createIcon("#1f6f50"),
  setengah: createIcon("#f3b84b"),
  penuh: createIcon("#db5f44"),
};

type BinMapClientProps = {
  bins: WasteBin[];
  showDirection?: boolean;
};

export function BinMapClient({
  bins,
  showDirection = false,
}: BinMapClientProps) {
  const mappableBins = bins.filter(
    (bin) => Number.isFinite(bin.lat) && Number.isFinite(bin.lng),
  );
  const center: [number, number] = mappableBins.length
    ? [mappableBins[0].lat, mappableBins[0].lng]
    : [-6.2, 106.816666];

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="min-h-[420px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappableBins.map((bin) => (
          <Marker
            key={bin.id}
            position={[bin.lat, bin.lng]}
            icon={icons[bin.status]}
          >
            <Popup>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{bin.locationName}</p>
                  <p className="text-slate-600">{bin.code}</p>
                </div>
                <div className="text-slate-700">
                  <p>Status: {bin.status}</p>
                  <p>Kapasitas: {bin.fillPercent}%</p>
                  <p>Device: {bin.deviceId}</p>
                </div>
                {showDirection ? (
                  <Link
                    href={`https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}`}
                    target="_blank"
                    className="inline-flex rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white"
                  >
                    Buka Arah
                  </Link>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
