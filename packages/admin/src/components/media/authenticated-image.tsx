'use client';

import { useState, useEffect } from 'react';
import { createGitHubClient } from '@/lib/client-github';
import {
  buildAuthenticatedThumbnailUrl,
  fetchAuthenticatedThumbnail,
  getThumbnailPath,
} from '@git-cms/core';

interface AuthenticatedImageProps {
  owner: string;
  repo: string;
  path: string;
  alt: string;
  className?: string;
  thumbnailUrl?: string;
  onError?: () => void;
}

/**
 * Image component that fetches and displays images from GitHub repositories with authentication.
 * Supports both public and private repositories, and handles files of any size.
 *
 * Features:
 * - Uses OAuth tokens for authentication
 * - Fetches pre-generated thumbnails from GitHub (in thumbnails/ subfolder)
 * - Converts to base64 data URLs for direct embedding
 * - Shows loading and error states
 *
 * @param owner - GitHub repository owner
 * @param repo - GitHub repository name
 * @param path - File path within the repository
 * @param alt - Alt text for the image
 * @param thumbnailUrl - Optional pre-generated thumbnail (data URL)
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
}: AuthenticatedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(thumbnailUrl || null);
  const [loading, setLoading] = useState(!thumbnailUrl);
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
    setLoading(false);
    onError?.();
  };

  useEffect(() => {
    // If we have a pre-generated thumbnail URL, use it
    if (thumbnailUrl) {
      setImageSrc(thumbnailUrl);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchImage() {
      try {
        const github = createGitHubClient(owner, repo);
        const token = await (github as any).getAccessToken();

        // directly fetch authenticated thumbnail
        const thumbnail = await fetchAuthenticatedThumbnail(owner, repo, path, token);

        setImageSrc(thumbnail);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load authenticated image:', err);
        if (mounted) {
          handleError();
        }
      }
    }

    fetchImage();

    return () => {
      mounted = false;
    };
  }, [owner, repo, path, thumbnailUrl, onError]);

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
      onError={handleError}
    />
  );
}
