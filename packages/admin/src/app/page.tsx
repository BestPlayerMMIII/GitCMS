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
        </div>
      </main>
    </div>
  );
}
