"use client";

import { type ConnectivityInfo } from "./use-connectivity";
import { createContext, useContext } from "react";

const ConnectivityContext = createContext<ConnectivityInfo | null>(null);

export function useConnectivityContext(): ConnectivityInfo {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error("useConnectivityContext must be used within ConnectivityProvider");
  return ctx;
}

export { ConnectivityContext };
