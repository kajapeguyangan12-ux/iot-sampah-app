import { getSensorActivity } from "@/lib/sensor-health";

type SensorActivityBadgeProps = {
  lastUpdate: string;
  now?: number;
};

export function SensorActivityBadge({
  lastUpdate,
  now,
}: SensorActivityBadgeProps) {
  const activity = getSensorActivity(lastUpdate, now);

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        activity.isOnline
          ? "border-brand/20 bg-brand/15 text-brand"
          : "border-danger/30 bg-danger/15 text-danger"
      }`}
    >
      Sensor {activity.label}
    </span>
  );
}
