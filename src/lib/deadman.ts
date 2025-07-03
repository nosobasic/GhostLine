// Deadman switch utility for connection monitoring and fallback mechanisms

export interface ConnectionStatus {
  isConnected: boolean;
  lastHeartbeat: Date;
  latency: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export interface DeadmanConfig {
  heartbeatInterval: number; // milliseconds
  timeoutThreshold: number; // milliseconds
  maxRetries: number;
  fallbackMode: boolean;
}

export class DeadmanSwitch {
  private config: DeadmanConfig;
  private status: ConnectionStatus;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null;
  private onFallback: (() => void) | null = null;

  constructor(config: Partial<DeadmanConfig> = {}) {
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      timeoutThreshold: 60000, // 60 seconds
      maxRetries: 3,
      fallbackMode: false,
      ...config,
    };

    this.status = {
      isConnected: false,
      lastHeartbeat: new Date(),
      latency: 0,
      quality: 'disconnected',
    };
  }

  // Start monitoring
  start() {
    this.stop(); // Clear any existing timer
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }

  // Stop monitoring
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Perform heartbeat check
  private async performHeartbeat() {
    try {
      const startTime = Date.now();
      const success = await this.checkConnection();
      const latency = Date.now() - startTime;

      if (success) {
        this.updateStatus({
          isConnected: true,
          lastHeartbeat: new Date(),
          latency,
          quality: this.calculateQuality(latency),
        });
        this.retryCount = 0;
      } else {
        this.handleConnectionFailure();
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      this.handleConnectionFailure();
    }
  }

  // Check connection health
  private async checkConnection(): Promise<boolean> {
    try {
      // Check if we're online
      if (!navigator.onLine) {
        return false;
      }

      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      console.warn('Connection check failed:', error);
      return false;
    }
  }

  // Handle connection failure
  private handleConnectionFailure() {
    this.retryCount++;
    
    if (this.retryCount >= this.config.maxRetries) {
      this.updateStatus({
        isConnected: false,
        lastHeartbeat: new Date(),
        latency: 0,
        quality: 'disconnected',
      });

      if (this.config.fallbackMode) {
        this.activateFallback();
      }
    } else {
      this.updateStatus({
        isConnected: false,
        lastHeartbeat: new Date(),
        latency: 0,
        quality: 'poor',
      });
    }
  }

  // Calculate connection quality based on latency
  private calculateQuality(latency: number): ConnectionStatus['quality'] {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  }

  // Update connection status
  private updateStatus(newStatus: Partial<ConnectionStatus>) {
    const oldStatus = { ...this.status };
    this.status = { ...this.status, ...newStatus };

    // Notify listeners if status changed
    if (JSON.stringify(oldStatus) !== JSON.stringify(this.status)) {
      this.onStatusChange?.(this.status);
    }
  }

  // Activate fallback mode
  private activateFallback() {
    console.log('Activating fallback mode');
    this.onFallback?.();
  }

  // Manual heartbeat (for testing)
  async manualHeartbeat(): Promise<ConnectionStatus> {
    await this.performHeartbeat();
    return this.status;
  }

  // Get current status
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  // Set status change callback
  onStatusChangeCallback(callback: (status: ConnectionStatus) => void) {
    this.onStatusChange = callback;
  }

  // Set fallback callback
  onFallbackCallback(callback: () => void) {
    this.onFallback = callback;
  }

  // Update configuration
  updateConfig(newConfig: Partial<DeadmanConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Check if connection is stale (no recent heartbeat)
  isConnectionStale(): boolean {
    const timeSinceLastHeartbeat = Date.now() - this.status.lastHeartbeat.getTime();
    return timeSinceLastHeartbeat > this.config.timeoutThreshold;
  }

  // Force reconnect
  async forceReconnect(): Promise<boolean> {
    this.retryCount = 0;
    await this.performHeartbeat();
    return this.status.isConnected;
  }
}

// Network quality monitor
export class NetworkQualityMonitor {
  private deadmanSwitch: DeadmanSwitch;
  private qualityHistory: Array<{ timestamp: Date; quality: ConnectionStatus['quality'] }> = [];
  private maxHistorySize = 100;

  constructor() {
    this.deadmanSwitch = new DeadmanSwitch({
      heartbeatInterval: 15000, // 15 seconds
      timeoutThreshold: 45000, // 45 seconds
      maxRetries: 2,
      fallbackMode: true,
    });

    this.deadmanSwitch.onStatusChangeCallback((status) => {
      this.recordQuality(status.quality);
    });
  }

  // Start monitoring
  start() {
    this.deadmanSwitch.start();
  }

  // Stop monitoring
  stop() {
    this.deadmanSwitch.stop();
  }

  // Record quality measurement
  private recordQuality(quality: ConnectionStatus['quality']) {
    this.qualityHistory.push({
      timestamp: new Date(),
      quality,
    });

    // Keep history size manageable
    if (this.qualityHistory.length > this.maxHistorySize) {
      this.qualityHistory.shift();
    }
  }

  // Get average quality over time period
  getAverageQuality(minutes: number = 5): ConnectionStatus['quality'] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const recentHistory = this.qualityHistory.filter(
      entry => entry.timestamp > cutoffTime
    );

    if (recentHistory.length === 0) {
      return 'disconnected';
    }

    const qualityScores = {
      'excellent': 4,
      'good': 3,
      'poor': 2,
      'disconnected': 1,
    };

    const averageScore = recentHistory.reduce(
      (sum, entry) => sum + qualityScores[entry.quality],
      0
    ) / recentHistory.length;

    if (averageScore >= 3.5) return 'excellent';
    if (averageScore >= 2.5) return 'good';
    if (averageScore >= 1.5) return 'poor';
    return 'disconnected';
  }

  // Get connection recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const currentQuality = this.deadmanSwitch.getStatus().quality;
    const averageQuality = this.getAverageQuality();

    if (currentQuality === 'disconnected') {
      recommendations.push('Check your internet connection');
      recommendations.push('Try refreshing the page');
    }

    if (averageQuality === 'poor') {
      recommendations.push('Consider using a wired connection');
      recommendations.push('Close unnecessary browser tabs');
    }

    if (currentQuality === 'poor' && averageQuality === 'good') {
      recommendations.push('Connection temporarily degraded');
    }

    return recommendations;
  }

  // Get current status
  getStatus(): ConnectionStatus {
    return this.deadmanSwitch.getStatus();
  }
}

// Export singleton instance
export const networkMonitor = new NetworkQualityMonitor(); 