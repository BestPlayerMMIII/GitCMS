'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Github, Settings, FileText, Image, Archive, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigationHeader } from '@/contexts/navigation-context';

export type NavigationItem =
  | 'dashboard'
  | 'repositories'
  | 'schemas'
  | 'collections'
  | 'content'
  | 'media';
interface NavigationEntry {
  id: NavigationItem;
  name: string;
  href: string;
  icon: LucideIcon;
  header?: ReactNode;
}
const navigation: NavigationEntry[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
  { id: 'repositories', name: 'Repositories', href: '/repositories/connect', icon: Github },
  { id: 'schemas', name: 'Schemas', href: '/schemas', icon: Settings },
  { id: 'collections', name: 'Collections', href: '/collections', icon: Archive },
  { id: 'content', name: 'Content', href: '/content', icon: FileText },
  { id: 'media', name: 'Media', href: '/media', icon: Image },
];

interface NavigationProps {
  repositoryInfo?: { owner: string; repo: string };
}

export function Navigation({ repositoryInfo }: NavigationProps = {}) {
  const pathname = usePathname();

  const { headers } = useNavigationHeader();
  const activeId = navigation.find(item =>
    item.href === '/' ? pathname === item.href : pathname.startsWith(item.href)
  )?.id;
  const activeSubheader = activeId ? headers[activeId] : null;

  return (
    <div className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Main Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  GitCMS
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map(item => {
                  const isActive =
                    pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Repository Info */}
            {repositoryInfo && (
              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                <div className="ml-4 hidden sm:block">
                  <span className="text-sm text-gray-500">
                    {repositoryInfo.owner}/{repositoryInfo.repo}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map(item => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
            {repositoryInfo && (
              <div className="px-3 py-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Repository: {repositoryInfo.owner}/{repositoryInfo.repo}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Additional Sub Header */}
      {activeSubheader}
    </div>
  );
}
