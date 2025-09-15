// GitCMS CDN Integration System
// Support for multiple CDN providers and GitHub Pages integration

export interface CDNProvider {
  name: string;
  id: string;
  baseUrl: string;
  supportedRegions?: string[];
  features: {
    imageTransformation: boolean;
    caching: boolean;
    compression: boolean;
    webpSupport: boolean;
    resizing: boolean;
  };
}

export interface CDNConfig {
  provider: CDNProvider;
  region?: string;
  customDomain?: string;
  cacheSettings: {
    maxAge: number; // seconds
    staleWhileRevalidate: number; // seconds
    enableGzipCompression: boolean;
  };
  imageTransformation: {
    enabled: boolean;
    quality: number; // 1-100
    formats: string[]; // ['webp', 'avif', 'jpeg', 'png']
    sizes: number[]; // responsive sizes
  };
}

export interface CDNUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
}

// Supported CDN providers
export const CDN_PROVIDERS: Record<string, CDNProvider> = {
  github: {
    name: 'GitHub Pages',
    id: 'github',
    baseUrl: 'https://raw.githubusercontent.com',
    features: {
      imageTransformation: false,
      caching: true,
      compression: false,
      webpSupport: false,
      resizing: false,
    },
  },
  jsdelivr: {
    name: 'jsDelivr',
    id: 'jsdelivr',
    baseUrl: 'https://cdn.jsdelivr.net/gh',
    features: {
      imageTransformation: false,
      caching: true,
      compression: true,
      webpSupport: false,
      resizing: false,
    },
  },
  cloudinary: {
    name: 'Cloudinary',
    id: 'cloudinary',
    baseUrl: 'https://res.cloudinary.com',
    features: {
      imageTransformation: true,
      caching: true,
      compression: true,
      webpSupport: true,
      resizing: true,
    },
  },
  imgix: {
    name: 'Imgix',
    id: 'imgix',
    baseUrl: 'https://assets.imgix.net',
    features: {
      imageTransformation: true,
      caching: true,
      compression: true,
      webpSupport: true,
      resizing: true,
    },
  },
  imagekit: {
    name: 'ImageKit',
    id: 'imagekit',
    baseUrl: 'https://ik.imagekit.io',
    features: {
      imageTransformation: true,
      caching: true,
      compression: true,
      webpSupport: true,
      resizing: true,
    },
  },
  custom: {
    name: 'Custom CDN',
    id: 'custom',
    baseUrl: '',
    features: {
      imageTransformation: false,
      caching: true,
      compression: false,
      webpSupport: false,
      resizing: false,
    },
  },
};

// Default CDN configurations
export const DEFAULT_CDN_CONFIGS: Record<string, Partial<CDNConfig>> = {
  github: {
    cacheSettings: {
      maxAge: 86400, // 24 hours
      staleWhileRevalidate: 3600, // 1 hour
      enableGzipCompression: false,
    },
    imageTransformation: {
      enabled: false,
      quality: 85,
      formats: ['jpeg', 'png'],
      sizes: [300, 600, 1200, 1920],
    },
  },
  cloudinary: {
    cacheSettings: {
      maxAge: 2592000, // 30 days
      staleWhileRevalidate: 86400, // 24 hours
      enableGzipCompression: true,
    },
    imageTransformation: {
      enabled: true,
      quality: 85,
      formats: ['webp', 'avif', 'jpeg'],
      sizes: [300, 600, 1200, 1920],
    },
  },
  imgix: {
    cacheSettings: {
      maxAge: 2592000, // 30 days
      staleWhileRevalidate: 86400, // 24 hours
      enableGzipCompression: true,
    },
    imageTransformation: {
      enabled: true,
      quality: 85,
      formats: ['webp', 'avif', 'jpeg'],
      sizes: [300, 600, 1200, 1920],
    },
  },
};

// CDN URL generator
export class CDNUrlGenerator {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * Generate CDN URL for a media file
   */
  generateUrl(owner: string, repo: string, path: string, options: CDNUrlOptions = {}): string {
    const provider = this.config.provider;
    const baseUrl = this.config.customDomain || provider.baseUrl;

    switch (provider.id) {
      case 'github':
        return this.generateGitHubUrl(baseUrl, owner, repo, path);

      case 'jsdelivr':
        return this.generateJsDelivrUrl(baseUrl, owner, repo, path);

      case 'cloudinary':
        return this.generateCloudinaryUrl(baseUrl, path, options);

      case 'imgix':
        return this.generateImgixUrl(baseUrl, path, options);

      case 'imagekit':
        return this.generateImageKitUrl(baseUrl, path, options);

      case 'custom':
        return this.generateCustomUrl(baseUrl, owner, repo, path, options);

      default:
        return this.generateGitHubUrl(CDN_PROVIDERS.github.baseUrl, owner, repo, path);
    }
  }

