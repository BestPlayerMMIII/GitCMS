import networkTestData from './data/network-test.json';
const networkTest = networkTestData as { url: string; size: number }[];

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
  /** Current progress percentage (0-100) */
  progress: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
  /** Current upload speed in bytes/second */
  currentSpeed: number;
  /** Current simulation phase */
  phase: 'network' | 'entertainment' | 'waiting' | 'complete';
  /** Whether simulation is complete */
  isSimulationComplete: boolean;
}

export interface ProgressSimulationConfig {
  /** File size in bytes */
  fileSize: number;
  /** Threshold where entertainment phase starts (0-1, e.g., 0.9 = 90%) - default: 0.9 */
  alpha?: number;
  /** Decay factor for entertainment phase (0-1, e.g., 0.4 = 40% of remaining) - default: 0.4 */
  beta?: number;
  /** Maximum progress percentage before waiting for actual upload (default: 99) */
  maxProgress?: number;
  /** Update interval in milliseconds (default: 2000) */
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
   * This method is idempotent - calling it multiple times will not create multiple intervals
   */
  async startMonitoring(intervalMs: number = 3000): Promise<void> {
    // If already monitoring, do nothing
    if (this.isMonitoring) {
      return;
    }
    this.isMonitoring = true;

    // Clear any orphaned interval (defensive)
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Initial measurement
    await this.measureNetworkSpeed();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.measureNetworkSpeed();
    }, intervalMs);
  }

  /**
   * Stop monitoring network performance
   * Note: This is primarily for cleanup. The singleton pattern means monitoring
   * should generally stay active once started, but components can call this
   * if they need to stop monitoring globally.
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
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
  private async measureNetworkSpeed(): Promise<void> {
    // evaluate if we really need to measure or it's useless
    if (this.callbacks.length === 0) {
      return;
    }
    // if here, we have subscribers - measure speed

    // Use multiple methods to get a more accurate picture
    const measurements = await Promise.allSettled([
      this.measureWithImageDownload(),
      this.measureWithNetworkAPI(),
    ]);

    // Combine results and calculate averages
    const validResults = measurements
      .filter(
        (result): result is PromiseFulfilledResult<Partial<NetworkStats>> =>
          result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    const stats: NetworkStats = {
      downloadSpeed: this.calculateAverage(validResults, 'downloadSpeed') || 1 * 1024 * 1024, // 1MB/s default
      uploadSpeed: this.calculateAverage(validResults, 'uploadSpeed') || 500 * 1024, // 500KB/s default
      rtt: this.calculateAverage(validResults, 'rtt') || 100, // 100ms default
      connectionType: this.detectConnectionType(),
      timestamp: Date.now(),
    };

    // Smooth the values if we have previous stats
    if (this.networkStats) {
      const smoothing = 0.1;
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
  }

  /**
   * Measure speed by downloading a small image
   */
  private async measureWithImageDownload(): Promise<Partial<NetworkStats>> {
    // Use Image() to avoid CORS issues
    return new Promise<Partial<NetworkStats>>(resolve => {
      const times = [0, 0];
      const imageUrls = [networkTest[0].url, networkTest[1].url];
      const imageSizes = [networkTest[0].size, networkTest[1].size];
      let finished = 0;
      let failed = false;

      function maybeResolve() {
        finished++;
        if (failed) return; // Already resolved due to error
        if (finished === 2) {
          // Both images loaded successfully
          if (times[0] > 0 && times[1] > 0 && times[1] > times[0]) {
            const downloadSpeed = (imageSizes[1] - imageSizes[0]) / (times[1] - times[0]); // bytes/second
            const rtt = (times[0] - imageSizes[0] / downloadSpeed) * 1000; // ms
            resolve({
              downloadSpeed,
              uploadSpeed: downloadSpeed * 0.5,
              rtt,
            });
          } else {
            resolve({});
          }
        }
      }

      for (let i = 0; i < 2; i++) {
        try {
          const testUrl = imageUrls[i];
          const img = new Image();
          const startTime = performance.now();
          let timeout: any = null;

          timeout = setTimeout(() => {
            if (!failed) {
              failed = true;
              resolve({});
            }
          }, 10000);

          img.onload = () => {
            clearTimeout(timeout);
            const endTime = performance.now();
            times[i] = (endTime - startTime) / 1000; // seconds
            maybeResolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            if (!failed) {
              failed = true;
              resolve({});
            }
          };
          img.src = testUrl + (testUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
        } catch (error) {
          if (!failed) {
            failed = true;
            resolve({});
          }
        }
      }
    });
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
 * Upload progress simulator with 2-phase intelligent algorithm
 *
 * Phase 1 (Network): 0% → 100alpha% - Progress based on measured network speed
 * Phase 2 (Entertainment): 100alpha% → maxProgress% - Exponential decay with beta factor
 * Phase 3 (Waiting): 99% - Waits for actual completion signal
 * Phase 4 (Complete): 100% - Upload finished
 *
 * Provides realistic progress simulation based on network conditions
 */
export type SimulationPhase = 'network' | 'entertainment' | 'waiting' | 'complete';
export class UploadProgressSimulator {
  private config: Required<ProgressSimulationConfig>;
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private currentProgress: number = 0;
  private elapsedTimeAtAlpha: number | undefined = undefined;
  private phase: SimulationPhase = 'network';
  private simulationInterval: NodeJS.Timeout | null = null;
  private callbacks: Array<(progress: UploadProgressSimulation) => void> = [];
  private networkMonitor: NetworkMonitor;
  private isRunning = false;
  private fallbackUploadSpeed = 500 * 1024; // 500KB/s fallback

  constructor(config: ProgressSimulationConfig) {
    this.config = {
      alpha: 0.9,
      beta: 0.4,
      maxProgress: 99,
      updateInterval: 2000,
      smoothingFactor: 0.7,
      ...config,
    };

    // Clamp alpha and beta to valid ranges
    this.config.alpha = Math.max(0, Math.min(1, this.config.alpha));
    this.config.beta = Math.max(0, Math.min(1, this.config.beta));

    this.networkMonitor = NetworkMonitor.getInstance();
  }

  /**
   * Start progress simulation
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.currentProgress = 0;
    this.phase = 'network';

    // Ensure network monitoring is active
    await this.networkMonitor.startMonitoring(this.config.updateInterval);

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
   * Mark upload as complete (jumps to 100%)
   */
  complete(): void {
    this.stop();
    this.currentProgress = 100;
    this.phase = 'complete';
    this.notifySubscribers();
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
   * Update progress based on current phase and network conditions
   */
  private updateProgress(): void {
    if (!this.isRunning) return;

    // Check if we've reached the waiting threshold
    if (this.currentProgress >= this.config.maxProgress) {
      this.phase = 'waiting';
      this.notifySubscribers();
      return;
    }

    const currentTime = Date.now();
    const elapsed = currentTime - this.lastUpdateTime;

    const alphaThreshold = this.config.alpha * 100;

    if (this.currentProgress < alphaThreshold) {
      // Phase 1: Network-based simulation
      this.phase = 'network';
      this.updateNetworkPhase(elapsed);
    } else {
      // Phase 2: Entertainment (exponential decay)
      this.phase = 'entertainment';
      this.updateEntertainmentPhase();
    }

    this.lastUpdateTime = currentTime;
    this.notifySubscribers();
  }

  /**
   * Phase 1: Network-based progress calculation
   */
  private updateNetworkPhase(elapsedMs: number): void {
    const networkStats = this.networkMonitor.getCurrentStats();
    const uploadSpeed = networkStats?.uploadSpeed || this.fallbackUploadSpeed;
    const maxPercentage = this.config.alpha * 100;

    // Calculate progress based on actual upload speed
    const bytesUploaded = (uploadSpeed * elapsedMs) / 1000;
    const progressIncrement = (bytesUploaded / this.config.fileSize) * maxPercentage;

    // Apply smoothing
    const rawProgress = this.currentProgress + progressIncrement;
    const smoothedProgress =
      this.currentProgress * this.config.smoothingFactor +
      rawProgress * (1 - this.config.smoothingFactor);

    this.currentProgress = Math.min(smoothedProgress, maxPercentage);
    if (this.currentProgress === maxPercentage && this.elapsedTimeAtAlpha === undefined) {
      this.elapsedTimeAtAlpha = Date.now() - this.startTime;
    }
  }

  /**
   * Phase 2: Entertainment phase with exponential decay
   */
  private updateEntertainmentPhase(): void {
    // Exponential decay: increment = (maxProgress - current) * beta
    const remaining = 100 - this.currentProgress;
    const increment = remaining * this.config.beta;

    this.currentProgress = Math.min(this.currentProgress + increment, this.config.maxProgress);
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateTimeRemaining(): number {
    if (this.currentProgress >= this.config.maxProgress) {
      return 0;
    }

    if (this.phase === 'network') {
      // Network phase: calculate based on upload speed
      const networkStats = this.networkMonitor.getCurrentStats();
      const uploadSpeed = networkStats?.uploadSpeed || this.fallbackUploadSpeed;

      const remainingProgress = this.config.alpha * 100 - this.currentProgress;
      const remainingBytes = (remainingProgress / 100) * this.config.fileSize;
      return (remainingBytes / uploadSpeed) * 1000; // Convert to milliseconds
    } else if (this.phase === 'entertainment') {
      // Entertainment phase: estimate based on exponential decay
      // Calculate number of steps to reach ~maxProgress%
      // Each step: remaining * beta
      // After n steps: remaining * (1-beta)^n; with remaining = (100 - currentProgress)
      // We want remaining * (1-beta)^n <= (100-maxProgress), so
      // n >= log((100 - this.config.maxProgress) / (100 - this.currentProgress)) / log(1-beta)
      // stepsToComplete = n_min, so change from >= to =.
      const stepsToComplete =
        Math.log((100 - this.config.maxProgress) / (100 - this.currentProgress)) /
        Math.log(1 - this.config.beta);

      return stepsToComplete * this.config.updateInterval;
    }

    return 1000; // Default 1 second
  }

  /**
   * Notify all subscribers with current progress
   */
  private notifySubscribers(): void {
    this.callbacks.forEach(callback => callback(this.getCurrentProgress()));
  }

  /**
   * Get current progress state
   */
  getCurrentProgress(): UploadProgressSimulation {
    const networkStats = this.networkMonitor.getCurrentStats();
    const estimatedTimeRemaining = this.calculateTimeRemaining();

    return {
      progress: this.currentProgress,
      estimatedTimeRemaining,
      currentSpeed: networkStats?.uploadSpeed || this.fallbackUploadSpeed,
      phase: this.phase,
      isSimulationComplete:
        this.currentProgress >= this.config.maxProgress || this.phase === 'complete',
    };
  }
}

/**
 * Utility functions for network monitoring and progress display
 */
export type ConnectionQuality = 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Slow' | 'Very Slow';
export const NetworkUtils = {
  /**
   * Format speed in human-readable format
   */
  formatSpeed(bytesPerSecond: number | undefined): string {
    if (!bytesPerSecond || !isFinite(bytesPerSecond)) return '? B/s';
    if (bytesPerSecond < 0) bytesPerSecond = 0;

    const mbps = bytesPerSecond / (1024 * 1024);

    if (mbps < 1) {
      const kbps = bytesPerSecond / 1024;
      return `${kbps.toFixed(0)} KB/s`;
    }

    return `${mbps.toFixed(1)} MB/s`;
  },

  /**
   * Format time in human-readable format
   */
  formatTime(milliseconds: number | undefined): string {
    if (!milliseconds || !isFinite(milliseconds)) return '?s';
    if (milliseconds < 0) milliseconds = 0;

    const seconds = Math.floor(milliseconds / 1000);

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  },

  /**
   * Get connection quality description based on upload speed
   */
  getConnectionQuality(bytesPerSecond: number): ConnectionQuality {
    const mbps = (bytesPerSecond / (1024 * 1024)) * 8;

    if (mbps > 50) return 'Excellent';
    if (mbps > 25) return 'Very Good';
    if (mbps > 10) return 'Good';
    if (mbps > 5) return 'Fair';
    if (mbps > 1) return 'Slow';
    return 'Very Slow';
  },

  /**
   * Get color class based on connection quality
   */
  getConnectionColor(quality: string): string {
    switch (quality) {
      case 'Excellent':
        return 'text-purple-500';
      case 'Very Good':
        return 'text-green-500';
      case 'Good':
        return 'text-green-400';
      case 'Fair':
        return 'text-amber-500';
      case 'Slow':
        return 'text-orange-500';
      case 'Very Slow':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  },

  /**
   * Get progress bar color based on phase
   */
  getProgressColor(phase: string): string {
    switch (phase) {
      case 'network':
        return 'bg-blue-500';
      case 'entertainment':
        return 'bg-purple-500';
      case 'waiting':
        return 'bg-amber-500';
      case 'complete':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  },

  /**
   * Get progress bar animation based on phase
   */
  getProgressAnimation(phase: string): string {
    switch (phase) {
      case 'network':
        return 'transition-all duration-500 ease-linear';
      case 'entertainment':
        return 'transition-all duration-1000 ease-out';
      case 'waiting':
        return 'animate-pulse';
      case 'complete':
        return 'transition-all duration-300';
      default:
        return 'transition-all duration-300';
    }
  },
};
