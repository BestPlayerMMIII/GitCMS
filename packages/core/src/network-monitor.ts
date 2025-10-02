/**
 * Network monitoring and upload progress simulation utilities
 * Provides intelligent progress simulation based on connection speed
 */

export interface NetworkStats {
  /** Current download speed in bytes/second */
  downloadSpeed: number;
  /** Current upload speed in bytes/second */
  uploadSpeed: number;
  /** Round-trip time in milliseconds */
  rtt: number;
  /** Connection type (4g, 3g, wifi, etc.) */
  connectionType?: string;
  /** Whether connection is metered */
  isMetered?: boolean;
  /** Last measurement timestamp */
  timestamp: number;
}

export interface UploadProgressSimulation {
  /** Current progress percentage (0-98) */
  progress: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
  /** Current upload speed in bytes/second */
  currentSpeed: number;
  /** Whether simulation is complete (reached 98%) */
  isSimulationComplete: boolean;
}

export interface ProgressSimulationConfig {
  /** File size in bytes */
  fileSize: number;
  /** Maximum progress percentage before waiting for actual upload (default: 98) */
  maxProgress?: number;
  /** Update interval in milliseconds (default: 1000) */
  updateInterval?: number;
  /** Speed smoothing factor (0-1, default: 0.7) */
  smoothingFactor?: number;
}

