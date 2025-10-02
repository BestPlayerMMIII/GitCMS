import {
  MediaEmbedder,
  type EmbeddedMedia,
  type ResponsiveImageSources,
  type GitCMSConfig,
} from './index';

/**
 * React integration utilities for GitCMS media embedding
 * Note: This requires React to be installed in your project
 */

/**
 * Creates a media embedder instance with config
 */
export function createMediaEmbedder(config: GitCMSConfig) {
  return new MediaEmbedder(config);
}

/**
 * Hook factory for embedding media with GitCMS
 * Usage: const useMediaEmbedder = createUseMediaEmbedder(config);
 */
export function createUseMediaEmbedder(config: GitCMSConfig) {
  return function useMediaEmbedder() {
    // Requires useMemo from React
    const embedder = new MediaEmbedder(config);

    return {
      embedMedia: embedder.embedMedia.bind(embedder),
      generateResponsiveSources: embedder.generateResponsiveSources.bind(embedder),
      processRichTextContent: embedder.processRichTextContent.bind(embedder),
      embedVideo: embedder.embedVideo.bind(embedder),
    };
  };
}

/**
 * Utility for processing a single media URL
 */
export function embedMediaUrl(
  config: GitCMSConfig,
  thumbnailUrl: string,
  options?: {
    size?: 'thumbnail' | 'medium' | 'large' | 'original';
    format?: 'webp' | 'jpeg' | 'png' | 'original';
    lazy?: boolean;
  }
): EmbeddedMedia {
  const embedder = new MediaEmbedder(config);
  return embedder.embedMedia(thumbnailUrl, options);
}

/**
 * Utility for generating responsive image sources
 */
export function generateResponsiveImageSources(
  config: GitCMSConfig,
  thumbnailUrl: string
): ResponsiveImageSources {
  const embedder = new MediaEmbedder(config);
  return embedder.generateResponsiveSources(thumbnailUrl);
}

/**
 * Utility for processing rich text content
 */
export function processRichTextContent(config: GitCMSConfig, htmlContent: string): string {
  const embedder = new MediaEmbedder(config);
  return embedder.processRichTextContent(htmlContent);
}

/**
 * Component factory for responsive GitCMS images
 * Returns a component that can be used in React applications
 */
export function createResponsiveImageComponent(config: GitCMSConfig) {
  return function ResponsiveImage({
    src,
    alt = '',
    className,
    loading = 'lazy',
    sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  }: {
    src: string;
    alt?: string;
    className?: string;
    loading?: 'lazy' | 'eager';
    sizes?: string;
  }) {
    const responsive = generateResponsiveImageSources(config, src);

    // Return JSX structure as object (requires React.createElement to render)
    return {
      type: 'picture',
      props: {},
      children: [
        ...responsive.sources.map((source, index) => ({
          type: 'source',
          key: index,
          props: {
            media: source.media,
            srcSet: source.srcset,
            type: source.type,
            sizes: sizes,
          },
        })),
        {
          type: 'img',
          props: {
            src: responsive.default,
            alt,
            className,
            loading,
            sizes,
          },
        },
      ],
    };
  };
}

/**
 * Component factory for GitCMS rich text content with embedded media
 */
export function createRichTextContentComponent(config: GitCMSConfig) {
  return function RichTextContent({ content, className }: { content: string; className?: string }) {
    const processedContent = processRichTextContent(config, content);

    return {
      type: 'div',
      props: {
        className,
        dangerouslySetInnerHTML: { __html: processedContent },
      },
    };
  };
}
