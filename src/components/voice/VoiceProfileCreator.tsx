import React, { useState, useCallback, useRef } from 'react';
import { VoiceSettings } from '../../lib/voiceClone';
import { voiceProcessor } from '../../lib/voiceClone';
import VoiceRecorder from '../VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import { ButtonLoadingSpinner } from '../ui/LoadingSpinner';

// Types following strict TypeScript guidelines from rules.md
interface VoiceProfileCreatorProps {
  onClose: () => void;
  onSubmit: (name: string, settings: VoiceSettings, sampleBlob?: Blob) => Promise<void>;
}

type CreatorStep = 'name' | 'settings' | 'sample' | 'preview' | 'creating';

interface CreatorState {
  step: CreatorStep;
  name: string;
  settings: VoiceSettings;
  sampleBlob: Blob | null;
  previewUrl: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

const VoiceProfileCreator: React.FC<VoiceProfileCreatorProps> = ({
  onClose,
  onSubmit
}) => {
  const [state, setState] = useState<CreatorState>({
    step: 'name',
    name: '',
    settings: {
      pitch: 0,
      speed: 1.0,
      clarity: 1.0,
      emotion: 'neutral'
    },
    sampleBlob: null,
    previewUrl: null,
    isRecording: false,
    isProcessing: false,
    error: null
  });

  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<CreatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle step navigation
  const goToStep = useCallback((step: CreatorStep) => {
    updateState({ step, error: null });
  }, [updateState]);

  const nextStep = useCallback(() => {
    const stepOrder: CreatorStep[] = ['name', 'settings', 'sample', 'preview'];
    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex < stepOrder.length - 1) {
      goToStep(stepOrder[currentIndex + 1]);
    }
  }, [state.step, goToStep]);

