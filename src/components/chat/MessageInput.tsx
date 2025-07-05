import React, { useState, useRef, useCallback } from 'react';
import VoiceRecorder from '../VoiceRecorder';
import { ButtonLoadingSpinner } from '../ui/LoadingSpinner';
import { voiceProcessor } from '../../lib/voiceClone';
import { VoiceProfile } from '../../hooks/useVoiceProfiles';

// Types following strict TypeScript guidelines from rules.md
interface MessageInputProps {
  onSendMessage: (content: string, isVoice?: boolean, audioUrl?: string, duration?: number) => Promise<{ success: boolean; error?: string }>;
  onUploadVoiceMessage?: (audioBlob: Blob) => Promise<{ success: boolean; url?: string; error?: string }>;
  activeVoiceProfile?: VoiceProfile | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onUploadVoiceMessage,
  activeVoiceProfile,
  disabled = false,
  placeholder = 'Type your message...',
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // Max 120px height
    }
  }, []);

  // Handle text input change
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    setError(null);
  }, [adjustTextareaHeight]);

  // Handle text message send
  const handleSendTextMessage = useCallback(async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    setError(null);

    try {
      const result = await onSendMessage(message.trim());
      
      if (result.success) {
        setMessage('');
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, disabled, onSendMessage]);

  // Handle voice message completion
  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    setIsProcessingVoice(true);
    setError(null);

    try {
      // Apply voice processing if active profile exists
      let processedAudioBlob = audioBlob;
      if (activeVoiceProfile?.settings) {
        try {
          processedAudioBlob = await voiceProcessor.processAudio(audioBlob, activeVoiceProfile.settings);
        } catch (processingError) {
          console.warn('Voice processing failed, using original audio:', processingError);
          // Continue with original audio if processing fails
        }
      }

      // Upload voice message if handler provided
      let audioUrl: string | undefined;
      if (onUploadVoiceMessage) {
        const uploadResult = await onUploadVoiceMessage(processedAudioBlob);
        if (uploadResult.success) {
          audioUrl = uploadResult.url;
        } else {
          setError(uploadResult.error || 'Failed to upload voice message');
          return;
        }
      }

      // Send voice message
      const result = await onSendMessage(
        'Voice message', // Default content for voice messages
        true, // isVoice
        audioUrl,
        duration
      );

      if (!result.success) {
        setError(result.error || 'Failed to send voice message');
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
      setError('Failed to process voice message');
    } finally {
      setIsProcessingVoice(false);
      setIsRecording(false);
    }
  }, [activeVoiceProfile, onUploadVoiceMessage, onSendMessage]);

  // Handle key press for sending
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  }, [handleSendTextMessage]);

  // Handle recording state changes
  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setError(null);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const canSendText = message.trim() && !isSending && !disabled;
  const isProcessing = isSending || isProcessingVoice;

  return (
    <div className={`border-t border-gray-200 bg-white ${className}`}>
      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Active voice profile indicator */}
      {activeVoiceProfile && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-indigo-700">
              Using voice profile: <span className="font-medium">{activeVoiceProfile.name}</span>
            </span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-end space-x-4">
          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? 'Recording voice message...' : placeholder}
              disabled={disabled || isRecording || isProcessing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
              rows={1}
              style={{ minHeight: '48px' }}
            />
            
            {/* Character count for long messages */}
            {message.length > 500 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {message.length}/1000
              </div>
            )}
          </div>

          {/* Voice recorder */}
          <div className="flex-shrink-0">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              disabled={disabled || isProcessing}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendTextMessage}
            disabled={!canSendText}
            className="flex-shrink-0 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 transition-colors flex items-center space-x-2"
          >
            {isSending ? (
              <>
                <ButtonLoadingSpinner />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="mt-3 flex items-center justify-center space-x-2 text-red-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Recording voice message...</span>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessingVoice && (
          <div className="mt-3 flex items-center justify-center space-x-2 text-indigo-600">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Processing voice message...</span>
          </div>
        )}

        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
          {activeVoiceProfile && (
            <span className="ml-2">• Voice effects will be applied to recordings</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;