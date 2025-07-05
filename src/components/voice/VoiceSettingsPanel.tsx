import React, { useState, useCallback, useEffect } from 'react';
import { VoiceProfile } from '../../hooks/useVoiceProfiles';
import { VoiceSettings, voiceProcessor } from '../../lib/voiceClone';
import AudioPlayer from './AudioPlayer';
import { ButtonLoadingSpinner } from '../ui/LoadingSpinner';

// Types following strict TypeScript guidelines from rules.md
interface VoiceSettingsPanelProps {
  profile: VoiceProfile;
  onClose: () => void;
  onSave: (settings: VoiceSettings) => Promise<void>;
}

interface SettingsState {
  settings: VoiceSettings;
  isPreviewReady: boolean;
  isProcessing: boolean;
  previewUrl: string | null;
  hasChanges: boolean;
  error: string | null;
}

const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  profile,
  onClose,
  onSave
}) => {
  const [state, setState] = useState<SettingsState>({
    settings: { ...profile.settings },
    isPreviewReady: !!profile.sample_url,
    isProcessing: false,
    previewUrl: null,
    hasChanges: false,
    error: null
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Check if settings have changed
  const checkForChanges = useCallback((newSettings: VoiceSettings) => {
    const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(profile.settings);
    updateState({ hasChanges });
  }, [profile.settings, updateState]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...state.settings, ...newSettings };
    updateState({ settings: updatedSettings });
    checkForChanges(updatedSettings);
  }, [state.settings, updateState, checkForChanges]);

  // Generate preview with current settings
  const generatePreview = useCallback(async () => {
    if (!profile.sample_url) {
      updateState({ error: 'No voice sample available for preview' });
      return;
    }

    updateState({ isProcessing: true, error: null });

    try {
      // Fetch the original sample
      const response = await fetch(profile.sample_url);
      const originalBlob = await response.blob();

      // Apply voice processing with current settings
      const processedBlob = await voiceProcessor.processAudio(originalBlob, state.settings);
      
      // Clean up old preview URL
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }

      // Create new preview URL
      const previewUrl = URL.createObjectURL(processedBlob);
      
      updateState({
        previewUrl,
        isProcessing: false,
        isPreviewReady: true
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      updateState({
        error: 'Failed to generate voice preview',
        isProcessing: false
      });
    }
  }, [profile.sample_url, state.settings, state.previewUrl, updateState]);

  // Handle save
  const handleSave = useCallback(async () => {
    updateState({ isProcessing: true, error: null });

    try {
      await onSave(state.settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      updateState({
        error: 'Failed to save voice settings',
        isProcessing: false
      });
    }
  }, [state.settings, onSave, onClose, updateState]);

  // Handle reset to original
  const handleReset = useCallback(() => {
    updateState({
      settings: { ...profile.settings },
      hasChanges: false,
      error: null
    });
  }, [profile.settings, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
  }, [state.previewUrl]);

  // Format emotion display
  const formatEmotion = (emotion: string) => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Voice Profile</h2>
            <p className="text-sm text-gray-500">{profile.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error display */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">{state.error}</span>
              </div>
            </div>
          )}

          {/* Voice Settings */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Settings</h3>
              <p className="text-sm text-gray-500 mb-6">
                Adjust the voice characteristics and use the preview to hear the changes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Pitch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch: {state.settings.pitch > 0 ? '+' : ''}{state.settings.pitch}
                </label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={state.settings.pitch}
                  onChange={(e) => handleSettingsChange({ pitch: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Lower (-12)</span>
                  <span>Normal (0)</span>
                  <span>Higher (+12)</span>
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speed: {state.settings.speed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={state.settings.speed}
                  onChange={(e) => handleSettingsChange({ speed: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slower (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Faster (2.0x)</span>
                </div>
              </div>

              {/* Clarity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clarity: {Math.round(state.settings.clarity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={state.settings.clarity}
                  onChange={(e) => handleSettingsChange({ clarity: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Soft (50%)</span>
                  <span>Normal (100%)</span>
                  <span>Enhanced (200%)</span>
                </div>
              </div>

              {/* Emotion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emotion
                </label>
                <select
                  value={state.settings.emotion}
                  onChange={(e) => handleSettingsChange({ emotion: e.target.value as VoiceSettings['emotion'] })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="neutral">Neutral</option>
                  <option value="happy">Happy</option>
                  <option value="sad">Sad</option>
                  <option value="excited">Excited</option>
                  <option value="calm">Calm</option>
                </select>
              </div>
            </div>

            {/* Preview Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Voice Preview</h4>
                <button
                  onClick={generatePreview}
                  disabled={!profile.sample_url || state.isProcessing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {state.isProcessing ? (
                    <>
                      <ButtonLoadingSpinner />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8M3 16h.01M21 16h.01M6 12h.01M18 12h.01M9 12h8m0 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Generate Preview</span>
                    </>
                  )}
                </button>
              </div>

              {!profile.sample_url ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-sm text-gray-500">No voice sample available</p>
                  <p className="text-xs text-gray-400">Upload a voice sample to enable preview</p>
                </div>
              ) : state.previewUrl ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <svg className="w-4 h-4 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-indigo-800">Voice preview ready</span>
                    </div>
                    <AudioPlayer
                      audioUrl={state.previewUrl}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    <strong>Current settings:</strong> Pitch {state.settings.pitch > 0 ? '+' : ''}{state.settings.pitch}, Speed {state.settings.speed}x, Clarity {Math.round(state.settings.clarity * 100)}%, Emotion {formatEmotion(state.settings.emotion)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm text-gray-500">Click "Generate Preview" to hear your settings</p>
                  <p className="text-xs text-gray-400">Preview will be generated with current voice settings</p>
                </div>
              )}
            </div>

            {/* Change Summary */}
            {state.hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">Unsaved changes</span>
                </div>
                <p className="text-sm text-yellow-700">
                  You have made changes to the voice settings. Don't forget to save your changes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            disabled={!state.hasChanges}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Original
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={!state.hasChanges || state.isProcessing}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {state.isProcessing ? (
                <>
                  <ButtonLoadingSpinner />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettingsPanel;