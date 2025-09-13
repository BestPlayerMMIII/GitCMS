export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">GitCMS Documentation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <p className="text-gray-600 mb-4">Quick start guide to set up GitCMS</p>
          <ul className="text-sm text-gray-500">
            <li>• Installation</li>
            <li>• Initial setup</li>
            <li>• First content type</li>
          </ul>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Reference</h2>
          <p className="text-gray-600 mb-4">Complete API documentation</p>
          <ul className="text-sm text-gray-500">
            <li>• Client SDK</li>
            <li>• REST API</li>
            <li>• GraphQL</li>
          </ul>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Examples</h2>
          <p className="text-gray-600 mb-4">Sample implementations</p>
          <ul className="text-sm text-gray-500">
            <li>• Blog setup</li>
            <li>• Portfolio site</li>
            <li>• E-commerce</li>
          </ul>
        </div>
      </div>
    </div>
  )
}