  /**
   * Generate responsive image URLs for different screen sizes
   */
  generateResponsiveUrls(
    owner: string,
    repo: string,
    path: string,
    options: CDNUrlOptions = {}
  ): { size: number; url: string }[] {
    if (!this.config.imageTransformation.enabled) {
      const url = this.generateUrl(owner, repo, path, options);
      return [{ size: 1920, url }];
    }

    return this.config.imageTransformation.sizes.map(size => ({
      size,
      url: this.generateUrl(owner, repo, path, { ...options, width: size }),
    }));
  }

  /**
   * Generate srcset attribute for responsive images
   */
  generateSrcSet(owner: string, repo: string, path: string, options: CDNUrlOptions = {}): string {
    const responsiveUrls = this.generateResponsiveUrls(owner, repo, path, options);
    return responsiveUrls.map(({ size, url }) => `${url} ${size}w`).join(', ');
  }

  // Provider-specific URL generators

  private generateGitHubUrl(baseUrl: string, owner: string, repo: string, path: string): string {
    return `${baseUrl}/${owner}/${repo}/main/${path}`;
  }

  private generateJsDelivrUrl(baseUrl: string, owner: string, repo: string, path: string): string {
    return `${baseUrl}/${owner}/${repo}@main/${path}`;
  }

  private generateCloudinaryUrl(baseUrl: string, path: string, options: CDNUrlOptions): string {
    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format && options.format !== 'auto') transformations.push(`f_${options.format}`);
    if (options.fit) transformations.push(`c_${options.fit}`);
    if (options.background) transformations.push(`b_${options.background.replace('#', 'rgb:')}`);
    if (options.blur) transformations.push(`e_blur:${options.blur}`);
    if (options.sharpen) transformations.push('e_sharpen');
    if (options.grayscale) transformations.push('e_grayscale');

    // Auto format and quality optimization
    if (options.format === 'auto') transformations.push('f_auto');
    if (!options.quality) transformations.push('q_auto');

    const transformString = transformations.length > 0 ? `/${transformations.join(',')}` : '';
    return `${baseUrl}/YOUR_CLOUD_NAME/image/fetch${transformString}/${encodeURIComponent(path)}`;
  }

  private generateImgixUrl(baseUrl: string, path: string, options: CDNUrlOptions): string {
    const params = new URLSearchParams();

    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format && options.format !== 'auto') params.set('fm', options.format);
    if (options.fit) params.set('fit', options.fit);
    if (options.background) params.set('bg', options.background.replace('#', ''));
    if (options.blur) params.set('blur', options.blur.toString());
    if (options.sharpen) params.set('sharp', '1');
    if (options.grayscale) params.set('mono', '1');

    // Auto format optimization
    if (options.format === 'auto') params.set('auto', 'format,compress');

    const queryString = params.toString();
    return `${baseUrl}/${path}${queryString ? `?${queryString}` : ''}`;
  }

  private generateImageKitUrl(baseUrl: string, path: string, options: CDNUrlOptions): string {
    const transformations: string[] = [];

    if (options.width) transformations.push(`w-${options.width}`);
    if (options.height) transformations.push(`h-${options.height}`);
    if (options.quality) transformations.push(`q-${options.quality}`);
    if (options.format && options.format !== 'auto') transformations.push(`f-${options.format}`);
    if (options.fit) transformations.push(`c-${options.fit}`);
    if (options.background) transformations.push(`bg-${options.background.replace('#', '')}`);
    if (options.blur) transformations.push(`bl-${options.blur}`);
    if (options.sharpen) transformations.push('e-sharpen');
    if (options.grayscale) transformations.push('e-grayscale');

    // Auto format optimization
    if (options.format === 'auto') transformations.push('f-auto');

    const transformString = transformations.length > 0 ? `/tr:${transformations.join(',')}` : '';
    return `${baseUrl}/YOUR_ENDPOINT_ID${transformString}/${path}`;
  }

  private generateCustomUrl(
    baseUrl: string,
    owner: string,
    repo: string,
    path: string,
    options: CDNUrlOptions
  ): string {
    // Basic custom CDN support - users can extend this
    return `${baseUrl}/${owner}/${repo}/${path}`;
  }
}

