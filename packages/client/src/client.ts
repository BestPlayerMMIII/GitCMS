import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, TransportMode, RateLimitInfo } from './types';
import { SchemaRef } from './contents';
import { MediaManager, ContentMediaHelper } from './media';

export class GitCMS {
  private octokit: Octokit;
  private config: GitCMSConfig;
  private transport: TransportMode;
  private _mediaManager: MediaManager;
  private _contentMediaHelper: ContentMediaHelper;

  constructor(config: GitCMSConfig) {
    this.config = {
      branch: 'main',
      ...config,
    };

    // Auto-detect transport mode if not specified
    this.transport = this.detectTransportMode(config);

    // Initialize Octokit with or without auth based on transport mode
    this.octokit = new Octokit({
      auth: this.transport === 'authenticated' ? config.token : undefined,
    });

    this._mediaManager = new MediaManager(this.config, this.transport);
    this._contentMediaHelper = new ContentMediaHelper(this.config, this.transport);
  }

  /**
   * Detect the appropriate transport mode based on configuration
   */
  private detectTransportMode(config: GitCMSConfig): TransportMode {
    // Use explicitly specified transport if provided
    if (config.transport) {
      // Validate the configuration
      if (config.transport === 'proxy' && !config.baseUrl) {
        throw new Error('GitCMS: transport mode "proxy" requires baseUrl to be specified');
      }
      if (config.transport === 'authenticated' && !config.token) {
        console.warn(
          'GitCMS: transport mode "authenticated" specified but no token provided. Requests may fail for private repositories.'
        );
      }
      return config.transport;
    }

    // Auto-detect based on provided configuration
    if (config.baseUrl) {
      return 'proxy';
    }
    if (config.token) {
      return 'authenticated';
    }

    // Default to public mode for public repositories
    return 'public';
  }

  /**
   * Get the current transport mode being used
   */
  getTransportMode(): TransportMode {
    return this.transport;
  }

  /**
   * Check if the client is configured for public access
   */
  isPublicMode(): boolean {
    return this.transport === 'public';
  }

  /**
   * Get GitHub API rate limit information (only available in public/authenticated modes)
   */
  async getRateLimit(): Promise<RateLimitInfo | null> {
    if (this.transport === 'proxy') {
      return null; // Rate limit info not available in proxy mode
    }

    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
        used: data.rate.used,
      };
    } catch (error) {
      console.error('Failed to fetch rate limit info:', error);
      return null;
    }
  }

  /**
   * Access the media manager for working with GitCMS media
   * Provides methods for extracting, rendering, and fetching media
   */
  get media(): MediaManager {
    return this._mediaManager;
  }

  /**
   * Access content media helper for convenient media operations on content items
   */
  get contentMedia(): ContentMediaHelper {
    return this._contentMediaHelper;
  }

  /**
   * Get content from a schema (SQL-like FROM syntax)
   */
  from(schemaName: string): SchemaRef {
    return new SchemaRef(schemaName, this.octokit, this.config);
  }
}
