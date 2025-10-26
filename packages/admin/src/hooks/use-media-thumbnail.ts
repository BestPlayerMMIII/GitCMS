/**
 * Hook for managing media thumbnails in rich-text editors and other contexts.
 * Provides methods to fetch and generate thumbnails with caching.
 */

import { useState, useCallback } from 'react';
import { createGitHubClient } from '@/lib/client-github';
import {
  generateThumbnail,
  getCachedThumbnail,
  type ThumbnailOptions,
} from '@/lib/thumbnail-generator';

interface UseMediaThumbnailOptions {
  owner: string;
  repo: string;
  thumbnailOptions?: ThumbnailOptions;
}

interface UseMediaThumbnailReturn {
  /** Generate a thumbnail for a media file */
  getThumbnail: (path: string) => Promise<string>;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook for fetching and generating thumbnails for media files.
 * Useful for rich-text editors where you need the thumbnail data URL
 * to store in the content.
 *
 * @example
 * ```tsx
 * const { getThumbnail, loading } = useMediaThumbnail({
 *   owner: 'user',
 *   repo: 'repo',
 *   thumbnailOptions: { maxWidth: 200, maxHeight: 200 }
 * });
 *
 * // In your editor's image insertion handler:
 * const thumbnailUrl = await getThumbnail('media/image.jpg');
 * editor.commands.setImage({ src: thumbnailUrl });
 * ```
 */
export function useMediaThumbnail({
  owner,
  repo,
  thumbnailOptions,
}: UseMediaThumbnailOptions): UseMediaThumbnailReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getThumbnail = useCallback(
    async (path: string): Promise<string> => {
      // Check cache first
      const cached = getCachedThumbnail(owner, repo, path, thumbnailOptions);
      if (cached) {
        return cached;
      }

      setLoading(true);
      setError(null);

      try {
        const github = createGitHubClient(owner, repo);
        const token = await (github as any).getAccessToken();

        // Fetch raw file content from GitHub API
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.raw',
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // Generate thumbnail
        const thumbnailDataUrl = await generateThumbnail(blob, owner, repo, path, thumbnailOptions);

        setLoading(false);
        return thumbnailDataUrl;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to generate thumbnail');
        setError(errorObj);
        setLoading(false);
        throw errorObj;
      }
    },
    [owner, repo, thumbnailOptions]
  );

  return {
    getThumbnail,
    loading,
    error,
  };
}
