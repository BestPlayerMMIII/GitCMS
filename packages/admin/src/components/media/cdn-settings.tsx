'use client';

import React, { useState, useEffect } from 'react';
import {
  CDN_PROVIDERS,
  DEFAULT_CDN_CONFIGS,
  CDNUrlGenerator,
  CDNConfigManager,
  GitHubPagesCDN,
  createCDNConfig,
  type CDNConfig,
  type CDNProvider,
  type CDNUrlOptions,
} from '@git-cms/core';
import {
  Globe,
  Zap,
  Settings,
  Check,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';

interface CDNSettingsProps {
  owner: string;
  repo: string;
  onConfigChange?: (config: CDNConfig) => void;
  className?: string;
}

export default function CDNSettings({
  owner,
  repo,
  onConfigChange,
  className = '',
}: CDNSettingsProps) {
  const [config, setConfig] = useState<CDNConfig>(createCDNConfig('github'));
  const [isTestingPages, setIsTestingPages] = useState(false);
  const [pagesStatus, setPagesStatus] = useState<'unknown' | 'enabled' | 'disabled'>('unknown');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingProviders, setIsTestingProviders] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  const configManager = new CDNConfigManager(config);
  const urlGenerator = new CDNUrlGenerator(config);

  // Check GitHub Pages status on mount
  useEffect(() => {
    checkPagesStatus();
  }, [owner, repo]);

  // Update config when it changes
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const checkPagesStatus = async () => {
    try {
      const response = await fetch(`/api/github/pages?owner=${owner}&repo=${repo}`);
      const data = await response.json();
      setPagesStatus(data.enabled ? 'enabled' : 'disabled');
    } catch (error) {
      setPagesStatus('unknown');
    }
  };

  const enableGitHubPages = async () => {
    setIsTestingPages(true);
    try {
      const response = await fetch('/api/github/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, source: 'main' }),
      });

      const result = await response.json();
      if (result.success) {
        setPagesStatus('enabled');
      } else {
        console.error('Failed to enable GitHub Pages:', result.error);
      }
    } catch (error) {
      console.error('Error enabling GitHub Pages:', error);
    } finally {
      setIsTestingPages(false);
    }
  };

  const testProviders = async () => {
    setIsTestingProviders(true);
    try {
      const response = await fetch('/api/cdn/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      });

      const data = await response.json();
      if (data.success) {
        setTestResults(data.results);
      } else {
        console.error('CDN test failed:', data.error);
        setTestResults([]);
      }
    } catch (error) {
      console.error('Error testing providers:', error);
      setTestResults([]);
    } finally {
      setIsTestingProviders(false);
    }
  };

  const updateConfig = (updates: Partial<CDNConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
  };

  const updateProvider = (providerId: string) => {
    const provider = CDN_PROVIDERS[providerId];
    if (!provider) return;

    const defaultConfig = DEFAULT_CDN_CONFIGS[providerId] || {};
    updateConfig({
      provider,
      ...defaultConfig,
      customDomain: providerId === 'custom' ? '' : undefined,
    });
  };

  const generatePreviewUrls = () => {
    if (!previewImage) return [];

    const baseOptions: CDNUrlOptions = { format: 'webp', quality: 85 };

    return [
      {
        device: 'Mobile',
        icon: <Smartphone className="w-4 h-4" />,
        width: 375,
        url: urlGenerator.generateUrl(owner, repo, previewImage, { ...baseOptions, width: 375 }),
      },
      {
        device: 'Tablet',
        icon: <Tablet className="w-4 h-4" />,
        width: 768,
        url: urlGenerator.generateUrl(owner, repo, previewImage, { ...baseOptions, width: 768 }),
      },
      {
        device: 'Desktop',
        icon: <Monitor className="w-4 h-4" />,
        width: 1920,
        url: urlGenerator.generateUrl(owner, repo, previewImage, { ...baseOptions, width: 1920 }),
      },
    ];
  };

  const validation = configManager.validateConfig();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">CDN Configuration</h3>
        <p className="text-gray-600">
          Configure Content Delivery Network settings for faster media delivery and image
          optimization.
        </p>
      </div>

      {/* Validation Errors */}
      {!validation.valid && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="font-medium text-red-800">Configuration Issues</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">CDN Provider</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(CDN_PROVIDERS).map(([id, provider]) => (
            <button
              key={id}
              onClick={() => updateProvider(id)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                config.provider.id === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{provider.name}</h4>
                {config.provider.id === id && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center">
                  <Globe className="w-3 h-3 mr-1" />
                  {provider.features.caching ? 'Caching' : 'No caching'}
                </div>
                <div className="flex items-center">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {provider.features.imageTransformation ? 'Image optimization' : 'Basic delivery'}
                </div>
                <div className="flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  {provider.features.webpSupport ? 'WebP support' : 'Standard formats'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* GitHub Pages Integration */}
      {config.provider.id === 'github' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">GitHub Pages Integration</h4>
            <div className="flex items-center space-x-2">
              {pagesStatus === 'enabled' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Enabled
                </span>
              )}
              {pagesStatus === 'disabled' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Disabled
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            GitHub Pages provides free CDN hosting for your media files. Enable it for better
            performance.
          </p>
          {pagesStatus === 'disabled' && (
            <button
              onClick={enableGitHubPages}
              disabled={isTestingPages}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isTestingPages ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Enable GitHub Pages
                </>
              )}
            </button>
          )}
          {pagesStatus === 'enabled' && (
            <p className="text-sm text-green-700">
              Your media files are now served via GitHub Pages CDN at:{' '}
              <code className="bg-white px-1 rounded">
                https://{owner}.github.io/{repo}/
              </code>
            </p>
          )}
        </div>
      )}

      {/* Custom Domain */}
      {config.provider.id === 'custom' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom CDN Domain</label>
          <input
            type="url"
            value={config.customDomain || ''}
            onChange={e => updateConfig({ customDomain: e.target.value })}
            placeholder="https://cdn.example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter your custom CDN domain URL (without trailing slash)
          </p>
        </div>
      )}

      {/* Image Transformation Settings */}
      {config.provider.features.imageTransformation && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Image Optimization</h4>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.imageTransformation.enabled}
                onChange={e =>
                  updateConfig({
                    imageTransformation: {
                      ...config.imageTransformation,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Enable automatic image optimization</span>
            </label>

            {config.imageTransformation.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Quality ({config.imageTransformation.quality}%)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={config.imageTransformation.quality}
                    onChange={e =>
                      updateConfig({
                        imageTransformation: {
                          ...config.imageTransformation,
                          quality: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supported Formats
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['webp', 'avif', 'jpeg', 'png'].map(format => (
                      <label key={format} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.imageTransformation.formats.includes(format)}
                          onChange={e => {
                            const formats = e.target.checked
                              ? [...config.imageTransformation.formats, format]
                              : config.imageTransformation.formats.filter(
                                  (f: string) => f !== format
                                );

                            updateConfig({
                              imageTransformation: {
                                ...config.imageTransformation,
                                formats,
                              },
                            });
                          }}
                          className="mr-1"
                        />
                        <span className="text-sm text-gray-700 uppercase">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cache Settings */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Cache Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Age (seconds)
            </label>
            <input
              type="number"
              value={config.cacheSettings.maxAge}
              onChange={e =>
                updateConfig({
                  cacheSettings: {
                    ...config.cacheSettings,
                    maxAge: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stale While Revalidate (seconds)
            </label>
            <input
              type="number"
              value={config.cacheSettings.staleWhileRevalidate}
              onChange={e =>
                updateConfig({
                  cacheSettings: {
                    ...config.cacheSettings,
                    staleWhileRevalidate: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <label className="flex items-center mt-3">
          <input
            type="checkbox"
            checked={config.cacheSettings.enableGzipCompression}
            onChange={e =>
              updateConfig({
                cacheSettings: {
                  ...config.cacheSettings,
                  enableGzipCompression: e.target.checked,
                },
              })
            }
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Enable Gzip compression</span>
        </label>
      </div>

      {/* Provider Performance Test */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Provider Performance</h4>
          <button
            onClick={testProviders}
            disabled={isTestingProviders}
            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            {isTestingProviders ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Providers
              </>
            )}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={result.providerId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-3 ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium">{result.provider}</span>
                  {index === 0 && result.success && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Fastest
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {result.success ? `${result.latency}ms` : 'Failed'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL Preview */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">URL Preview</h4>
        <div className="mb-3">
          <input
            type="text"
            value={previewImage}
            onChange={e => setPreviewImage(e.target.value)}
            placeholder="Enter image path (e.g., .gitcms/media/example.jpg)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {previewImage && (
          <div className="space-y-3">
            {generatePreviewUrls().map(preview => (
              <div key={preview.device} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  {preview.icon}
                  <span className="ml-2 font-medium text-sm">
                    {preview.device} ({preview.width}px)
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-mono break-all">{preview.url}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => console.log('CDN Configuration:', config)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Configuration
        </button>
        <button
          onClick={() => updateConfig(createCDNConfig('github'))}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
