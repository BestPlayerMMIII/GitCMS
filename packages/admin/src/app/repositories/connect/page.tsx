'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RepositoryPicker } from '@/components/repository-picker';
import { PageSubHeader } from '@/components/page-header';
import { ArrowRight } from 'lucide-react';
import { useNavigationHeader } from '@/contexts/navigation-context';
import { LoadingSpinner } from '@/components/ui/loading';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export default function ConnectRepositoryPage() {
  const { setHeader } = useNavigationHeader();
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
