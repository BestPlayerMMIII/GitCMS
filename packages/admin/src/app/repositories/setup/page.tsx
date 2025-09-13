'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetupWizard } from '@/components/setup-wizard';
import { ArrowLeft } from 'lucide-react';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export default function SetupPage() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get repository from URL params or localStorage
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (owner && repo) {
      // Create repository object from URL params
      setRepository({
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        private: false, // We'll detect this later
        defaultBranch: 'main',
      });
      setLoading(false);
    } else {
      // Try to get from localStorage (from repository selection)
      const stored = localStorage.getItem('gitcms-selected-repo');
      if (stored) {
        try {
          const repoData = JSON.parse(stored);
          setRepository(repoData);
          // Don't remove immediately - let the wizard handle cleanup
          setLoading(false);
        } catch (error) {
          console.error('Failed to parse repository data:', error);
          router.push('/repositories/connect');
        }
      } else {
        // No repository specified, redirect to connection page
        router.push('/repositories/connect');
      }
    }
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No repository selected</p>
          <button
            onClick={() => router.push('/repositories/connect')}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Select Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between py-4">
            <button
              onClick={() => router.push('/repositories/connect')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Repository Selection</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Setup Repository</h1>
            <div></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <SetupWizard repository={repository} />
      </main>
    </div>
  );
}
