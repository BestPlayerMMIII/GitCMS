'use client';

import React, { useState } from 'react';
import { formatFileSize } from '@gitcms/core';

interface ImageOptimizationConfig {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  progressive: boolean;
  stripMetadata: boolean;
  enableResize: boolean;
  enableCompression: boolean;
  enableFormatConversion: boolean;
}

interface ImageProcessingResult {
  originalFile: File;
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    optimized: { width: number; height: number };
  };
  format: {
    original: string;
    optimized: string;
  };
  processingTime: number;
  appliedOptimizations: string[];
}

const OPTIMIZATION_PRESETS: Record<
  string,
  {
    name: string;
    description: string;
    config: ImageOptimizationConfig;
  }
> = {
  web: {
    name: 'Web Optimized',
    description: 'Best for web delivery with balanced quality and file size',
    config: {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'webp',
      progressive: true,
      stripMetadata: true,
      enableResize: true,
      enableCompression: true,
      enableFormatConversion: true,
    },
  },
  thumbnail: {
    name: 'Thumbnail',
    description: 'Small size for preview images',
    config: {
      quality: 80,
      maxWidth: 300,
      maxHeight: 300,
      format: 'webp',
      progressive: false,
      stripMetadata: true,
      enableResize: true,
      enableCompression: true,
      enableFormatConversion: true,
    },
  },
  social: {
    name: 'Social Media',
    description: 'Optimized for social media platforms',
    config: {
      quality: 80,
      maxWidth: 1200,
      maxHeight: 1200,
      format: 'jpeg',
      progressive: true,
      stripMetadata: true,
      enableResize: true,
      enableCompression: true,
      enableFormatConversion: true,
    },
  },
  original: {
    name: 'Original',
    description: 'No optimization, keep original format and quality',
    config: {
      quality: 100,
      maxWidth: Infinity,
      maxHeight: Infinity,
      format: 'auto',
      progressive: false,
      stripMetadata: false,
      enableResize: false,
      enableCompression: false,
      enableFormatConversion: false,
    },
  },
};

interface ImageOptimizerProps {
  files: File[];
  onOptimized: (results: ImageProcessingResult[]) => void;
  onProgress?: (completed: number, total: number) => void;
  className?: string;
}

