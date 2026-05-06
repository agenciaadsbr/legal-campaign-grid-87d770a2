import { useContext } from "react";
import { AuthContext, type AppRole } from "@/hooks/auth-context";

export type { AppRole };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
