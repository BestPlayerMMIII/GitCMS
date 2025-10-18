import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

export default function Suspenser({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Loading...</h2>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
