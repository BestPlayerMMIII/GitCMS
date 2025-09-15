'use client';

import { MediaLibrary } from '@/components/media/media-library';
import { useSearchParams } from 'next/navigation';

export default function MediaPage() {
  const searchParams = useSearchParams();
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Media Management</h1>
          <p className="text-gray-600 mb-4">Please select a repository to manage media files.</p>
          <a
            href="/repositories"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Choose Repository
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <MediaLibrary owner={owner} repo={repo} mode="library" />
    </div>
  );
}
