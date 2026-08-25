"use client";

import { useConnectivity } from "@/lib/hooks/use-connectivity";
import { ConnectivityContext } from "@/lib/hooks/use-connectivity-context";

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const connectivity = useConnectivity();
  return (
    <ConnectivityContext.Provider value={connectivity}>
      {children}
    </ConnectivityContext.Provider>
  );
}
