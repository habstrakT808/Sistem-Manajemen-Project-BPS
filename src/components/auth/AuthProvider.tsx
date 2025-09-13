"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "@supabase/supabase-js";
import { Database } from "@/../database/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface AuthUser extends User {
  user_metadata: {
    role?: UserRole;
    nama_lengkap?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: Database["public"]["Tables"]["users"]["Row"] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
