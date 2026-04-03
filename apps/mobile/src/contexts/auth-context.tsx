import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasBusiness: boolean;
  businessId: string | null;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const INTRO_KEY = "intro_slides_v1";

export { INTRO_KEY };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const refreshMembership = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setHasBusiness(false);
      setBusinessId(null);
      return;
    }
    const { data } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    const bid = data?.business_id ?? null;
    setBusinessId(bid);
    setHasBusiness(!!bid);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      refreshMembership(s?.user?.id).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      refreshMembership(s?.user?.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshMembership]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setHasBusiness(false);
    setBusinessId(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      hasBusiness,
      businessId,
      refreshMembership: async () => refreshMembership(user?.id),
      signOut,
    }),
    [session, user, loading, hasBusiness, businessId, refreshMembership, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
