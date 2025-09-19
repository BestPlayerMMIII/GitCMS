'use client';

import { Navigation } from '@/components/navigation';
import { useRepository } from '@/contexts/repository-context';
import React from 'react';

export function NavigationWrapper() {
  const { repositoryInfo } = useRepository();

  return <Navigation repositoryInfo={repositoryInfo || undefined} />;
}
