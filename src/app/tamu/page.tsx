"use client";

import { PublicMonitoringPage } from "@/components/public-monitoring-page";
import { RoleGate } from "@/components/role-gate";

export default function GuestPage() {
  return (
    <RoleGate allow="tamu">
      <PublicMonitoringPage />
    </RoleGate>
  );
}
