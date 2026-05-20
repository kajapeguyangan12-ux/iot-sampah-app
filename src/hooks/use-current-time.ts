"use client";

import { useEffect, useState } from "react";

export function useCurrentTime(refreshIntervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshIntervalMs]);

  return now;
}
