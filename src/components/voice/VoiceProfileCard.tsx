import React, { useState, useCallback } from 'react';
import { VoiceProfile } from '../../hooks/useVoiceProfiles';
import AudioPlayer from './AudioPlayer';
import { ButtonLoadingSpinner } from '../ui/LoadingSpinner';
import VoiceRecorder from '../VoiceRecorder';

// Types following strict TypeScript guidelines from rules.md
interface VoiceProfileCardProps {
  profile: VoiceProfile;
  isActive: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadSample: (audioBlob: Blob) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const VoiceProfileCard: React.FC<VoiceProfileCardProps> = ({
  profile,
  isActive,
  onSelect,
  onActivate,
  onEdit,
  onDelete,
  onUploadSample
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle voice sample upload
  const handleSampleUpload = useCallback(async (audioBlob: Blob, duration: number) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await onUploadSample(audioBlob);
      
      if (result.success) {
        setShowRecorder(false);
      } else {
        setUploadError(result.error || 'Failed to upload voice sample');
      }
    } catch (error) {
      console.error('Error uploading voice sample:', error);
      setUploadError('Failed to upload voice sample');
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  }, [onUploadSample]);

  // Format emotion display
  const formatEmotion = (emotion: string) => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };

  // Get voice settings display
  const getSettingsDisplay = () => {
    const { pitch, speed, clarity, emotion } = profile.settings;
    return {
      pitch: pitch > 0 ? `+${pitch}` : pitch.toString(),
      speed: `${speed}x`,
      clarity: `${Math.round(clarity * 100)}%`,
      emotion: formatEmotion(emotion)
    };
  };

  const settingsDisplay = getSettingsDisplay();

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${isActive ? 'ring-2 ring-indigo-500' : ''}`}>
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{profile.name}</h3>
              <p className="text-sm text-gray-500">
                {isActive ? 'Active profile' : 'Available'}
              </p>
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="relative">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              onClick={onSelect}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Settings Display */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Pitch</span>
              <span className="text-sm text-gray-600">{settingsDisplay.pitch}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Speed</span>
              <span className="text-sm text-gray-600">{settingsDisplay.speed}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Clarity</span>
              <span className="text-sm text-gray-600">{settingsDisplay.clarity}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Emotion</span>
              <span className="text-sm text-gray-600">{settingsDisplay.emotion}</span>
            </div>
          </div>
        </div>

        {/* Voice Sample Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Voice Sample</h4>
            {!profile.sample_url && (
              <button
                onClick={() => setShowRecorder(!showRecorder)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showRecorder ? 'Cancel' : 'Record Sample'}
              </button>
            )}
          </div>

          {profile.sample_url ? (
            <div className="space-y-2">
              <AudioPlayer
                audioUrl={profile.sample_url}
                showDownload={true}
                className="w-full"
              />
              <button
                onClick={() => setShowRecorder(!showRecorder)}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium py-2"
              >
                {showRecorder ? 'Cancel' : 'Record New Sample'}
              </button>
            </div>
          ) : showRecorder ? (
            <div className="space-y-3">
              <VoiceRecorder
                onRecordingComplete={handleSampleUpload}
                isRecording={isRecording}
                onStartRecording={() => setIsRecording(true)}
                onStopRecording={() => setIsRecording(false)}
              />
              
              {isUploading && (
                <div className="flex items-center justify-center space-x-2 text-indigo-600">
                  <ButtonLoadingSpinner />
                  <span className="text-sm">Uploading sample...</span>
                </div>
              )}
              
              {uploadError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {uploadError}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">No voice sample</p>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isActive && (
              <button
                onClick={onActivate}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Activate
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              Edit
            </button>
          </div>
          
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceProfileCard;