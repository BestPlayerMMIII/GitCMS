'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetupWizard } from '@/components/setup-wizard';
import { PageSubHeader } from '@/components/page-header';
import { useNavigationHeader } from '@/contexts/navigation-context';
import Suspenser from '@/components/suspenser';
import { PageLoading } from '@/components/ui/loading';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

function Setup() {
  const { setHeader } = useNavigationHeader();
  useEffect(() => {
    setHeader(
      'repositories',
      <PageSubHeader title="Setup Repository" backName="Back" onBack="/repositories/connect" />
    );
    return () => setHeader('repositories', null);
  }, [setHeader]);

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
    return <PageLoading message="" options={{ size: 'xl', color: 'gray' }} />;
  }

  if (!repository) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
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
    <div className="bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <SetupWizard repository={repository} />
      </main>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspenser>
      <Setup />
    </Suspenser>
  );
}
