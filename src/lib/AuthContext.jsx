import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/api/entities';

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project');

// Load user profile from the session user object without calling getUser()
// (avoids navigator.locks deadlock inside onAuthStateChange callbacks)
async function loadUserProfile(sessionUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionUser.id)
    .single();

  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    full_name: profile?.full_name || sessionUser.user_metadata?.full_name,
    avatar: profile?.avatar || sessionUser.user_metadata?.avatar_url,
    role: profile?.role || 'user',
    phone: profile?.phone || '',
    company: profile?.company || '',
    address: profile?.address || '',
    darkMode: profile?.dark_mode ?? false,
    theme: profile?.theme || 'light',
    notifications: profile?.notifications ?? true,
    emailReminders: profile?.email_reminders ?? true,
  };
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);
  // Set when the user lands via a Supabase password-recovery link. While true,
  // the app routes them to /ResetPassword regardless of auth state — they must
  // set a new password (or cancel) before doing anything else.
  //
  // The flag is set by an inline script in index.html that runs BEFORE the
  // Supabase client imports (and consumes the URL hash). Reading sessionStorage
  // here guarantees the very first render already routes to /ResetPassword.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (sessionStorage.getItem('wasla_password_recovery') === '1') return true;
    } catch (e) { /* ignore */ }
    const hash = window.location.hash || '';
    return hash.includes('type=recovery');
  });

  useEffect(() => {
    // In demo mode, skip Supabase entirely
    if (isDemoMode) {
      (async () => {
        try {
          setIsLoadingAuth(true);
          const userData = await User.me();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Demo auth failed:', error);
        } finally {
          setIsLoadingAuth(false);
        }
      })();
      return;
    }

    // Use onAuthStateChange as the single source of truth for auth state.
    // CRITICAL: The callback MUST be synchronous (no async/await). In Supabase
    // JS v2.65+, the callback runs inside a navigator.locks scope. Any Supabase
    // call (even .from().select()) internally calls getSession() which re-acquires
    // the same lock, causing a deadlock. Defer the profile load via setTimeout
    // to run outside the lock, and only mark loading complete once it resolves —
    // this avoids the flicker where the navbar briefly renders without an avatar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            setIsAuthenticated(true);
            // Stay in loading state until the full profile arrives, so the app
            // never renders a half-populated user object.
            setTimeout(() => {
              loadUserProfile(session.user)
                .then(setUser)
                .catch((error) => {
                  console.error('Failed to load profile:', error);
                  // Fall back to session-derived data so the app still works.
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || session.user.email,
                    role: 'user',
                    darkMode: false,
                    theme: 'light',
                  });
                })
                .finally(() => setIsLoadingAuth(false));
            }, 0);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
          setTimeout(() => {
            loadUserProfile(session.user)
              .then(setUser)
              .catch((error) => console.error('Failed to load profile:', error));
          }, 0);
        } else if (event === 'PASSWORD_RECOVERY') {
          // User arrived from a recovery email — Supabase has just established
          // a session for them. Flag the app so they're routed to /ResetPassword.
          setIsPasswordRecovery(true);
          if (session?.user) setIsAuthenticated(true);
          setIsLoadingAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setIsPasswordRecovery(false);
          try { sessionStorage.removeItem('wasla_password_recovery'); } catch (e) { /* ignore */ }
        } else if (event === 'USER_UPDATED') {
          // Fires after supabase.auth.updateUser() — e.g. password reset succeeded.
          setIsPasswordRecovery(false);
          try { sessionStorage.removeItem('wasla_password_recovery'); } catch (e) { /* ignore */ }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user)
              .then(setUser)
              .catch((error) => console.error('Failed to refresh user data:', error));
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (isDemoMode) {
        const userData = await User.me();
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }

      // checkAppState is called manually (e.g., retry button), NOT inside
      // onAuthStateChange, so getSession() is safe here.
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userData = await loadUserProfile(session.user);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    setAuthError(null);

    if (isDemoMode) {
      const userData = await User.me();
      setUser(userData);
      setIsAuthenticated(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const userData = await User.me();
    setUser(userData);
    setIsAuthenticated(true);
  };

  const signUp = async (email, password) => {
    setAuthError(null);

    if (isDemoMode) {
      const userData = await User.me();
      setUser(userData);
      setIsAuthenticated(true);
      return { confirmEmail: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // If user already exists with email confirmations enabled,
    // Supabase returns a fake user with empty identities
    if (data?.user?.identities?.length === 0) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    // If no session returned, email confirmation is required
    if (!data.session) {
      return { confirmEmail: true };
    }

    // Session exists (auto-confirm is on), log in immediately
    const userData = await User.me();
    setUser(userData);
    setIsAuthenticated(true);
    return { confirmEmail: false };
  };

  const resetPassword = async (email) => {
    if (isDemoMode) return true;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ResetPassword`,
    });
    if (error) throw error;
    return true;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    try { sessionStorage.removeItem('wasla_password_recovery'); } catch (e) { /* ignore */ }
  };

  const resendConfirmation = async (email) => {
    try {
      if (isDemoMode) return true;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Resend confirmation error:", error);
      throw error;
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (!isDemoMode) {
      await supabase.auth.signOut();
    }

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    // State-based: clearing auth triggers Login route in App.jsx
    setUser(null);
    setIsAuthenticated(false);
  };

  // Re-fetch the current user's profile and broadcast it. Settings calls this
  // after avatar upload or profile save so the navbar avatar/name update
  // immediately without a page reload.
  const refreshUser = async () => {
    if (isDemoMode) {
      const userData = await User.me();
      setUser(userData);
      return userData;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const userData = await loadUserProfile(session.user);
    setUser(userData);
    return userData;
  };

  // Optimistic patch — let Settings push fields it just saved without waiting
  // for a network round-trip. Avoids a flicker between save and refresh.
  const patchUser = (partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
        login,
        signUp,
        resendConfirmation,
        resetPassword,
        refreshUser,
        patchUser,
        isDemoMode,
        isPasswordRecovery,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