  const prevStep = useCallback(() => {
    const stepOrder: CreatorStep[] = ['name', 'settings', 'sample', 'preview'];
    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex > 0) {
      goToStep(stepOrder[currentIndex - 1]);
    }
  }, [state.step, goToStep]);

  // Handle name input
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ name: e.target.value });
  }, [updateState]);

  // Handle settings changes
  const handleSettingsChange = useCallback((newSettings: Partial<VoiceSettings>) => {
    updateState({ settings: { ...state.settings, ...newSettings } });
  }, [state.settings, updateState]);

  // Handle voice sample recording
  const handleSampleRecording = useCallback(async (audioBlob: Blob, duration: number) => {
    updateState({ isProcessing: true });

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(audioBlob);
      
      updateState({
        sampleBlob: audioBlob,
        previewUrl,
        isRecording: false,
        isProcessing: false
      });
    } catch (error) {
      console.error('Error processing voice sample:', error);
      updateState({
        error: 'Failed to process voice sample',
        isRecording: false,
        isProcessing: false
      });
    }
  }, [updateState]);

  // Handle preview with voice effects
  const handlePreview = useCallback(async () => {
    if (!state.sampleBlob) return;

    updateState({ isProcessing: true });

    try {
      const processedBlob = await voiceProcessor.processAudio(state.sampleBlob, state.settings);
      const processedUrl = URL.createObjectURL(processedBlob);
      
      // Clean up old preview URL
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
      
      updateState({
        previewUrl: processedUrl,
        isProcessing: false
      });
    } catch (error) {
      console.error('Error processing preview:', error);
      updateState({
        error: 'Failed to process voice preview',
        isProcessing: false
      });
    }
  }, [state.sampleBlob, state.settings, state.previewUrl, updateState]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      updateState({ error: 'Please enter a profile name' });
      return;
    }

    updateState({ step: 'creating', error: null });

    try {
      await onSubmit(state.name.trim(), state.settings, state.sampleBlob || undefined);
      onClose();
    } catch (error) {
      console.error('Error creating profile:', error);
      updateState({
        error: 'Failed to create voice profile',
        step: 'preview'
      });
    }
  }, [state.name, state.settings, state.sampleBlob, onSubmit, onClose, updateState]);

  // Validation helpers
  const canProceedFromName = state.name.trim().length > 0;
  const canProceedFromSettings = true; // Settings have defaults
  const canProceedFromSample = true; // Sample is optional
  const canCreate = canProceedFromName && canProceedFromSettings;

  // Step content components
  const renderNameStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Name</h3>
        <p className="text-sm text-gray-500 mb-4">
          Give your voice profile a memorable name.
        </p>
        <input
          type="text"
          value={state.name}
          onChange={handleNameChange}
          placeholder="e.g., Professional Voice, Casual Tone..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autoFocus
        />
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Voice Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Customize the voice characteristics for your profile.
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Lower</span>
            <span>Normal</span>
            <span>Higher</span>
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Slower</span>
            <span>Normal</span>
            <span>Faster</span>
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Soft</span>
            <span>Normal</span>
            <span>Enhanced</span>
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
    </div>
  );

  const renderSampleStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Voice Sample</h3>
        <p className="text-sm text-gray-500 mb-4">
          Record a voice sample to help customize your profile. This step is optional.
        </p>
      </div>

      {state.sampleBlob && state.previewUrl ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">Voice sample recorded</span>
            </div>
            <AudioPlayer
              audioUrl={state.previewUrl}
              className="w-full"
            />
          </div>
          
          <button
            onClick={() => updateState({ sampleBlob: null, previewUrl: null })}
            className="w-full px-4 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Record New Sample
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <VoiceRecorder
            onRecordingComplete={handleSampleRecording}
            isRecording={state.isRecording}
            onStartRecording={() => updateState({ isRecording: true })}
            onStopRecording={() => updateState({ isRecording: false })}
          />
          
          {state.isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
              <ButtonLoadingSpinner />
              <span className="text-sm">Processing sample...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Preview & Create</h3>
        <p className="text-sm text-gray-500 mb-4">
          Review your voice profile settings and create the profile.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Profile Name</h4>
          <p className="text-gray-600">{state.name}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Settings</h4>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-500">Pitch:</span> {state.settings.pitch > 0 ? '+' : ''}{state.settings.pitch}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Speed:</span> {state.settings.speed}x
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Clarity:</span> {Math.round(state.settings.clarity * 100)}%
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Emotion:</span> {state.settings.emotion}
            </div>
          </div>
        </div>
        
        {state.sampleBlob && state.previewUrl && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Voice Sample</h4>
            <AudioPlayer
              audioUrl={state.previewUrl}
              className="w-full"
            />
            <button
              onClick={handlePreview}
              disabled={state.isProcessing}
              className="mt-2 w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {state.isProcessing ? 'Processing...' : 'Preview with Voice Effects'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Profile</h3>
      <p className="text-sm text-gray-500">Please wait while we create your voice profile...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Voice Profile</h2>
            <p className="text-sm text-gray-500">
              Step {['name', 'settings', 'sample', 'preview'].indexOf(state.step) + 1} of 4
            </p>
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

        {/* Progress bar */}
        <div className="h-2 bg-gray-200">
          <div 
            className="h-2 bg-indigo-600 transition-all duration-300"
            style={{ 
              width: `${((['name', 'settings', 'sample', 'preview'].indexOf(state.step) + 1) / 4) * 100}%` 
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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

          {state.step === 'name' && renderNameStep()}
          {state.step === 'settings' && renderSettingsStep()}
          {state.step === 'sample' && renderSampleStep()}
          {state.step === 'preview' && renderPreviewStep()}
          {state.step === 'creating' && renderCreatingStep()}
        </div>

        {/* Footer */}
        {state.step !== 'creating' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={state.step === 'name'}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              
              {state.step === 'preview' ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canCreate}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Profile
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={
                    (state.step === 'name' && !canProceedFromName) ||
                    (state.step === 'settings' && !canProceedFromSettings) ||
                    (state.step === 'sample' && !canProceedFromSample)
                  }
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceProfileCreator;