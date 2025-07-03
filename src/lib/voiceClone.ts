// Voice cloning and processing utilities

export interface VoiceSettings {
  pitch: number;
  speed: number;
  clarity: number;
  emotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
}

export interface VoiceProfile {
  id: string;
  name: string;
  settings: VoiceSettings;
  sampleUrl?: string;
  isActive: boolean;
}

export class VoiceProcessor {
  private audioContext: AudioContext | null = null;
  private voiceProfiles: VoiceProfile[] = [];

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  // Process audio with voice settings
  async processAudio(audioBlob: Blob, settings: VoiceSettings): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Apply voice processing effects
      const processedBuffer = await this.applyVoiceEffects(audioBuffer, settings);
      
      // Convert back to blob
      return await this.audioBufferToBlob(processedBuffer);
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  private async applyVoiceEffects(audioBuffer: AudioBuffer, settings: VoiceSettings): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    const pitchNode = this.createPitchShifter(settings.pitch);
    const speedNode = this.createSpeedController(settings.speed);

    source.buffer = audioBuffer;
    source.connect(pitchNode);
    pitchNode.connect(speedNode);
    speedNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Create a new buffer with the processed audio
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Apply effects and copy to new buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      for (let i = 0; i < audioBuffer.length; i++) {
        // Apply pitch shift
        const pitchShiftedIndex = Math.floor(i * Math.pow(2, settings.pitch / 12));
        if (pitchShiftedIndex < inputData.length) {
          outputData[i] = inputData[pitchShiftedIndex];
        }
        
        // Apply speed adjustment
        const speedAdjustedIndex = Math.floor(i * settings.speed);
        if (speedAdjustedIndex < inputData.length) {
          outputData[i] = inputData[speedAdjustedIndex];
        }
        
        // Apply clarity enhancement
        outputData[i] *= settings.clarity;
      }
    }

    return processedBuffer;
  }

  private createPitchShifter(pitch: number) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const pitchNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    pitchNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const output = event.outputBuffer.getChannelData(0);
      
      for (let i = 0; i < input.length; i++) {
        const pitchShiftedIndex = Math.floor(i * Math.pow(2, pitch / 12));
        if (pitchShiftedIndex < input.length) {
          output[i] = input[pitchShiftedIndex];
        }
      }
    };

    return pitchNode;
  }

  private createSpeedController(speed: number) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const speedNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    speedNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const output = event.outputBuffer.getChannelData(0);
      
      for (let i = 0; i < input.length; i++) {
        const speedAdjustedIndex = Math.floor(i * speed);
        if (speedAdjustedIndex < input.length) {
          output[i] = input[speedAdjustedIndex];
        }
      }
    };

    return speedNode;
  }

  private async audioBufferToBlob(audioBuffer: AudioBuffer): Promise<Blob> {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    
    // Create WAV file
    const buffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Voice profile management
  addVoiceProfile(profile: VoiceProfile) {
    this.voiceProfiles.push(profile);
  }

  getVoiceProfile(id: string): VoiceProfile | undefined {
    return this.voiceProfiles.find(profile => profile.id === id);
  }

  updateVoiceProfile(id: string, updates: Partial<VoiceProfile>) {
    const index = this.voiceProfiles.findIndex(profile => profile.id === id);
    if (index !== -1) {
      this.voiceProfiles[index] = { ...this.voiceProfiles[index], ...updates };
    }
  }

  removeVoiceProfile(id: string) {
    this.voiceProfiles = this.voiceProfiles.filter(profile => profile.id !== id);
  }

  getAllVoiceProfiles(): VoiceProfile[] {
    return [...this.voiceProfiles];
  }

  // Utility functions
  async analyzeVoice(audioBlob: Blob): Promise<VoiceSettings> {
    // This would typically involve more sophisticated audio analysis
    // For now, return default settings
    return {
      pitch: 0,
      speed: 1.0,
      clarity: 1.0,
      emotion: 'neutral'
    };
  }

  async cloneVoice(audioSamples: Blob[]): Promise<VoiceProfile> {
    // This would involve AI/ML processing to create a voice clone
    // For now, create a basic profile
    const profile: VoiceProfile = {
      id: `voice_${Date.now()}`,
      name: 'Cloned Voice',
      settings: {
        pitch: 0,
        speed: 1.0,
        clarity: 1.0,
        emotion: 'neutral'
      },
      isActive: true
    };

    this.addVoiceProfile(profile);
    return profile;
  }
}

// Export singleton instance
export const voiceProcessor = new VoiceProcessor(); 