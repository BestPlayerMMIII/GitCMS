'use client';

import { MediaLibrary } from '@/components/media/media-library';
import { useSearchParams } from 'next/navigation';
import { useRepository } from '@/contexts/repository-context';
import { PageSubHeader } from '@/components/page-header';
import Link from 'next/link';
import { useEffect } from 'react';
import { useNavigationHeader } from '@/contexts/navigation-context';
import Suspenser from '@/components/suspenser';

function Media() {
  const { setHeader } = useNavigationHeader();
  useEffect(() => {
    setHeader(
      'media',
      <PageSubHeader title="Media Library" backName="Back to Dashboard" onBack="/" />
    );
    return () => setHeader('media', null);
  }, [setHeader]);

  const searchParams = useSearchParams();
  const { repositoryInfo, setRepositoryInfo } = useRepository();

  // Update repository info from URL params if available
  useEffect(() => {
    const urlOwner = searchParams.get('owner');
    const urlRepo = searchParams.get('repo');

    if (
      urlOwner &&
      urlRepo &&
      (!repositoryInfo || repositoryInfo.owner !== urlOwner || repositoryInfo.repo !== urlRepo)
    ) {
      setRepositoryInfo({ owner: urlOwner, repo: urlRepo });
    }
  }, [searchParams, repositoryInfo, setRepositoryInfo]);

  if (!repositoryInfo) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Media Library</h1>
          <p className="text-gray-600 mb-4">Connect a repository to manage your media files.</p>
          <Link
            href="/repositories/connect"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Connect Repository
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <MediaLibrary owner={repositoryInfo.owner} repo={repositoryInfo.repo} mode="library" />
    </div>
  );
}

export default function MediaPage() {
  return (
    <Suspenser>
      <Media />
    </Suspenser>
  );
}