/**
 * Advanced network monitoring utility
 * Detects connection speed and provides upload progress simulation
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor | null = null;
  private networkStats: NetworkStats | null = null;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(stats: NetworkStats) => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Start monitoring network performance
   */
  async startMonitoring(intervalMs: number = 5000): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Initial measurement
    await this.measureNetworkSpeed();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.measureNetworkSpeed();
    }, intervalMs);
  }

  /**
   * Stop monitoring network performance
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Subscribe to network stats updates
   */
  subscribe(callback: (stats: NetworkStats) => void): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current network stats
   */
  getCurrentStats(): NetworkStats | null {
    return this.networkStats;
  }

  /**
   * Measure current network speed using multiple techniques
   */
  private async measureNetworkSpeed(): Promise<NetworkStats> {
    const measurements = await Promise.allSettled([
      this.measureWithImageDownload(),
      this.measureWithNetworkAPI(),
      this.measureWithPingTest(),
    ]);

    // Combine results and calculate averages
    const validResults = measurements
      .filter(
        (result): result is PromiseFulfilledResult<Partial<NetworkStats>> =>
          result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    const stats: NetworkStats = {
      downloadSpeed: this.calculateAverage(validResults, 'downloadSpeed') || 1000000, // 1MB/s default
      uploadSpeed: this.calculateAverage(validResults, 'uploadSpeed') || 500000, // 500KB/s default
      rtt: this.calculateAverage(validResults, 'rtt') || 100, // 100ms default
      connectionType: this.detectConnectionType(),
      timestamp: Date.now(),
    };

    // Smooth the values if we have previous stats
    if (this.networkStats) {
      const smoothing = 0.7;
      stats.downloadSpeed = this.smooth(
        stats.downloadSpeed,
        this.networkStats.downloadSpeed,
        smoothing
      );
      stats.uploadSpeed = this.smooth(stats.uploadSpeed, this.networkStats.uploadSpeed, smoothing);
      stats.rtt = this.smooth(stats.rtt, this.networkStats.rtt, smoothing);
    }

    this.networkStats = stats;

    // Notify subscribers
    this.callbacks.forEach(callback => callback(stats));

    return stats;
  }

  /**
   * Measure speed by downloading a small image
   */
  private async measureWithImageDownload(): Promise<Partial<NetworkStats>> {
    try {
      const testUrl = 'https://httpbin.org/bytes/100000'; // 100KB test
      const startTime = performance.now();

      const response = await fetch(testUrl, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error('Test failed');

      await response.blob();
      const endTime = performance.now();

      const duration = (endTime - startTime) / 1000; // seconds
      const downloadSpeed = 100000 / duration; // bytes/second

      return {
        downloadSpeed,
        uploadSpeed: downloadSpeed * 0.5, // Estimate upload as 50% of download
        rtt: duration * 1000 * 0.1, // Estimate RTT
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Use Network Information API if available
   */
  private async measureWithNetworkAPI(): Promise<Partial<NetworkStats>> {
    try {
      const navigator = globalThis.navigator as any;
      if (!navigator?.connection) return {};

      const connection = navigator.connection;
      const downlink = connection.downlink; // Mbps
      const rtt = connection.rtt; // ms

      return {
        downloadSpeed: (downlink * 1000000) / 8, // Convert Mbps to bytes/s
        uploadSpeed: ((downlink * 1000000) / 8) * 0.3, // Estimate upload as 30% of download
        rtt,
        connectionType: connection.effectiveType,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Simple ping test using fetch timing
   */
  private async measureWithPingTest(): Promise<Partial<NetworkStats>> {
    try {
      const startTime = performance.now();

      await fetch('https://httpbin.org/get', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });

      const rtt = performance.now() - startTime;

      return { rtt };
    } catch (error) {
      return {};
    }
  }

  /**
   * Calculate average of a property across results
   */
  private calculateAverage(
    results: Partial<NetworkStats>[],
    property: keyof NetworkStats
  ): number | undefined {
    const values = results
      .map(result => result[property])
      .filter((value): value is number => typeof value === 'number' && !isNaN(value));

    if (values.length === 0) return undefined;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Detect connection type based on speed
   */
  private detectConnectionType(): string {
    if (!this.networkStats) return 'unknown';

    const speedMbps = (this.networkStats.downloadSpeed / 1000000) * 8;

    if (speedMbps > 50) return 'fiber';
    if (speedMbps > 10) return 'wifi';
    if (speedMbps > 5) return '4g';
    if (speedMbps > 1) return '3g';
    return 'slow';
  }

  /**
   * Smooth values using exponential moving average
   */
  private smooth(newValue: number, oldValue: number, factor: number): number {
    return oldValue * factor + newValue * (1 - factor);
  }
}

/**
 * Upload progress simulator
 * Provides realistic progress simulation based on network conditions
 */
export class UploadProgressSimulator {
  private config: Required<ProgressSimulationConfig>;
  private startTime: number = 0;
  private currentProgress: number = 0;
  private simulationInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(progress: UploadProgressSimulation) => void> = [];
  private networkMonitor: NetworkMonitor;
  private isRunning = false;

  constructor(config: ProgressSimulationConfig) {
    this.config = {
      maxProgress: 98,
      updateInterval: 1000,
      smoothingFactor: 0.7,
      ...config,
    };

    this.networkMonitor = NetworkMonitor.getInstance();
  }

  /**
   * Start progress simulation
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.currentProgress = 0;

    // Ensure network monitoring is active
    await this.networkMonitor.startMonitoring();

    // Start simulation loop
    this.simulationInterval = setInterval(() => {
      this.updateProgress();
    }, this.config.updateInterval);

    // Initial update
    this.updateProgress();
  }

  /**
   * Stop progress simulation
   */
  stop(): void {
    this.isRunning = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: (progress: UploadProgressSimulation) => void): () => void {
    this.callbacks.push(callback);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update progress based on current network conditions
   */
  private updateProgress(): void {
    if (!this.isRunning) return;

    const networkStats = this.networkMonitor.getCurrentStats();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;

    if (!networkStats) {
      // Fallback to basic time-based progress
      this.currentProgress = Math.min(elapsedSeconds * 5, this.config.maxProgress);
    } else {
      // Calculate progress based on upload speed
      const uploadSpeed = networkStats.uploadSpeed;
      const expectedBytesUploaded = uploadSpeed * elapsedSeconds;
      const rawProgress = (expectedBytesUploaded / this.config.fileSize) * 100;

      // Apply smoothing and cap at maxProgress
      const smoothedProgress =
        this.currentProgress * this.config.smoothingFactor +
        rawProgress * (1 - this.config.smoothingFactor);

      this.currentProgress = Math.min(smoothedProgress, this.config.maxProgress);
    }

    // Calculate remaining time
    const remainingProgress = this.config.maxProgress - this.currentProgress;
    const progressRate = this.currentProgress / elapsedSeconds;
    const estimatedTimeRemaining = progressRate > 0 ? remainingProgress / progressRate : Infinity;

    const progressUpdate: UploadProgressSimulation = {
      progress: Math.max(0, Math.min(this.currentProgress, this.config.maxProgress)),
      estimatedTimeRemaining: Math.max(0, Math.min(estimatedTimeRemaining, 3600)), // Cap at 1 hour
      currentSpeed: networkStats?.uploadSpeed || 500000,
      isSimulationComplete: this.currentProgress >= this.config.maxProgress,
    };

    // Notify subscribers
    this.callbacks.forEach(callback => callback(progressUpdate));

    // Auto-stop when simulation is complete
    if (progressUpdate.isSimulationComplete) {
      this.stop();
    }
  }

  /**
   * Get current progress state
   */
  getCurrentProgress(): UploadProgressSimulation {
    const networkStats = this.networkMonitor.getCurrentStats();

    return {
      progress: this.currentProgress,
      estimatedTimeRemaining: 0,
      currentSpeed: networkStats?.uploadSpeed || 500000,
      isSimulationComplete: this.currentProgress >= this.config.maxProgress,
    };
  }
}

/**
 * Utility functions for network monitoring
 */
export const NetworkUtils = {
  /**
   * Format speed in human-readable format
   */
  formatSpeed(bytesPerSecond: number): string {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let value = bytesPerSecond;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Format time in human-readable format
   */
  formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return 'Unknown';

    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  },

  /**
   * Get connection quality description
   */
  getConnectionQuality(speed: number): string {
    const mbps = (speed / 1000000) * 8;

    if (mbps > 50) return 'Excellent';
    if (mbps > 25) return 'Very Good';
    if (mbps > 10) return 'Good';
    if (mbps > 5) return 'Fair';
    if (mbps > 1) return 'Slow';
    return 'Very Slow';
  },
};
