import '@/styles/diagnostic.css';

export default function DiagnosticPage() {
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
      </div>
    </div>
  );
}