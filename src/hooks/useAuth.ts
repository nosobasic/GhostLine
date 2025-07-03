import { useState, useEffect } from 'react';
import { auth } from '../lib/supabaseClient';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { user, error } = await auth.getCurrentUser();
      
      if (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error.message,
        });
        return;
      }

      if (user) {
        setAuthState({
          user: {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
          },
          loading: false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to check authentication status',
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user) {
        setAuthState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name,
            avatar_url: data.user.user_metadata?.avatar_url,
          },
          loading: false,
          error: null,
        });
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await auth.signUp(email, password, name);
      
      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user) {
        setAuthState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name,
            avatar_url: data.user.user_metadata?.avatar_url,
          },
          loading: false,
          error: null,
        });
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await auth.signOut();
      
      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signIn,
    signUp,
    signOut,
    clearError,
    isAuthenticated: !!authState.user,
  };
}; 