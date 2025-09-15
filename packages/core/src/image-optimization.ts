// GitCMS Image Optimization System
// Client-side and server-side image processing for optimal performance

import type { MediaUploadOptions } from './media';

// Image optimization configuration
export interface ImageOptimizationConfig {
  quality: number; // 1-100
  maxWidth: number;
  maxHeight: number;
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  progressive: boolean;
  stripMetadata: boolean;
  enableResize: boolean;
  enableCompression: boolean;
  enableFormatConversion: boolean;
}

export interface OptimizationPreset {
  name: string;
  description: string;
  config: ImageOptimizationConfig;
}

// Predefined optimization presets
export const OPTIMIZATION_PRESETS: Record<string, OptimizationPreset> = {
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
  print: {
    name: 'Print Quality',
    description: 'High quality for printing, larger file sizes',
    config: {
      quality: 95,
      maxWidth: 3840,
      maxHeight: 2160,
      format: 'jpeg',
      progressive: true,
      stripMetadata: false,
      enableResize: false,
      enableCompression: false,
      enableFormatConversion: false,
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

// Image processing result
export interface ImageProcessingResult {
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

// Batch processing result
export interface BatchProcessingResult {
  results: ImageProcessingResult[];
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalCompressionRatio: number;
  processingTime: number;
  successCount: number;
  errorCount: number;
  errors: { file: string; error: string }[];
}

// Client-side image optimizer
export class ClientImageOptimizer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }
      this.ctx = ctx;
    }
  }

  /**
   * Process a single image file with optimization settings
   */
  async processImage(file: File, config: ImageOptimizationConfig): Promise<ImageProcessingResult> {
    const startTime = performance.now();
    const appliedOptimizations: string[] = [];

    try {
      // Load image
      const image = await this.loadImage(file);
      const originalDimensions = { width: image.width, height: image.height };

      // Calculate new dimensions if resizing is enabled
      let newWidth = image.width;
      let newHeight = image.height;

      if (
        config.enableResize &&
        (image.width > config.maxWidth || image.height > config.maxHeight)
      ) {
        const scale = Math.min(config.maxWidth / image.width, config.maxHeight / image.height);
        newWidth = Math.round(image.width * scale);
        newHeight = Math.round(image.height * scale);
        appliedOptimizations.push('resize');
      }

      // Set canvas dimensions
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;

      // Configure canvas for quality
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      // Draw and resize image
      this.ctx.drawImage(image, 0, 0, newWidth, newHeight);

      // Determine output format
      let outputFormat = config.format;
      if (outputFormat === 'auto') {
        outputFormat = this.getOptimalFormat(file.type);
        appliedOptimizations.push('format-auto-selection');
      } else if (config.enableFormatConversion && outputFormat !== this.extractFormat(file.type)) {
        appliedOptimizations.push('format-conversion');
      }

      // Apply compression if enabled
      let quality = config.quality / 100;
      if (config.enableCompression && quality < 1) {
        appliedOptimizations.push('compression');
      }

      // Convert to blob
      const mimeType = this.formatToMimeType(outputFormat);
      const blob = await this.canvasToBlob(this.canvas, mimeType, quality);

      // Create optimized file
      const optimizedFile = new File(
        [blob],
        this.generateOptimizedFilename(file.name, outputFormat),
        {
          type: mimeType,
          lastModified: Date.now(),
        }
      );

      const processingTime = performance.now() - startTime;

      return {
        originalFile: file,
        optimizedFile,
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        compressionRatio: ((file.size - optimizedFile.size) / file.size) * 100,
        dimensions: {
          original: originalDimensions,
          optimized: { width: newWidth, height: newHeight },
        },
        format: {
          original: file.type,
          optimized: mimeType,
        },
        processingTime,
        appliedOptimizations,
      };
    } catch (error) {
      throw new Error(
        `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process multiple images in batch
   */
  async processBatch(
    files: File[],
    config: ImageOptimizationConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchProcessingResult> {
    const startTime = performance.now();
    const results: ImageProcessingResult[] = [];
    const errors: { file: string; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.processImage(files[i], config);
        results.push(result);
        onProgress?.(i + 1, files.length);
      } catch (error) {
        errors.push({
          file: files[i].name,
          error: error instanceof Error ? error.message : 'Processing failed',
        });
      }
    }

    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSize, 0);

    return {
      results,
      totalOriginalSize,
      totalOptimizedSize,
      totalCompressionRatio:
        totalOriginalSize > 0
          ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100
          : 0,
      processingTime: performance.now() - startTime,
      successCount: results.length,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Generate multiple sizes from a single image
   */
  async generateResponsiveSizes(
    file: File,
    sizes: { name: string; width: number; height?: number; quality?: number }[]
  ): Promise<{ [key: string]: File }> {
    const image = await this.loadImage(file);
    const results: { [key: string]: File } = {};

    for (const size of sizes) {
      try {
        // Calculate dimensions
        let width = size.width;
        let height = size.height || (size.width * image.height) / image.width;

        // Maintain aspect ratio if only width is specified
        if (!size.height) {
          height = (size.width * image.height) / image.width;
        }

        // Set canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw resized image
        this.ctx.drawImage(image, 0, 0, width, height);

        // Convert to blob
        const quality = (size.quality || 85) / 100;
        const blob = await this.canvasToBlob(this.canvas, 'image/webp', quality);

        // Create file
        const filename = this.generateSizedFilename(file.name, size.name);
        results[size.name] = new File([blob], filename, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
      } catch (error) {
        console.warn(`Failed to generate size ${size.name}:`, error);
      }
    }

    return results;
  }

  // Private helper methods

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private getOptimalFormat(originalMimeType: string): 'webp' | 'jpeg' | 'png' {
    // WebP for best compression
    if (this.supportsFormat('webp')) {
      return 'webp';
    }

    // JPEG for photos, PNG for graphics with transparency
    if (originalMimeType === 'image/png') {
      return 'png';
    }

    return 'jpeg';
  }

  private supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 5;
  }

  private extractFormat(mimeType: string): string {
    return mimeType.split('/')[1] || 'jpeg';
  }

  private formatToMimeType(format: string): string {
    const formats: { [key: string]: string } = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
      jpg: 'image/jpeg',
    };
    return formats[format] || 'image/jpeg';
  }

  private generateOptimizedFilename(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const extension = format === 'jpeg' ? 'jpg' : format;
    return `${nameWithoutExt}-optimized.${extension}`;
  }

  private generateSizedFilename(originalName: string, sizeName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}-${sizeName}.webp`;
  }
}

// Progressive image loading utilities
export class ProgressiveImageLoader {
  /**
   * Create a low-quality image placeholder (LQIP) from an image file
   */
  static async createLQIP(file: File, quality: number = 10): Promise<string> {
    const optimizer = new ClientImageOptimizer();

    const config: ImageOptimizationConfig = {
      quality,
      maxWidth: 50,
      maxHeight: 50,
      format: 'jpeg',
      progressive: false,
      stripMetadata: true,
      enableResize: true,
      enableCompression: true,
      enableFormatConversion: true,
    };

    try {
      const result = await optimizer.processImage(file, config);
      return URL.createObjectURL(result.optimizedFile);
    } catch (error) {
      console.warn('Failed to create LQIP:', error);
      return '';
    }
  }

  /**
   * Create a blur hash placeholder for an image
   */
  static async createBlurHash(file: File): Promise<string> {
    // This would integrate with a blur hash library like blurhash
    // For now, return a simple placeholder
    return 'LKJGkuayj[a|j[ayj[ayayj[ayj[';
  }
}

// Image analysis utilities
export class ImageAnalyzer {
  /**
   * Analyze image characteristics
   */
  static async analyzeImage(file: File): Promise<{
    dimensions: { width: number; height: number };
    aspectRatio: number;
    colorDepth: number;
    hasTransparency: boolean;
    dominantColors: string[];
    fileSize: number;
    format: string;
    compressionPotential: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const hasTransparency = this.checkTransparency(imageData);
        const dominantColors = this.extractDominantColors(imageData);
        const compressionPotential = this.estimateCompressionPotential(
          file,
          img.width * img.height
        );

        resolve({
          dimensions: { width: img.width, height: img.height },
          aspectRatio: img.width / img.height,
          colorDepth: 24, // Assuming 24-bit color
          hasTransparency,
          dominantColors,
          fileSize: file.size,
          format: file.type,
          compressionPotential,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for analysis'));
      img.src = URL.createObjectURL(file);
    });
  }

  private static checkTransparency(imageData: ImageData): boolean {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  }

  private static extractDominantColors(imageData: ImageData, count: number = 5): string[] {
    // Simplified color extraction - in production, use a more sophisticated algorithm
    const colorCounts: { [key: string]: number } = {};
    const data = imageData.data;

    // Sample every 10th pixel to improve performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const color = `rgb(${r},${g},${b})`;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }

    return Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([color]) => color);
  }

  private static estimateCompressionPotential(file: File, pixelCount: number): number {
    // Estimate how much the file could be compressed (0-100%)
    const bytesPerPixel = file.size / pixelCount;

    if (file.type === 'image/png') {
      // PNG files often have high compression potential
      return bytesPerPixel > 3 ? 70 : bytesPerPixel > 2 ? 50 : 30;
    } else if (file.type === 'image/jpeg') {
      // JPEG files might have less potential if already compressed
      return bytesPerPixel > 2 ? 40 : bytesPerPixel > 1 ? 25 : 15;
    }

    return 50; // Default estimate
  }
}

// Export utility functions
export function formatImageSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return ((originalSize - compressedSize) / originalSize) * 100;
}

export function getOptimalPreset(
  fileSize: number,
  dimensions: { width: number; height: number },
  purpose: 'web' | 'print' | 'social' | 'thumbnail'
): OptimizationPreset {
  return OPTIMIZATION_PRESETS[purpose] || OPTIMIZATION_PRESETS.web;
}

// Default export
export default ClientImageOptimizer;
