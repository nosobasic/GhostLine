import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

// Types following strict TypeScript guidelines from rules.md
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  voice_enabled?: boolean;
  notifications_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

export type UseAuthReturn = AuthState & AuthActions;

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  // Helper to update auth state
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper to set error state
  const setError = useCallback((error: string | null) => {
    updateAuthState({ error, loading: false });
  }, [updateAuthState]);

  // Helper to set loading state
  const setLoading = useCallback((loading: boolean) => {
    updateAuthState({ loading });
  }, [updateAuthState]);

  // Fetch user profile data from database
  const fetchUserProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Update auth state with user and session data
  const setAuthUser = useCallback(async (user: User | null, session: Session | null) => {
    if (user && session) {
      // Fetch complete user profile from database
      const userProfile = await fetchUserProfile(user.id);
      
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        name: userProfile?.name || user.user_metadata?.name || '',
        avatar_url: userProfile?.avatar_url || user.user_metadata?.avatar_url || '',
        voice_enabled: userProfile?.voice_enabled ?? true,
        notifications_enabled: userProfile?.notifications_enabled ?? true,
        created_at: userProfile?.created_at || user.created_at,
        updated_at: userProfile?.updated_at || user.updated_at,
      };

      updateAuthState({
        user: authUser,
        session,
        loading: false,
        error: null,
        isAuthenticated: true,
      });
    } else {
      updateAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });
    }
  }, [fetchUserProfile, updateAuthState]);

  // Initialize auth state and set up listeners
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setError(error.message);
          }
          return;
        }

        if (mounted) {
          await setAuthUser(session?.user || null, session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to initialize authentication');
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await setAuthUser(session?.user || null, session);
      } else if (event === 'SIGNED_OUT') {
        await setAuthUser(null, null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthUser, setError]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        await setAuthUser(data.user, data.session);
        return { success: true };
      }

      setError('Sign in failed - no user data received');
      return { success: false, error: 'Sign in failed - no user data received' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError, setAuthUser]);

  // Sign up with email, password, and name
  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // The user will be automatically signed in after email verification
        // The database trigger will create the user profile
        setLoading(false);
        return { success: true };
      }

      setError('Sign up failed - no user data received');
      return { success: false, error: 'Sign up failed - no user data received' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError]);

  // Sign out
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      // Auth state will be updated by the auth listener
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError]);

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      setLoading(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    if (!authState.user) {
      return { success: false, error: 'No user logged in' };
    }

    setLoading(true);
    setError(null);

    try {
      // Update database profile
      const { error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authState.user.id);

      if (dbError) {
        setError(dbError.message);
        return { success: false, error: dbError.message };
      }

      // Update auth metadata if name or avatar changed
      if (updates.name || updates.avatar_url) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            name: updates.name || authState.user.name,
            avatar_url: updates.avatar_url || authState.user.avatar_url,
          },
        });

        if (authError) {
          setError(authError.message);
          return { success: false, error: authError.message };
        }
      }

      // Update local state
      updateAuthState({
        user: { ...authState.user, ...updates },
        loading: false,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [authState.user, setLoading, setError, updateAuthState]);

  // Update password
  const updatePassword = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      setLoading(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }

      await setAuthUser(session?.user || null, session);
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [setAuthUser]);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    clearError,
    refreshSession,
  };
}; 