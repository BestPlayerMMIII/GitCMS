'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Github, Settings, FileText } from 'lucide-react';
import { useNavigationHeader } from '@/contexts/navigation-context';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const { setHeader } = useNavigationHeader();

  const createHeader = () => {
    if (!session?.user) return <></>;
    else
      return (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  className="h-10 w-10 rounded-full"
                  src={session.user.image || ''}
                  alt={session.user.name || 'User'}
                />
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Welcome back, {session.user.name}
                  </h2>
                  <p className="text-sm text-gray-500">Connected as {session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md border border-gray-300 hover:border-gray-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      );
  };
  useEffect(() => {
    setHeader('dashboard', createHeader());
    return () => setHeader('dashboard', null);
  }, [setHeader, session?.user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-extrabold text-gray-900">GitCMS Dashboard</h1>
            <p className="mt-4 text-lg text-gray-600">
              Universal GitHub-Based Content Management System
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <Github className="h-8 w-8 text-gray-400" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Connect Repository</h3>
                    <p className="text-sm text-gray-500">
                      Connect your GitHub repository to start managing content
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href="/repositories/connect"
                    className="block w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-center"
                  >
                    Choose Repository
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-gray-400" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Manage Schemas</h3>
                    <p className="text-sm text-gray-500">
                      Define content schemas and manage your content types
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href="/schemas"
                    className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    Manage Schemas
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Create Content</h3>
                    <p className="text-sm text-gray-500">
                      Write and edit content using your defined schemas
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <a
                    href="/content"
                    className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center"
                  >
                    Manage Content
                  </a>
                  <a
                    href="/demo/rich-editor"
                    className="block w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors text-center text-sm"
                  >
                    Try Rich Editor Demo
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/content/edit"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">New Content</p>
                    <p className="text-sm text-gray-500">Create new content</p>
                  </div>
                </div>
              </a>

              <a
                href="/schemas"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">New Schema</p>
                    <p className="text-sm text-gray-500">Define content type</p>
                  </div>
                </div>
              </a>

              <a
                href="/repositories/connect"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Github className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Connect Repo</p>
                    <p className="text-sm text-gray-500">Add repository</p>
                  </div>
                </div>
              </a>

              <a
                href="/demo/rich-editor"
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Editor Demo</p>
                    <p className="text-sm text-gray-500">Try rich text editor</p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Enhanced Features Section */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enhanced Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Smart Media Upload */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Smart Media Upload</h4>
                    <p className="text-sm text-gray-600">
                      Network-aware upload progress simulation
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-gray-700 space-y-1 mb-4">
                  <li>• Real-time connection speed detection</li>
                  <li>• Intelligent progress simulation</li>
                  <li>• Automatic LFS recommendations</li>
                  <li>• Enhanced upload experience</li>
                </ul>
                <div className="flex items-center space-x-2 text-xs text-blue-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active in media uploads</span>
                </div>
              </div>

              {/* Git LFS Management */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-amber-500 p-2 rounded-lg">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Git LFS Management</h4>
                    <p className="text-sm text-gray-600">Automatic large file tracking</p>
                  </div>
                </div>
                <ul className="text-sm text-gray-700 space-y-1 mb-4">
                  <li>• Auto-detect large files (&gt;50MB)</li>
                  <li>• Smart extension-based rules</li>
                  <li>• .gitattributes management</li>
                  <li>• Repository optimization</li>
                </ul>
                <div className="flex items-center space-x-2 text-xs text-amber-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready for configuration</span>
                </div>
              </div>

              {/* Smart Media Manager */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-green-500 p-2 rounded-lg">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Smart Media Manager</h4>
                    <p className="text-sm text-gray-600">Unified media management interface</p>
                  </div>
                </div>
                <ul className="text-sm text-gray-700 space-y-1 mb-4">
                  <li>• Integrated upload & library views</li>
                  <li>• Network-aware progress tracking</li>
                  <li>• Consolidated media operations</li>
                  <li>• Enhanced user experience</li>
                </ul>
                <div className="flex items-center space-x-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Available in media components</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
