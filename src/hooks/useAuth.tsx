import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { otpCall } from '@/lib/otpAuth';
import { preloadAvatar } from '@/hooks/useAvatarUrl';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  user_code: string | null;
  avatar_url?: string | null;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isReseller: boolean;
  signUp: (email: string, password: string, name: string, otp: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, otp: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);

  const fetchProfile = async (userId: string, retry = 0) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      // Resolve the avatar before exposing the profile so it renders without a letter fallback flash.
      await preloadAvatar((data as Profile).avatar_url).catch(() => null);
      setProfile(data as Profile);
    } else if (retry < 3) {
      // Retry: profile row may be created by trigger right after signup,
      // or RLS/session may still be settling.
      setTimeout(() => fetchProfile(userId, retry + 1), 500 * (retry + 1));
    }
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = (data || []).map((r: any) => r.role);
    setIsAdmin(roles.includes('admin'));
    setIsReseller(roles.includes('reseller'));
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let lastLoadedUserId: string | null = null;

    const hydrate = (userId: string | null) => {
      if (!userId) {
        lastLoadedUserId = null;
        setProfile(null);
        setIsAdmin(false);
        setIsReseller(false);
        return;
      }
      // Both getSession() and onAuthStateChange fire on boot — only load once.
      if (lastLoadedUserId === userId) return;
      lastLoadedUserId = userId;
      void fetchProfile(userId);
      void checkAdmin(userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      hydrate(session?.user?.id ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      hydrate(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Live wallet balance: react instantly to admin approvals / manual top-ups.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-balance-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            const next = payload.new as Profile;
            void preloadAvatar(next.avatar_url).finally(() => setProfile(next));
          }
        }
      )
      .subscribe();

    // Safety net if realtime drops: light polling + refresh on tab focus.
    const interval = window.setInterval(() => { void fetchProfile(user.id); }, 30000);
    const onFocus = () => { void fetchProfile(user.id); };
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);


  const signUp = async (email: string, password: string, name: string, otp: string) => {
    try {
      await otpCall({ action: 'signup', email: email.trim().toLowerCase(), password, name, otp_code: otp });
      return { error: null };
    } catch (e: any) {
      return { error: e as Error };
    }
  };

  const signIn = async (email: string, password: string, otp: string) => {
    try {
      await otpCall({ action: 'login', email: email.trim().toLowerCase(), password, otp_code: otp });
      return { error: null };
    } catch (e: any) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsReseller(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isAdmin, isReseller, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
