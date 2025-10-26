'use client';

import { useState, useEffect } from 'react';
import { createGitHubClient } from '@/lib/client-github';
import { getMimeType } from '@/lib/mime-types';
import {
  generateThumbnail,
  getCachedThumbnail,
  type ThumbnailOptions,
} from '@/lib/thumbnail-generator';

interface AuthenticatedImageProps {
  owner: string;
  repo: string;
  path: string;
  alt: string;
  className?: string;
  thumbnailUrl?: string;
  onError?: () => void;
  /** Whether to generate a thumbnail instead of showing full image */
  useThumbnail?: boolean;
  /** Thumbnail generation options */
  thumbnailOptions?: ThumbnailOptions;
  /** Callback with generated thumbnail data URL (for storing in content) */
  onThumbnailGenerated?: (dataUrl: string) => void;
}

/**
 * Image component that fetches and displays images from GitHub repositories with authentication.
 * Supports both public and private repositories, and handles files of any size.
 *
 * Features:
 * - Uses OAuth tokens for authentication
 * - Creates object URLs to avoid data URL size limits
 * - Properly cleans up resources on unmount
 * - Shows loading and error states
 * - Optional thumbnail generation with caching
 *
 * @param owner - GitHub repository owner
 * @param repo - GitHub repository name
 * @param path - File path within the repository
 * @param alt - Alt text for the image
 * @param thumbnailUrl - Optional pre-generated thumbnail (data URL)
 * @param useThumbnail - Whether to generate a thumbnail (default: false, shows full image)
 * @param thumbnailOptions - Options for thumbnail generation (size, quality, format)
 * @param onThumbnailGenerated - Callback with generated thumbnail data URL
 * @param onError - Optional error callback
 */
export function AuthenticatedImage({
  owner,
  repo,
  path,
  alt,
  className = '',
  thumbnailUrl,
  onError,
  useThumbnail = false,
  thumbnailOptions,
  onThumbnailGenerated,
}: AuthenticatedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(thumbnailUrl || null);
  const [loading, setLoading] = useState(!thumbnailUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we have a pre-generated thumbnail, use it
    if (thumbnailUrl) {
      setImageSrc(thumbnailUrl);
      setLoading(false);
      return;
    }

    // Check if we have a cached thumbnail
    if (useThumbnail) {
      const cached = getCachedThumbnail(owner, repo, path, thumbnailOptions);
      if (cached) {
        setImageSrc(cached);
        setLoading(false);
        onThumbnailGenerated?.(cached);
        return;
      }
    }

    let mounted = true;
    let objectUrl: string | null = null;

    async function fetchImage() {
      try {
        const github = createGitHubClient(owner, repo);
        const token = await (github as any).getAccessToken();

        const mimeType = getMimeType(path, 'image/jpeg');

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

        if (!mounted) return;

        const blob = await response.blob();

        // Generate thumbnail if requested
        if (useThumbnail) {
          const thumbnailDataUrl = await generateThumbnail(
            blob,
            owner,
            repo,
            path,
            thumbnailOptions
          );

          if (!mounted) return;

          setImageSrc(thumbnailDataUrl);
          setLoading(false);
          onThumbnailGenerated?.(thumbnailDataUrl);
        } else {
          // Use Object URL for full-size image
          objectUrl = URL.createObjectURL(blob);
          setImageSrc(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load authenticated image:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
          onError?.();
        }
      }
    }

    fetchImage();

    return () => {
      mounted = false;
      // Only revoke object URLs (not data URLs from thumbnails)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    owner,
    repo,
    path,
    thumbnailUrl,
    useThumbnail,
    thumbnailOptions,
    onThumbnailGenerated,
    onError,
  ]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-pulse text-gray-400">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 ${className}`}>
        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-xs text-gray-500 mt-1">Image unavailable</p>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      draggable={false}
      loading="lazy"
      onError={() => {
        setError(true);
        onError?.();
      }}
    />
  );
}
