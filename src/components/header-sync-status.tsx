"use client";

import { SyncStatusIndicator } from "@/components/sync-status-indicator";

export function HeaderSyncStatus() {
  return (
    <div className="ml-auto">
      <SyncStatusIndicator />
    </div>
  );
}
