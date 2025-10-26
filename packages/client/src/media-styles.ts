/**
 * GitCMS Media Rendering Styles
 * CSS styles for media placeholders and enhanced rendering
 */

/**
 * Default CSS styles for GitCMS media rendering
 * Include these styles in your application for proper media display
 */
export const GITCMS_MEDIA_STYLES = `
/* GitCMS Media Placeholders */
.gitcms-video-placeholder,
.gitcms-audio-placeholder,
.gitcms-document-placeholder,
.gitcms-3d-placeholder {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  max-width: 100%;
}

.gitcms-video-placeholder:hover,
.gitcms-audio-placeholder:hover,
.gitcms-document-placeholder:hover,
.gitcms-3d-placeholder:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* Video Placeholder */
.gitcms-video-placeholder {
  position: relative;
  padding: 0;
  border: none;
  background: transparent;
}

.gitcms-video-poster {
  width: 100%;
  max-width: 640px;
  height: auto;
  border-radius: 12px;
  display: block;
}

.gitcms-video-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  padding: 20px;
  transition: all 0.2s ease;
}

.gitcms-video-placeholder:hover .gitcms-video-overlay {
  background: rgba(59, 130, 246, 0.8);
  transform: translate(-50%, -50%) scale(1.1);
}

/* Audio Placeholder */
.gitcms-audio-placeholder {
  min-width: 300px;
}

/* Document Placeholder */
.gitcms-document-placeholder {
  flex-direction: column;
}

.gitcms-document-thumbnail {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

/* Document Link (full render) */
.gitcms-document-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-decoration: none;
  color: #111827;
  transition: all 0.2s;
  font-weight: 500;
}

.gitcms-document-link:hover {
  background: #e5e7eb;
  border-color: #3b82f6;
  color: #1f2937;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Video and Audio Elements */
video[data-gitcms-path],
audio[data-gitcms-path] {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Loading state for progressive enhancement */
[data-gitcms-thumbnail="true"] {
  position: relative;
}

[data-gitcms-thumbnail="true"]::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

[data-gitcms-thumbnail="true"].loading::after {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .gitcms-video-placeholder,
  .gitcms-audio-placeholder,
  .gitcms-document-placeholder,
  .gitcms-3d-placeholder {
    padding: 16px;
  }

  .gitcms-audio-placeholder {
    min-width: 100%;
  }

  .gitcms-video-poster {
    max-width: 100%;
  }
}
`;

/**
 * Inject GitCMS media styles into the document
 * Call this once in your application initialization
 */
export function injectMediaStyles(): void {
  if (typeof document === 'undefined') {
    console.warn('injectMediaStyles can only be called in browser environment');
    return;
  }

  // Check if styles are already injected
  if (document.getElementById('gitcms-media-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'gitcms-media-styles';
  styleElement.textContent = GITCMS_MEDIA_STYLES;
  document.head.appendChild(styleElement);
}

/**
 * Progressive enhancement: upgrade placeholders to full media on click
 * This function adds click handlers to media placeholders to load the full content
 */
export function enableProgressiveMediaLoading(
  container: HTMLElement,
  mediaManager: any // MediaManager instance
): void {
  if (typeof document === 'undefined') {
    console.warn('enableProgressiveMediaLoading can only be called in browser environment');
    return;
  }

  // Handle video placeholders
  const videoPlaceholders = container.querySelectorAll(
    '.gitcms-video-placeholder[data-gitcms-path]'
  );
  videoPlaceholders.forEach(placeholder => {
    const path = placeholder.getAttribute('data-gitcms-path');
    const filename = placeholder.getAttribute('data-filename');

    if (!path) return;

    placeholder.addEventListener('click', async () => {
      placeholder.classList.add('loading');

      try {
        // Extract media reference
        const references = mediaManager.extractFromHTML(
          `<gitcms-media data-path="${path}" data-filename="${filename || ''}"></gitcms-media>`
        );

        if (references.length === 0) return;

        // Fetch full media
        const fullData = await mediaManager.fetchFull(references[0]);

        // Create video element
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        video.style.maxWidth = '100%';
        video.style.height = 'auto';
        video.setAttribute('data-gitcms-path', path);

        const source = document.createElement('source');
        source.src = fullData.url;
        source.type = references[0].mimeType || 'video/mp4';

        video.appendChild(source);

        // Replace placeholder with video
        placeholder.parentNode?.replaceChild(video, placeholder);

        // Auto-play after loading
        video.load();
      } catch (error) {
        console.error('Failed to load video:', error);
        placeholder.classList.remove('loading');
        alert('Failed to load video. Please try again.');
      }
    });
  });

  // Handle audio placeholders
  const audioPlaceholders = container.querySelectorAll(
    '.gitcms-audio-placeholder[data-gitcms-path]'
  );
  audioPlaceholders.forEach(placeholder => {
    const path = placeholder.getAttribute('data-gitcms-path');
    const filename = placeholder.getAttribute('data-filename');

    if (!path) return;

    placeholder.addEventListener('click', async () => {
      placeholder.classList.add('loading');

      try {
        const references = mediaManager.extractFromHTML(
          `<gitcms-media data-path="${path}" data-filename="${filename || ''}"></gitcms-media>`
        );

        if (references.length === 0) return;

        const fullData = await mediaManager.fetchFull(references[0]);

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.style.maxWidth = '100%';
        audio.setAttribute('data-gitcms-path', path);

        const source = document.createElement('source');
        source.src = fullData.url;
        source.type = references[0].mimeType || 'audio/mpeg';

        audio.appendChild(source);

        placeholder.parentNode?.replaceChild(audio, placeholder);

        audio.load();
      } catch (error) {
        console.error('Failed to load audio:', error);
        placeholder.classList.remove('loading');
        alert('Failed to load audio. Please try again.');
      }
    });
  });

  // Handle document placeholders
  const documentPlaceholders = container.querySelectorAll(
    '.gitcms-document-placeholder[data-gitcms-path]'
  );
  documentPlaceholders.forEach(placeholder => {
    const path = placeholder.getAttribute('data-gitcms-path');
    const filename = placeholder.getAttribute('data-filename');

    if (!path) return;

    placeholder.addEventListener('click', async () => {
      placeholder.classList.add('loading');

      try {
        const references = mediaManager.extractFromHTML(
          `<gitcms-media data-path="${path}" data-filename="${filename || ''}"></gitcms-media>`
        );

        if (references.length === 0) return;

        const fullData = await mediaManager.fetchFull(references[0]);

        // Create download link
        const link = document.createElement('a');
        link.href = fullData.url;
        link.download = filename || 'document';
        link.className = 'gitcms-document-link';
        link.setAttribute('data-gitcms-path', path);
        link.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
          </svg>
          <span style="font-weight: 500;">${filename || 'Download Document'}</span>
        `;

        placeholder.parentNode?.replaceChild(link, placeholder);

        // Trigger download
        link.click();
      } catch (error) {
        console.error('Failed to load document:', error);
        placeholder.classList.remove('loading');
        alert('Failed to load document. Please try again.');
      }
    });
  });
}
