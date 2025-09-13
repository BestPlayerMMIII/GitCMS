'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Folder, Settings } from 'lucide-react';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

interface GitCMSConfig {
  hasGitCMS: boolean;
  config?: any;
  contentStructure?: {
    detectedPaths: Array<{
      path: string;
      files: number;
      dirs: number;
    }>;
    suggestedSetup: string;
  };
  repository: Repository;
}

interface SetupWizardProps {
  repository: Repository;
}

export function SetupWizard({ repository }: SetupWizardProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gitcmsConfig, setGitcmsConfig] = useState<GitCMSConfig | null>(null);
  const [setupConfig, setSetupConfig] = useState({
    contentPath: 'content',
    mediaPath: 'public/media',
    collections: [] as string[],
  });
  const [step, setStep] = useState<'check' | 'configure' | 'complete'>('check');
  const router = useRouter();

  const checkConfiguration = async () => {
    setChecking(true);
    try {
      const response = await fetch(
        `/api/github/config?owner=${repository.owner}&repo=${repository.name}`
      );

      if (!response.ok) {
        throw new Error('Failed to check configuration');
      }

      const config = await response.json();
      setGitcmsConfig(config);

      if (config.hasGitCMS) {
        setStep('complete');
      } else {
        setStep('configure');
        // Use suggested setup from detected structure
        if (config.contentStructure?.suggestedSetup) {
          setSetupConfig(prev => ({
            ...prev,
            contentPath: config.contentStructure.suggestedSetup,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to check configuration:', error);
    } finally {
      setChecking(false);
    }
  };

  const initializeGitCMS = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/github/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repository.owner,
          repo: repository.name,
          config: setupConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize GitCMS');
      }

      const result = await response.json();
      console.log('GitCMS initialized:', result);
      setStep('complete');
    } catch (error) {
      console.error('Failed to initialize GitCMS:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Clean up the selection localStorage
    localStorage.removeItem('gitcms-selected-repo');
    // Store the connected repository
    localStorage.setItem('gitcms-connected-repo', JSON.stringify(repository));
    router.push('/');
  };

  if (step === 'check') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Repository Analysis</h3>
          <p className="mt-1 text-sm text-gray-500">
            Let's check if {repository.fullName} is already configured for GitCMS
          </p>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium text-gray-900">{repository.fullName}</h4>
              <p className="text-sm text-gray-500">
                Analyzing repository structure and GitCMS configuration
              </p>
            </div>
            <button
              onClick={checkConfiguration}
              disabled={checking}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {checking ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>{checking ? 'Analyzing...' : 'Analyze Repository'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'configure') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Setup Required</h3>
          <p className="mt-1 text-sm text-gray-500">
            {repository.fullName} isn't configured for GitCMS yet. Let's set it up!
          </p>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Detected Content Structure */}
            {gitcmsConfig?.contentStructure?.detectedPaths &&
              gitcmsConfig.contentStructure.detectedPaths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Detected Content Directories
                  </h4>
                  <div className="space-y-2">
                    {gitcmsConfig.contentStructure.detectedPaths.map(path => (
                      <div
                        key={path.path}
                        className="flex items-center justify-between bg-gray-50 rounded p-3"
                      >
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">{path.path}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {path.files} files, {path.dirs} directories
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Configuration Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Content Directory</label>
                <input
                  type="text"
                  value={setupConfig.contentPath}
                  onChange={e => setSetupConfig(prev => ({ ...prev, contentPath: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="content"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Directory where your content files will be stored
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Media Directory</label>
                <input
                  type="text"
                  value={setupConfig.mediaPath}
                  onChange={e => setSetupConfig(prev => ({ ...prev, mediaPath: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="public/media"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Directory where uploaded media files will be stored
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep('check')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                onClick={initializeGitCMS}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <span>{loading ? 'Setting up...' : 'Initialize GitCMS'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Setup Complete!</h3>
          <p className="mt-1 text-sm text-gray-500">{repository.fullName} is ready for GitCMS</p>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">Repository Connected</h4>
                  <p className="mt-1 text-sm text-green-700">
                    GitCMS configuration has been created in {repository.fullName}
                  </p>
                </div>
              </div>
            </div>

            {gitcmsConfig?.config && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Configuration</h4>
                <div className="bg-gray-50 rounded p-3">
                  <pre className="text-xs text-gray-600">
                    {JSON.stringify(gitcmsConfig.config, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={handleComplete}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
