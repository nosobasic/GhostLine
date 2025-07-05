import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { VoiceSettings } from '../lib/voiceClone';

// Types following strict TypeScript guidelines from rules.md
export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  settings: VoiceSettings;
  sample_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceProfileState {
  profiles: VoiceProfile[];
  activeProfile: VoiceProfile | null;
  loading: boolean;
  error: string | null;
}

export interface VoiceProfileActions {
  createProfile: (name: string, settings: VoiceSettings, sampleUrl?: string) => Promise<{ success: boolean; profileId?: string; error?: string }>;
  updateProfile: (id: string, updates: Partial<VoiceProfile>) => Promise<{ success: boolean; error?: string }>;
  deleteProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
  setActiveProfile: (profile: VoiceProfile | null) => void;
  uploadVoiceSample: (profileId: string, audioBlob: Blob) => Promise<{ success: boolean; url?: string; error?: string }>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export type UseVoiceProfilesReturn = VoiceProfileState & VoiceProfileActions;

export const useVoiceProfiles = (): UseVoiceProfilesReturn => {
  const [profileState, setProfileState] = useState<VoiceProfileState>({
    profiles: [],
    activeProfile: null,
    loading: true,
    error: null,
  });

  // Helper to update profile state
  const updateProfileState = useCallback((updates: Partial<VoiceProfileState>) => {
    setProfileState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper to set error state
  const setError = useCallback((error: string | null) => {
    updateProfileState({ error, loading: false });
  }, [updateProfileState]);

  // Helper to set loading state
  const setLoading = useCallback((loading: boolean) => {
    updateProfileState({ loading });
  }, [updateProfileState]);

  // Fetch voice profiles for the current user
  const fetchProfiles = useCallback(async (): Promise<void> => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('voice_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice profiles:', error);
        setError(error.message);
        return;
      }

      const profiles = (data || []).map((profile: any) => ({
        ...profile,
        settings: profile.settings || {
          pitch: 0,
          speed: 1.0,
          clarity: 1.0,
          emotion: 'neutral' as const,
        },
      }));

      // Set the first active profile as default if none is selected
      const activeProfile = profiles.find((p: VoiceProfile) => p.is_active) || profiles[0] || null;

      updateProfileState({
        profiles,
        activeProfile,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching voice profiles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch voice profiles';
      setError(errorMessage);
    }
  }, [setError, updateProfileState]);

  // Subscribe to real-time profile updates
  const subscribeToProfiles = useCallback(() => {
    console.log('Subscribing to voice profile updates');

    const subscription = supabase
      .channel('voice_profiles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_profiles',
        },
        (payload: any) => {
          console.log('New voice profile created:', payload.new);
          const newProfile = payload.new as VoiceProfile;
          
          setProfileState(prev => {
            const exists = prev.profiles.some(profile => profile.id === newProfile.id);
            if (exists) return prev;
            
            return {
              ...prev,
              profiles: [newProfile, ...prev.profiles],
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_profiles',
        },
        (payload: any) => {
          console.log('Voice profile updated:', payload.new);
          const updatedProfile = payload.new as VoiceProfile;
          
          setProfileState(prev => ({
            ...prev,
            profiles: prev.profiles.map(profile =>
              profile.id === updatedProfile.id ? { ...profile, ...updatedProfile } : profile
            ),
            activeProfile: prev.activeProfile?.id === updatedProfile.id 
              ? { ...prev.activeProfile, ...updatedProfile }
              : prev.activeProfile,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'voice_profiles',
        },
        (payload: any) => {
          console.log('Voice profile deleted:', payload.old);
          const deletedProfile = payload.old as VoiceProfile;
          
          setProfileState(prev => {
            const updatedProfiles = prev.profiles.filter(profile => profile.id !== deletedProfile.id);
            const newActiveProfile = prev.activeProfile?.id === deletedProfile.id 
              ? updatedProfiles[0] || null
              : prev.activeProfile;
            
            return {
              ...prev,
              profiles: updatedProfiles,
              activeProfile: newActiveProfile,
            };
          });
        }
      )
      .subscribe((status: any) => {
        console.log('Voice profile subscription status:', status);
      });

    return subscription;
  }, []);

  // Initialize profiles and subscription
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await fetchProfiles();
      }
    };

    initialize();

    // Set up real-time subscription
    const subscription = subscribeToProfiles();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfiles, subscribeToProfiles]);

  // Create a new voice profile
  const createProfile = useCallback(async (
    name: string,
    settings: VoiceSettings,
    sampleUrl?: string
  ): Promise<{ success: boolean; profileId?: string; error?: string }> => {
    if (!name.trim()) {
      return { success: false, error: 'Profile name cannot be empty' };
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('voice_profiles')
        .insert({
          user_id: user.id,
          name: name.trim(),
          settings,
          sample_url: sampleUrl || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating voice profile:', error);
        return { success: false, error: error.message };
      }

      console.log('Voice profile created successfully:', data);
      return { success: true, profileId: data.id };
    } catch (error) {
      console.error('Error creating voice profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create voice profile';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Update a voice profile
  const updateProfile = useCallback(async (
    id: string,
    updates: Partial<VoiceProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('voice_profiles')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating voice profile:', error);
        return { success: false, error: error.message };
      }

      console.log('Voice profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating voice profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update voice profile';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Delete a voice profile
  const deleteProfile = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('voice_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting voice profile:', error);
        return { success: false, error: error.message };
      }

      console.log('Voice profile deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete voice profile';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Set active voice profile
  const setActiveProfile = useCallback((profile: VoiceProfile | null) => {
    updateProfileState({ activeProfile: profile });
  }, [updateProfileState]);

  // Upload voice sample for a profile
  const uploadVoiceSample = useCallback(async (
    profileId: string,
    audioBlob: Blob
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `voice-samples/${profileId}-${timestamp}.wav`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-samples')
        .upload(fileName, audioBlob, {
          contentType: 'audio/wav',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading voice sample:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(data.path);

      // Update profile with sample URL
      const updateResult = await updateProfile(profileId, { sample_url: publicUrl });
      
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      console.log('Voice sample uploaded successfully:', publicUrl);
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error uploading voice sample:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload voice sample';
      return { success: false, error: errorMessage };
    }
  }, [updateProfile]);

  // Refresh profiles
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    await fetchProfiles();
  }, [fetchProfiles, setLoading, setError]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    ...profileState,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    uploadVoiceSample,
    refresh,
    clearError,
  };
};