// CDN performance utilities
export class CDNPerformanceAnalyzer {
  /**
   * Test CDN performance and select optimal provider
   */
  static async testProviders(
    testUrl: string,
    providers: CDNProvider[] = Object.values(CDN_PROVIDERS)
  ): Promise<{ provider: CDNProvider; latency: number; success: boolean }[]> {
    const results = await Promise.allSettled(
      providers.map(async provider => {
        const startTime = performance.now();
        try {
          const response = await fetch(testUrl, { method: 'HEAD' });
          const latency = performance.now() - startTime;
          return {
            provider,
            latency,
            success: response.ok,
          };
        } catch (error) {
          return {
            provider,
            latency: Infinity,
            success: false,
          };
        }
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .sort((a, b) => a.latency - b.latency);
  }

  /**
   * Get optimal CDN provider based on user location and requirements
   */
  static getOptimalProvider(
    userLocation?: string,
    requireImageTransformation = false
  ): CDNProvider {
    const providers = Object.values(CDN_PROVIDERS);

    // Filter by image transformation requirement
    const filteredProviders = requireImageTransformation
      ? providers.filter(p => p.features.imageTransformation)
      : providers;

    if (filteredProviders.length === 0) {
      return CDN_PROVIDERS.github; // Fallback
    }

    // For now, return based on features
    // In production, this could use geolocation and real performance data
    if (requireImageTransformation) {
      return CDN_PROVIDERS.cloudinary; // Best for image transformation
    }

    return CDN_PROVIDERS.github; // Default for simple CDN
  }
}

// CDN configuration manager
export class CDNConfigManager {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * Update CDN configuration
   */
  updateConfig(updates: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): CDNConfig {
    return { ...this.config };
  }

  /**
   * Validate CDN configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.provider) {
      errors.push('CDN provider is required');
    }

    if (this.config.provider?.id === 'custom' && !this.config.customDomain) {
      errors.push('Custom domain is required for custom CDN provider');
    }

    if (this.config.cacheSettings.maxAge < 0) {
      errors.push('Cache max age must be non-negative');
    }

    if (
      this.config.imageTransformation.quality < 1 ||
      this.config.imageTransformation.quality > 100
    ) {
      errors.push('Image quality must be between 1 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate cache headers for responses
   */
  generateCacheHeaders(): Record<string, string> {
    const { maxAge, staleWhileRevalidate, enableGzipCompression } = this.config.cacheSettings;

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    };

    if (enableGzipCompression) {
      headers['Content-Encoding'] = 'gzip';
    }

    return headers;
  }
}

// GitHub Pages specific utilities
export class GitHubPagesCDN {
  /**
   * Check if GitHub Pages is enabled for a repository
   */
  static async isPagesEnabled(owner: string, repo: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable GitHub Pages for a repository
   */
  static async enablePages(
    owner: string,
    repo: string,
    accessToken: string,
    source: 'gh-pages' | 'main' = 'main'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
        method: 'POST',
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch: source,
            path: '/',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          url: data.html_url,
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to enable GitHub Pages',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get GitHub Pages URL for a file
   */
  static getPagesUrl(owner: string, repo: string, path: string): string {
    return `https://${owner}.github.io/${repo}/${path}`;
  }
}

// Utility functions
export function createCDNConfig(
  providerId: string,
  customOptions: Partial<CDNConfig> = {}
): CDNConfig {
  const provider = CDN_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown CDN provider: ${providerId}`);
  }

  const defaultConfig = DEFAULT_CDN_CONFIGS[providerId] || {};

  return {
    provider,
    ...defaultConfig,
    ...customOptions,
  } as CDNConfig;
}

export function isMediaImageFile(path: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
}

export function optimizeImageUrl(
  url: string,
  options: CDNUrlOptions,
  generator: CDNUrlGenerator
): string {
  // Extract path from URL if it's a full URL
  const urlPath = url.includes('://') ? new URL(url).pathname : url;

  // This would need the actual owner/repo context
  // For now, return the original URL with basic optimization
  return url;
}

// Default export
export default CDNUrlGenerator;
