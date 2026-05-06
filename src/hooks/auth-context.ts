import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "editor" | "viewer";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);