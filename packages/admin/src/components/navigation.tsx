'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Github, Settings, FileText, Users } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Repositories', href: '/repositories/connect', icon: Github },
  { name: 'Schemas', href: '/schemas', icon: Settings },
  { name: 'Content', href: '/content', icon: FileText },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
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

          {/* Quick Action Buttons */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <Link
              href="/content/edit"
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              onClick={e => {
                // Check if we have a connected repository and include it in the URL
                const connectedRepo = localStorage.getItem('gitcms-connected-repo');
                if (connectedRepo) {
                  try {
                    const repoData = JSON.parse(connectedRepo);
                    const params = new URLSearchParams({
                      owner: repoData.owner,
                      repo: repoData.name,
                      schemaId: 'blog-post', // Default schema
                    });
                    e.preventDefault();
                    window.location.href = `/content/edit?${params}`;
                  } catch (error) {
                    // Fall back to default behavior
                  }
                }
              }}
            >
              New Content
            </Link>
            <Link
              href="/demo/rich-editor"
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Try Editor
            </Link>
          </div>
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
          <div className="border-t border-gray-200 pt-3 pb-3">
            <Link
              href="/content/edit"
              className="block mx-3 mb-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center"
              onClick={e => {
                // Check if we have a connected repository and include it in the URL
                const connectedRepo = localStorage.getItem('gitcms-connected-repo');
                if (connectedRepo) {
                  try {
                    const repoData = JSON.parse(connectedRepo);
                    const params = new URLSearchParams({
                      owner: repoData.owner,
                      repo: repoData.name,
                      schemaId: 'blog-post', // Default schema
                    });
                    e.preventDefault();
                    window.location.href = `/content/edit?${params}`;
                  } catch (error) {
                    // Fall back to default behavior
                  }
                }
              }}
            >
              New Content
            </Link>
            <Link
              href="/demo/rich-editor"
              className="block mx-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center"
            >
              Try Editor
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
