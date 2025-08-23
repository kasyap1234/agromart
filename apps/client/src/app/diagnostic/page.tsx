'use client';

import '@/styles/diagnostic.css';

export default function DiagnosticPage() {
  // Simple CSS test without authentication
  const testCSS = () => {
    const div = document.createElement('div');
    div.className = 'bg-red-500 text-white p-4 rounded';
    div.textContent = 'CSS Test Element';
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 2000);
  };

  return (
    <div className="test-utilities">
      <div className="test-diagnostic">
        <h1 className="text-2xl font-bold mb-4">Tailwind CSS Diagnostic</h1>
        <p className="mb-4">If you see this styled properly, PostCSS is working!</p>
        <div className="bg-blue-500 text-white p-4 rounded-lg">
          This should be blue with white text
        </div>
        <div className="mt-4 p-4 border border-gray-300 rounded">
          <p className="text-sm text-gray-600">
            Current time: {new Date().toISOString()}
          </p>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">CSS Variable Test:</h2>
          <div className="bg-primary text-primary-foreground p-4 rounded">
            Primary color test
          </div>
          <div className="bg-secondary text-secondary-foreground p-4 rounded mt-2">
            Secondary color test
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Flexbox Test:</h2>
          <div className="flex gap-4">
            <div className="bg-red-500 p-4 text-white">Red</div>
            <div className="bg-green-500 p-4 text-white">Green</div>
            <div className="bg-blue-500 p-4 text-white">Blue</div>
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Grid Test:</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-500 p-4 text-black">Yellow</div>
            <div className="bg-purple-500 p-4 text-white">Purple</div>
            <div className="bg-pink-500 p-4 text-white">Pink</div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={testCSS}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded"
          >
            Test CSS Injection
          </button>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
          <div className="text-sm text-gray-600">
            <p>Window loaded: {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
            <p>Document ready: {typeof document !== 'undefined' ? 'Yes' : 'No'}</p>
            <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p>Timestamp: {new Date().toISOString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}