import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { supabase } from "../lib/supabase";
import { hasSubscriptionAccess, isSuperAdminBypassMobile } from "../lib/subscription";
import type { MemberRole } from "../types/member";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasBusiness: boolean;
  businessId: string | null;
  /** First membership row role (used for owner-only actions such as deleting customers). */
  memberRole: MemberRole | null;
  /** False when the business subscription/trial blocks access (mirrors web app layout). True if no business yet. */
  subscriptionAccess: boolean;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const INTRO_KEY = "intro_slides_v1";

export { INTRO_KEY };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  /** First cold start: wait for getSession + membership. */
  const [loading, setLoading] = useState(true);
  /** After password sign-in: keep routing screens in loading until membership + subscription are resolved (avoids onboarding flash). */
  const [signInRoutingHold, setSignInRoutingHold] = useState(false);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [subscriptionAccess, setSubscriptionAccess] = useState(true);

  const loadMembershipAndSubscription = useCallback(async (u: User | null | undefined) => {
    if (!u?.id) {
      setHasBusiness(false);
      setBusinessId(null);
      setMemberRole(null);
      setSubscriptionAccess(true);
      return;
    }
    const { data } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", u.id)
      .limit(1)
      .maybeSingle();
    const bid = (data?.business_id as string | undefined) ?? null;
    const roleRaw = data?.role as string | undefined;
    const roleParsed: MemberRole | null =
      roleRaw === "owner" || roleRaw === "manager" || roleRaw === "cashier" || roleRaw === "viewer"
        ? roleRaw
        : null;
    setMemberRole(roleParsed);
    let subOk = true;
    if (bid) {
      const superBypass = isSuperAdminBypassMobile(u.id, u.email);
      subOk = superBypass || (await hasSubscriptionAccess(supabase, bid));
    }
    setBusinessId(bid);
    setHasBusiness(!!bid);
    setSubscriptionAccess(subOk);
  }, []);

  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") return;
      const u = userRef.current;
      if (u) void loadMembershipAndSubscription(u);
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [loadMembershipAndSubscription]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`business-billing:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "businesses",
          filter: `id=eq.${businessId}`,
        },
        () => {
          void loadMembershipAndSubscription(userRef.current);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [businessId, loadMembershipAndSubscription]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      loadMembershipAndSubscription(s?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      const hold = event === "SIGNED_IN" && Boolean(s?.user);
      if (hold) {
        setSignInRoutingHold(true);
      }
      void loadMembershipAndSubscription(s?.user ?? null).finally(() => {
        if (hold) {
          setSignInRoutingHold(false);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadMembershipAndSubscription]);

  const signOut = useCallback(async () => {
    setSignInRoutingHold(false);
    await supabase.auth.signOut();
    setHasBusiness(false);
    setBusinessId(null);
    setMemberRole(null);
    setSubscriptionAccess(true);
  }, []);

  const authBusy = loading || signInRoutingHold;

  const value = useMemo(
    () => ({
      session,
      user,
      loading: authBusy,
      hasBusiness,
      businessId,
      memberRole,
      subscriptionAccess,
      refreshMembership: async () => {
        await loadMembershipAndSubscription(user ?? null);
      },
      signOut,
    }),
    [
      session,
      user,
      authBusy,
      hasBusiness,
      businessId,
      memberRole,
      subscriptionAccess,
      loadMembershipAndSubscription,
      signOut,
    ],
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
