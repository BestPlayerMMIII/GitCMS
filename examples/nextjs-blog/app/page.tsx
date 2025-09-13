import { GitCMS } from '@gitcms/client';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">GitCMS Blog Example</h1>
      <p className="text-gray-600">This is a placeholder for the GitCMS Next.js blog example.</p>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Coming Soon:</h2>
        <ul className="space-y-2">
          <li>• Blog post listing</li>
          <li>• Dynamic blog post pages</li>
          <li>• GitCMS integration</li>
          <li>• Markdown rendering</li>
        </ul>
      </div>
    </main>
  );
}
