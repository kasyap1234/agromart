'use client';

import '@/styles/diagnostic.css';

export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">CSS Test Page</h1>

        <div className="space-y-8">
          {/* Basic Tailwind Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Basic Tailwind CSS Test</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-500 text-white p-4 rounded">Red</div>
              <div className="bg-blue-500 text-white p-4 rounded">Blue</div>
              <div className="bg-green-500 text-white p-4 rounded">Green</div>
              <div className="bg-yellow-500 text-black p-4 rounded">Yellow</div>
            </div>
          </div>

          {/* Typography Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Typography Test</h2>
            <p className="text-base mb-2">Normal text</p>
            <p className="text-lg mb-2">Large text</p>
            <p className="text-xl mb-2">Extra large text</p>
            <p className="font-bold mb-2">Bold text</p>
            <p className="font-semibold mb-2">Semibold text</p>
          </div>

          {/* Flexbox Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Flexbox Test</h2>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-purple-500 text-white p-4 rounded">Item 1</div>
              <div className="bg-pink-500 text-white p-4 rounded">Item 2</div>
              <div className="bg-indigo-500 text-white p-4 rounded">Item 3</div>
            </div>
          </div>

          {/* CSS Variables Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">CSS Variables Test</h2>
            <div className="space-y-4">
              <div className="bg-primary text-primary-foreground p-4 rounded">
                Primary color
              </div>
              <div className="bg-secondary text-secondary-foreground p-4 rounded">
                Secondary color
              </div>
              <div className="bg-muted text-muted-foreground p-4 rounded">
                Muted color
              </div>
              <div className="bg-destructive text-destructive-foreground p-4 rounded">
                Destructive color
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Debug Information</h2>
            <div className="text-sm space-y-1">
              <p><strong>Window:</strong> {typeof window !== 'undefined' ? 'Available' : 'Not available'}</p>
              <p><strong>Document:</strong> {typeof document !== 'undefined' ? 'Available' : 'Not available'}</p>
              <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
              <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}