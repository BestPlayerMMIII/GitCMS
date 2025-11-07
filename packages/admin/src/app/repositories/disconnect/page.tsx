'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRepository } from '@/contexts/repository-context';
import { PageSubHeader } from '@/components/page-header';
import { useNavigationHeader } from '@/contexts/navigation-context';
import { AlertTriangle, Github, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function DisconnectRepositoryPage() {
  const { setHeader } = useNavigationHeader();
  const { repositoryInfo, setRepositoryInfo } = useRepository();
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setHeader(
      'repositories',
      <PageSubHeader
        title="Disconnect Repository"
        backName="Back to Repositories"
        onBack="/repositories/connect"
      />
    );
    return () => setHeader('repositories', null);
  }, [setHeader]);

  // Redirect if no repository is connected
  useEffect(() => {
    if (!repositoryInfo) {
      router.push('/repositories/connect');
    }
  }, [repositoryInfo, router]);

  const handleDisconnect = async () => {
    if (!repositoryInfo) return;

    setDisconnecting(true);

    try {
      // Clear repository info and local storage
      setRepositoryInfo(null);

      // Clear any other repository-related data
      localStorage.removeItem('gitcms-selected-repo');
      localStorage.removeItem('gitcms-connected-repo');

      // Give user feedback before redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to connect page
      router.push('/repositories/connect');
    } catch (error) {
      console.error('Failed to disconnect repository:', error);
      setDisconnecting(false);
    }
  };

  if (!repositoryInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const isConfirmValid = confirmText === `${repositoryInfo.owner}/${repositoryInfo.repo}`;

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* Warning Banner */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    Warning: Disconnecting Repository
                  </h3>
                  <p className="text-sm text-red-700">
                    This action will disconnect your repository from GitCMS Admin Panel. You will
                    need to reconnect if you want to use this repository again.
                  </p>
                </div>
              </div>
            </div>

            {/* Repository Info */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Currently Connected Repository
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Github className="h-8 w-8 text-gray-600" />
                  <div>
                    <div className="text-lg font-medium text-gray-900">
                      {repositoryInfo.owner}/{repositoryInfo.repo}
                    </div>
                    <div className="text-sm text-gray-500">GitHub Repository</div>
                  </div>
                </div>
              </div>
            </div>

            {/* What will happen */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                What happens when you disconnect:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  <span>All cached data will be cleared</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span>Your GitHub repository and its contents remain unchanged</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Type{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                  {repositoryInfo.owner}/{repositoryInfo.repo}
                </code>{' '}
                to confirm:
              </label>
              <input
                type="text"
                id="confirm"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={`${repositoryInfo.owner}/${repositoryInfo.repo}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={disconnecting}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => router.back()}
                disabled={disconnecting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={!isConfirmValid || disconnecting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disconnecting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Disconnect Repository</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
