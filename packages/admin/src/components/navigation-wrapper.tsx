'use client';

import { Navigation } from '@/components/navigation';
import { useRepository } from '@/contexts/repository-context';

export function NavigationWrapper() {
  const { repositoryInfo } = useRepository();

  return <Navigation repositoryInfo={repositoryInfo || undefined} />;
}
