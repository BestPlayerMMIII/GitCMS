'use client';

import { MediaLibrary } from '@/components/media/media-library';
import { useSearchParams } from 'next/navigation';
import { useRepository } from '@/contexts/repository-context';
import { PageSubHeader } from '@/components/page-header';
import Link from 'next/link';
import { useEffect } from 'react';
import { useNavigationHeader } from '@/contexts/navigation-context';
import Suspenser from '@/components/suspenser';
import { NoRepoConnected } from '@/components/no-repo-connected';

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
      <NoRepoConnected
        title="Media Library"
        description="Connect a repository to manage your media files."
      />
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
