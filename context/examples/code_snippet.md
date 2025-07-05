# GhostLine Code Examples

## Custom Hook Pattern

```typescript
// useMessages.ts - Custom hook for message management
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: string;
  content: string;
  user_id: string;
  conversation_id: string;
  is_voice: boolean;
  audio_url?: string;
  created_at: string;
}

export const useMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [conversationId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.conversation_id === conversationId) {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async (content: string, isVoice = false, audioUrl?: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          conversation_id: conversationId,
          is_voice: isVoice,
          audio_url: audioUrl,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages
  };
};
```

## Voice Processing Component

```typescript
// VoiceRecorder.tsx - Enhanced voice recording component
import React, { useState, useRef, useEffect } from 'react';
import { voiceProcessor, VoiceSettings } from '../lib/voiceClone';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  voiceSettings: VoiceSettings;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  voiceSettings
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAndSendAudio(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAndSendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Apply voice processing
      const processedAudio = await voiceProcessor.processAudio(audioBlob, voiceSettings);
      onRecordingComplete(processedAudio);
    } catch (error) {
      console.error('Error processing audio:', error);
      // Fallback to original audio
      onRecordingComplete(audioBlob);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="flex items-center space-x-4">
        {!isRecording && !isProcessing && (
          <button
            onClick={startRecording}
            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>
        )}
        
        {isRecording && (
          <>
            <button
              onClick={stopRecording}
              className="p-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
            </div>
          </>
        )}
        
        {isProcessing && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Supabase Integration Pattern

```typescript
// supabaseClient.ts - Enhanced client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          voice_enabled: boolean;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          voice_enabled?: boolean;
          notifications_enabled?: boolean;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
          voice_enabled?: boolean;
          notifications_enabled?: boolean;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          is_active?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          content: string;
          is_voice: boolean;
          duration: number | null;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          content: string;
          is_voice?: boolean;
          duration?: number | null;
          audio_url?: string | null;
        };
        Update: {
          content?: string;
        };
      };
    };
  };
}

// Utility functions
export const uploadVoiceMessage = async (audioBlob: Blob, fileName: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('voice-messages')
    .upload(fileName, audioBlob, {
      contentType: 'audio/wav'
    });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('voice-messages')
    .getPublicUrl(data.path);

  return publicUrl;
};
```

## Error Boundary Pattern

```typescript
// ErrorBoundary.tsx - Error handling component
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Loading State Pattern

```typescript
// LoadingSpinner.tsx - Reusable loading component
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

// Usage in components
const MyComponent: React.FC = () => {
  const { messages, loading, error } = useMessages('conversation-id');

  if (loading) return <LoadingSpinner message="Loading messages..." />;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
    </div>
  );
};
```