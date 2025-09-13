export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-6">
          Welcome to GitCMS Admin
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Universal GitHub-Based Content Management System
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Connect Repository</h3>
            <p className="text-gray-600">
              Connect your GitHub repository to start managing content
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Create Content</h3>
            <p className="text-gray-600">
              Use our visual editor to create and manage your content
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Deploy</h3>
            <p className="text-gray-600">
              Your content is automatically versioned and deployed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}