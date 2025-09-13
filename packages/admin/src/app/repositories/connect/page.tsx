'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RepositoryPicker } from '@/components/repository-picker';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export default function ConnectRepositoryPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Connect Repository</h1>
            <div></div>
          </div>
        </div>
      </header>

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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        <span>{connecting ? 'Connecting...' : 'Setup Repository'}</span>
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