export default function ImageOptimizer({
  files,
  onOptimized,
  onProgress,
  className = '',
}: ImageOptimizerProps) {
  const [config, setConfig] = useState<ImageOptimizationConfig>(OPTIMIZATION_PRESETS.web.config);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImageProcessingResult[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('web');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    if (OPTIMIZATION_PRESETS[presetName]) {
      setConfig(OPTIMIZATION_PRESETS[presetName].config);
    }
  };

  const handleConfigChange = (key: keyof ImageOptimizationConfig, value: any) => {
    setConfig((prev: ImageOptimizationConfig) => ({ ...prev, [key]: value }));
    setSelectedPreset('custom');
  };

  // Simple client-side image optimization using Canvas API
  const processImage = async (
    file: File,
    config: ImageOptimizationConfig
  ): Promise<ImageProcessingResult> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        const startTime = performance.now();
        const originalWidth = img.width;
        const originalHeight = img.height;
        const appliedOptimizations: string[] = [];

        // Calculate new dimensions
        let newWidth = originalWidth;
        let newHeight = originalHeight;

        if (
          config.enableResize &&
          (originalWidth > config.maxWidth || originalHeight > config.maxHeight)
        ) {
          const scale = Math.min(
            config.maxWidth / originalWidth,
            config.maxHeight / originalHeight
          );
          newWidth = Math.round(originalWidth * scale);
          newHeight = Math.round(originalHeight * scale);
          appliedOptimizations.push('resize');
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Configure canvas for quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Determine output format
        let outputFormat = config.format;
        if (outputFormat === 'auto') {
          outputFormat = file.type.includes('png') ? 'png' : 'jpeg';
          appliedOptimizations.push('format-auto-selection');
        } else if (config.enableFormatConversion) {
          appliedOptimizations.push('format-conversion');
        }

        // Apply quality
        const quality = config.enableCompression ? config.quality / 100 : 1;
        if (config.enableCompression && quality < 1) {
          appliedOptimizations.push('compression');
        }

        // Convert to blob
        const mimeType = `image/${outputFormat === 'jpeg' ? 'jpeg' : outputFormat}`;
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to create optimized image'));
              return;
            }

            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') +
                `-optimized.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`,
              { type: mimeType }
            );

            const processingTime = performance.now() - startTime;

            resolve({
              originalFile: file,
              optimizedFile,
              originalSize: file.size,
              optimizedSize: optimizedFile.size,
              compressionRatio: ((file.size - optimizedFile.size) / file.size) * 100,
              dimensions: {
                original: { width: originalWidth, height: originalHeight },
                optimized: { width: newWidth, height: newHeight },
              },
              format: {
                original: file.type,
                optimized: mimeType,
              },
              processingTime,
              appliedOptimizations,
            });
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processImages = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const processedResults: ImageProcessingResult[] = [];

    try {
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const result = await processImage(imageFiles[i], config);
          processedResults.push(result);
          onProgress?.(i + 1, imageFiles.length);
        } catch (error) {
          console.error(`Failed to process ${imageFiles[i].name}:`, error);
        }
      }

      setResults(processedResults);
      onOptimized(processedResults);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadOptimized = (result: ImageProcessingResult) => {
    const url = URL.createObjectURL(result.optimizedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.optimizedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    results.forEach(result => downloadOptimized(result));
  };

  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSize, 0);
  const totalSavings =
    totalOriginalSize > 0
      ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100
      : 0;

  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const formatTypes = Array.from(new Set(imageFiles.map(f => f.type.split('/')[1]))).join(', ');

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Optimization</h3>

        {/* Quick Stats */}
        {imageFiles.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Image Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Images:</span>
                <span className="ml-2 font-mono">{imageFiles.length}</span>
              </div>
              <div>
                <span className="text-blue-700">Total Size:</span>
                <span className="ml-2 font-mono">
                  {formatFileSize(imageFiles.reduce((sum, f) => sum + f.size, 0))}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Formats:</span>
                <span className="ml-2 font-mono">{formatTypes}</span>
              </div>
            </div>
          </div>
        )}

        {/* Preset Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Optimization Preset
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(OPTIMIZATION_PRESETS).map(([key, preset]) => (
              <button
                type="button"
                key={key}
                onClick={() => handlePresetChange(key)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPreset === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedPreset === 'custom'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">Custom</div>
              <div className="text-xs text-gray-500 mt-1">Advanced settings</div>
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Advanced Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quality ({config.quality}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={config.quality}
                  onChange={e => handleConfigChange('quality', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={config.format}
                  onChange={e => handleConfigChange('format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="webp">WebP</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Width (px)
                </label>
                <input
                  type="number"
                  value={config.maxWidth === Infinity ? '' : config.maxWidth}
                  onChange={e =>
                    handleConfigChange(
                      'maxWidth',
                      e.target.value ? parseInt(e.target.value) : Infinity
                    )
                  }
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Height (px)
                </label>
                <input
                  type="number"
                  value={config.maxHeight === Infinity ? '' : config.maxHeight}
                  onChange={e =>
                    handleConfigChange(
                      'maxHeight',
                      e.target.value ? parseInt(e.target.value) : Infinity
                    )
                  }
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableResize}
                  onChange={e => handleConfigChange('enableResize', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable resizing</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableCompression}
                  onChange={e => handleConfigChange('enableCompression', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable compression</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableFormatConversion}
                  onChange={e => handleConfigChange('enableFormatConversion', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable format conversion</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.stripMetadata}
                  onChange={e => handleConfigChange('stripMetadata', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Strip metadata</span>
              </label>
            </div>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={processImages}
          disabled={isProcessing || imageFiles.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Optimize ${imageFiles.length} Images`}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">Optimization Results</h4>
            <button
              type="button"
              onClick={downloadAll}
              className="bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
            >
              Download All
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatFileSize(totalOriginalSize)}
              </div>
              <div className="text-sm text-gray-500">Original Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatFileSize(totalOptimizedSize)}
              </div>
              <div className="text-sm text-gray-500">Optimized Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalSavings.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Size Reduction</div>
            </div>
          </div>

          {/* Individual Results */}
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {result.originalFile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(result.originalSize)} → {formatFileSize(result.optimizedSize)}
                    <span className="ml-2 text-green-600">
                      (-{result.compressionRatio.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.dimensions.original.width}×{result.dimensions.original.height} →
                    {result.dimensions.optimized.width}×{result.dimensions.optimized.height}
                    {result.appliedOptimizations.length > 0 && (
                      <span className="ml-2">({result.appliedOptimizations.join(', ')})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => downloadOptimized(result)}
                    className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
