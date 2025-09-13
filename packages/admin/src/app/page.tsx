'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, Github, Settings, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default function HomePage() {
  const { data: session, status } = useSession();

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
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="GitCMS Admin"
        size="large"
        className="shadow"
        rightElement={
          session?.user ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={session.user.image || ''}
                  alt={session.user.name || 'User'}
                />
                <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          ) : null
        }
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome to GitCMS</h2>
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
                    <h3 className="text-lg font-medium text-gray-900">Manage Content</h3>
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
                <div className="mt-4">
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                  >
                    Phase 4 - Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {session && (
            <div className="mt-12 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">GitHub Connection Status</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Connected as {session.user?.name} ({session.user?.email})
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your GitHub account is successfully connected. You can now access your
                  repositories.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
