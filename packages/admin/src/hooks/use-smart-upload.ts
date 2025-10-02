'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  NetworkMonitor,
  UploadProgressSimulator,
  type NetworkStats,
  type UploadProgressSimulation,
} from '@git-cms/core';

export interface UseSmartUploadOptions {
  /** Update interval for network monitoring in ms */
  monitoringInterval?: number;
  /** Whether to auto-start network monitoring */
  autoStart?: boolean;
}

export interface UseSmartUploadReturn {
  /** Current network statistics */
  networkStats: NetworkStats | null;
  /** Whether network monitoring is active */
  isMonitoring: boolean;
  /** Start network monitoring */
  startMonitoring: () => Promise<void>;
  /** Stop network monitoring */
  stopMonitoring: () => void;
  /** Create upload progress simulator for a file */
  createSimulator: (fileSize: number) => UploadProgressSimulator;
  /** Get connection quality description */
  getConnectionQuality: () => string;
  /** Get formatted upload speed */
  getFormattedSpeed: () => string;
}

/**
 * React hook for smart upload functionality with network monitoring
 */
export function useSmartUpload(options: UseSmartUploadOptions = {}): UseSmartUploadReturn {
  const { monitoringInterval = 3000, autoStart = true } = options;

  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const networkMonitor = useRef<NetworkMonitor>();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize network monitor
  useEffect(() => {
    networkMonitor.current = NetworkMonitor.getInstance();

    if (autoStart) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoStart]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    if (!networkMonitor.current || isMonitoring) return;

    try {
      await networkMonitor.current.startMonitoring(monitoringInterval);
      setIsMonitoring(true);

      // Subscribe to network updates
      unsubscribeRef.current = networkMonitor.current.subscribe(setNetworkStats);
    } catch (error) {
      console.error('Failed to start network monitoring:', error);
    }
  }, [monitoringInterval, isMonitoring]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!networkMonitor.current || !isMonitoring) return;

    networkMonitor.current.stopMonitoring();
    setIsMonitoring(false);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setNetworkStats(null);
  }, [isMonitoring]);

  // Create simulator
  const createSimulator = useCallback((fileSize: number): UploadProgressSimulator => {
    return new UploadProgressSimulator({
      fileSize,
      maxProgress: 98,
      updateInterval: 500,
      smoothingFactor: 0.7,
    });
  }, []);

  // Get connection quality
  const getConnectionQuality = useCallback((): string => {
    if (!networkStats) return 'Unknown';

    const mbps = (networkStats.uploadSpeed / 1000000) * 8;

    if (mbps > 50) return 'Excellent';
    if (mbps > 25) return 'Very Good';
    if (mbps > 10) return 'Good';
    if (mbps > 5) return 'Fair';
    if (mbps > 1) return 'Slow';
    return 'Very Slow';
  }, [networkStats]);

  // Get formatted speed
  const getFormattedSpeed = useCallback((): string => {
    if (!networkStats) return 'Unknown';

    const speed = networkStats.uploadSpeed;
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let value = speed;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }, [networkStats]);

  return {
    networkStats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    createSimulator,
    getConnectionQuality,
    getFormattedSpeed,
  };
}

/**
 * Hook for managing upload progress simulation
 */
export function useUploadProgress(fileSize: number) {
  const [progress, setProgress] = useState<UploadProgressSimulation | null>(null);
  const [isActive, setIsActive] = useState(false);

  const simulatorRef = useRef<UploadProgressSimulator | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Start simulation
  const startSimulation = useCallback(async () => {
    if (simulatorRef.current || isActive) return;

    const simulator = new UploadProgressSimulator({
      fileSize,
      maxProgress: 98,
      updateInterval: 500,
    });

    simulatorRef.current = simulator;
    setIsActive(true);

    // Subscribe to progress updates
    unsubscribeRef.current = simulator.subscribe(setProgress);

    // Start simulation
    await simulator.start();
  }, [fileSize, isActive]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    if (!simulatorRef.current) return;

    simulatorRef.current.stop();
    simulatorRef.current = null;
    setIsActive(false);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setProgress(null);
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    stopSimulation();
    setProgress(null);
  }, [stopSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  return {
    progress,
    isActive,
    startSimulation,
    stopSimulation,
    resetSimulation,
  };
}

/**
 * Hook for LFS file analysis
 */
export function useLFSAnalysis() {
  const [lfsEnabled, setLfsEnabled] = useState(false);
  const [lfsRules, setLfsRules] = useState<string[]>([]);

  // Analyze if file should use LFS
  const shouldUseLFS = useCallback((fileName: string, fileSize: number): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Check size threshold (50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return true;
    }

    // Check common binary extensions
    const lfsExtensions = [
      'psd',
      'psb',
      'ai',
      'eps',
      'tiff',
      'tif',
      'bmp',
      'raw',
      'cr2',
      'nef',
      'mp4',
      'avi',
      'mov',
      'wmv',
      'flv',
      'webm',
      'mkv',
      'm4v',
      'mp3',
      'wav',
      'flac',
      'aac',
      'ogg',
      'wma',
      'm4a',
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'xls',
      'xlsx',
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
      'bz2',
      'ttf',
      'otf',
      'woff',
      'woff2',
      'exe',
      'dmg',
      'pkg',
      'deb',
      'rpm',
    ];

    return lfsExtensions.includes(extension);
  }, []);

  // Get LFS recommendation reason
  const getLFSReason = useCallback((fileName: string, fileSize: number): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    if (fileSize > 50 * 1024 * 1024) {
      return `Large file (${(fileSize / 1024 / 1024).toFixed(1)} MB)`;
    }

    return `Binary file type (.${extension})`;
  }, []);

  return {
    lfsEnabled,
    lfsRules,
    shouldUseLFS,
    getLFSReason,
    setLfsEnabled,
    setLfsRules,
  };
}
