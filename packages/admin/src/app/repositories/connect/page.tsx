'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RepositoryPicker } from '@/components/repository-picker';
import { PageSubHeader } from '@/components/page-header';
import { ArrowRight, CheckCircle2, Github, Unplug } from 'lucide-react';
import { useNavigationHeader } from '@/contexts/navigation-context';
import { LoadingSpinner } from '@/components/ui/loading';
import { useRepository } from '@/contexts/repository-context';
import Link from 'next/link';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export default function ConnectRepositoryPage() {
  const { setHeader } = useNavigationHeader();
  const { repositoryInfo } = useRepository();
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setHeader(
      'repositories',
      <PageSubHeader title="Connect Repository" backName="Back to Dashboard" onBack="/" />
    );
    return () => setHeader('repositories', null);
  }, [setHeader]);

  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    if (!selectedRepository) return;

    setConnecting(true);
    try {
      // Store selected repository for the setup wizard
      localStorage.setItem('gitcms-selected-repo', JSON.stringify(selectedRepository));

      // Redirect to setup wizard
      router.push('/repositories/setup');
    } catch (error) {
      console.error('Failed to connect repository:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Show currently connected repository if exists */}
        {repositoryInfo && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Currently Connected
                      </h3>
                      <div className="flex items-center space-x-2 text-gray-600 mb-3">
                        <Github className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {repositoryInfo.owner}/{repositoryInfo.repo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        This repository is currently connected to GitCMS. You can manage its
                        content, schemas, and media from the admin panel.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href="/repositories/disconnect"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    className="group relative inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg overflow-hidden"
                  >
                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Ripple effect on hover */}
                    {isHovering && (
                      <div className="absolute inset-0 animate-ping bg-red-400 opacity-25 rounded-lg" />
                    )}

                    {/* Content */}
                    <Unplug
                      className={`h-4 w-4 relative z-10 transition-transform duration-300 ${isHovering ? 'rotate-12' : ''}`}
                    />
                    <span className="relative z-10 font-medium">Disconnect Repository</span>
                  </Link>
                  <p className="mt-2 text-xs text-gray-500">
                    Disconnecting will clear all local data: you will need to reconnect it to use it
                    again in GitCMS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <RepositoryPicker
              onSelectRepository={setSelectedRepository}
              selectedRepository={selectedRepository}
              inSelectedRepository={
                selectedRepository ? (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Next: we'll analyze {selectedRepository.name} and set up GitCMS
                        configuration
                      </div>
                      <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connecting ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        <span>{connecting ? 'Connecting...' : 'Connect Repository'}</span>
                      </button>
                    </div>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
