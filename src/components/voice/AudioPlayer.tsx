import React, { useState, useRef, useEffect, useCallback } from 'react';

// Types following strict TypeScript guidelines from rules.md
interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
  autoPlay?: boolean;
  showDownload?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration,
  className = '',
  autoPlay = false,
  showDownload = false,
  onPlay,
  onPause,
  onEnded,
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle play/pause
  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play audio';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [isPlaying, onPlay, onPause, onError]);

  // Handle seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = () => {
      const errorMessage = 'Failed to load audio';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [onEnded, onError]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      togglePlayback();
    }
  }, [autoPlay, togglePlayback]);

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">Failed to load audio</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Progress Bar and Time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 font-mono">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-indigo-600 rounded-full transition-all duration-150"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={totalDuration}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>
          
          <span className="text-xs text-gray-500 font-mono">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* Download Button */}
      {showDownload && (
        <button
          onClick={() => window.open(audioUrl, '_blank')}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded transition-colors"
          title="Download audio"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default AudioPlayer;