export const SENSOR_OFFLINE_THRESHOLD_MINUTES = 15;

export type SensorActivity = {
  isOnline: boolean;
  label: "aktif" | "offline";
  minutesSinceUpdate: number | null;
};

export function getSensorActivity(lastUpdate: string, now = Date.now()): SensorActivity {
  const lastUpdateTime = new Date(lastUpdate).getTime();

  if (Number.isNaN(lastUpdateTime)) {
    return {
      isOnline: false,
      label: "offline",
      minutesSinceUpdate: null,
    };
  }

  const minutesSinceUpdate = Math.max(
    0,
    Math.floor((now - lastUpdateTime) / 60_000),
  );
  const isOnline = minutesSinceUpdate <= SENSOR_OFFLINE_THRESHOLD_MINUTES;

  return {
    isOnline,
    label: isOnline ? "aktif" : "offline",
    minutesSinceUpdate,
  };
}

export function formatSensorLastSeen(lastUpdate: string, now = Date.now()) {
  const activity = getSensorActivity(lastUpdate, now);

  if (activity.minutesSinceUpdate === null) {
    return "Waktu update belum valid.";
  }

  if (activity.minutesSinceUpdate < 1) {
    return "Baru saja mengirim data.";
  }

  if (activity.minutesSinceUpdate === 1) {
    return "Terakhir kirim 1 menit lalu.";
  }

  return `Terakhir kirim ${activity.minutesSinceUpdate} menit lalu.`;
}
