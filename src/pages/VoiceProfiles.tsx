import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVoiceProfiles, VoiceProfile } from '../hooks/useVoiceProfiles';
import { VoiceSettings } from '../lib/voiceClone';
import { PageLoadingSpinner } from '../components/ui/LoadingSpinner';
import VoiceProfileCard from '../components/voice/VoiceProfileCard';
import VoiceProfileCreator from '../components/voice/VoiceProfileCreator';
import VoiceSettingsPanel from '../components/voice/VoiceSettingsPanel';

// Types following strict TypeScript guidelines from rules.md
interface VoiceProfilesPageState {
  selectedProfile: VoiceProfile | null;
  showCreator: boolean;
  editingProfile: VoiceProfile | null;
  showSettings: boolean;
}

const VoiceProfiles: React.FC = () => {
  const { user } = useAuth();
  const {
    profiles,
    activeProfile,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    uploadVoiceSample,
    refresh,
    clearError
  } = useVoiceProfiles();

  const [pageState, setPageState] = useState<VoiceProfilesPageState>({
    selectedProfile: null,
    showCreator: false,
    editingProfile: null,
    showSettings: false,
  });

  // Update page state helper
  const updatePageState = useCallback((updates: Partial<VoiceProfilesPageState>) => {
    setPageState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle profile selection
  const handleSelectProfile = useCallback((profile: VoiceProfile) => {
    updatePageState({ selectedProfile: profile });
  }, [updatePageState]);

  // Handle profile activation
  const handleActivateProfile = useCallback((profile: VoiceProfile) => {
    setActiveProfile(profile);
  }, [setActiveProfile]);

  // Handle profile creation
  const handleCreateProfile = useCallback(async (
    name: string,
    settings: VoiceSettings,
    sampleBlob?: Blob
  ) => {
    try {
      const result = await createProfile(name, settings);
      
      if (result.success && result.profileId) {
        // Upload voice sample if provided
        if (sampleBlob) {
          await uploadVoiceSample(result.profileId, sampleBlob);
        }
        
        updatePageState({ showCreator: false });
        await refresh();
      } else {
        // Handle creation error
        console.error('Profile creation failed:', result.error);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }, [createProfile, uploadVoiceSample, refresh, updatePageState]);

  // Handle profile editing
  const handleEditProfile = useCallback((profile: VoiceProfile) => {
    updatePageState({ editingProfile: profile, showSettings: true });
  }, [updatePageState]);

  // Handle profile settings update
  const handleUpdateSettings = useCallback(async (
    profileId: string,
    settings: VoiceSettings
  ) => {
    const result = await updateProfile(profileId, { settings });
    
    if (result.success) {
      updatePageState({ showSettings: false, editingProfile: null });
      await refresh();
    }
  }, [updateProfile, refresh, updatePageState]);

  // Handle profile deletion
  const handleDeleteProfile = useCallback(async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this voice profile?')) {
      const result = await deleteProfile(profileId);
      
      if (result.success) {
        updatePageState({ selectedProfile: null });
        await refresh();
      }
    }
  }, [deleteProfile, refresh, updatePageState]);

  // Handle voice sample upload
  const handleUploadSample = useCallback(async (profileId: string, audioBlob: Blob) => {
    const result = await uploadVoiceSample(profileId, audioBlob);
    
    if (result.success) {
      await refresh();
    }
    
    return result;
  }, [uploadVoiceSample, refresh]);

  // Show loading state
  if (loading && profiles.length === 0) {
    return <PageLoadingSpinner message="Loading voice profiles..." />;
  }

  // Show error state
  if (error && profiles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load voice profiles</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Try again
            </button>
            <button
              onClick={clearError}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Voice Profiles</h1>
                <p className="text-sm text-gray-500">
                  {profiles.length} profile{profiles.length !== 1 ? 's' : ''} • {activeProfile ? `Active: ${activeProfile.name}` : 'No active profile'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded disabled:opacity-50"
                title="Refresh profiles"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <button
                onClick={() => updatePageState({ showCreator: true })}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && profiles.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 font-medium">Error</span>
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profiles.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No voice profiles yet</h3>
            <p className="text-gray-500 mb-6">Create your first voice profile to get started with voice customization.</p>
            <button
              onClick={() => updatePageState({ showCreator: true })}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Profile
            </button>
          </div>
        ) : (
          /* Profiles grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <VoiceProfileCard
                key={profile.id}
                profile={profile}
                isActive={activeProfile?.id === profile.id}
                onSelect={() => handleSelectProfile(profile)}
                onActivate={() => handleActivateProfile(profile)}
                onEdit={() => handleEditProfile(profile)}
                onDelete={() => handleDeleteProfile(profile.id)}
                onUploadSample={(blob) => handleUploadSample(profile.id, blob)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile Creator Modal */}
      {pageState.showCreator && (
        <VoiceProfileCreator
          onClose={() => updatePageState({ showCreator: false })}
          onSubmit={handleCreateProfile}
        />
      )}

      {/* Settings Panel */}
      {pageState.showSettings && pageState.editingProfile && (
        <VoiceSettingsPanel
          profile={pageState.editingProfile}
          onClose={() => updatePageState({ showSettings: false, editingProfile: null })}
          onSave={(settings) => handleUpdateSettings(pageState.editingProfile!.id, settings)}
        />
      )}
    </div>
  );
};

export default VoiceProfiles;