import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/api/entities';

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project');

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();

    // Skip Supabase auth listener in demo mode
    if (isDemoMode) {
      return;
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await User.me();
          setUser(userData);
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
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

      // In demo mode, auto-login as demo user
      if (isDemoMode) {
        const userData = await User.me();
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userData = await User.me();
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
    } catch (error) {
      setAuthError({
        type: 'auth_failed',
        message: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signUp = async (email, password) => {
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

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setAuthError({
        type: 'signup_failed',
        message: error instanceof Error ? error.message : 'Sign up failed',
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
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
    window.location.href = '/login';
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
        isDemoMode,
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
