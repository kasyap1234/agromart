// Diagnostic page to test register page layout issues
'use client';

import { useEffect, useState } from 'react';

interface LayoutInfo {
  screenWidth: number;
  isLargeScreen: boolean;
  gridClasses: string;
  computedStyles: {
    display: string;
    gridTemplateColumns: string;
    width: string;
    height: string;
  };
}

export default function RegisterDiagnosticPage() {
  const [layoutInfo, setLayoutInfo] = useState<LayoutInfo>({
    screenWidth: 0,
    isLargeScreen: false,
    gridClasses: '',
    computedStyles: {
      display: '',
      gridTemplateColumns: '',
      width: '',
      height: '',
    },
  });

  useEffect(() => {
    const updateLayoutInfo = () => {
      const screenWidth = window.innerWidth;
      const isLargeScreen = screenWidth >= 1024; // lg breakpoint

      // Test the grid container
      const testContainer = document.getElementById('test-grid-container');
      const computedStyles = testContainer ? window.getComputedStyle(testContainer) : {};

      setLayoutInfo({
        screenWidth,
        isLargeScreen,
        gridClasses: isLargeScreen ? 'lg:grid lg:grid-cols-2' : 'grid-cols-1',
        computedStyles: {
          display: (computedStyles as CSSStyleDeclaration).display || '',
          gridTemplateColumns: (computedStyles as CSSStyleDeclaration).gridTemplateColumns || '',
          width: (computedStyles as CSSStyleDeclaration).width || '',
          height: (computedStyles as CSSStyleDeclaration).height || '',
        },
      });

      console.log('Layout Diagnostic:', {
        screenWidth,
        isLargeScreen,
        computedStyles,
        tailwindVersion: '4.1.12',
        postcssPlugin: '@tailwindcss/postcss',
      });
    };

    updateLayoutInfo();
    window.addEventListener('resize', updateLayoutInfo);
    return () => window.removeEventListener('resize', updateLayoutInfo);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Register Page Layout Diagnostic</h1>

        {/* Layout Information */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Layout Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Screen Width:</strong> {layoutInfo.screenWidth}px</div>
            <div><strong>Is Large Screen:</strong> {layoutInfo.isLargeScreen ? 'Yes' : 'No'}</div>
            <div><strong>Grid Classes:</strong> {layoutInfo.gridClasses}</div>
            <div><strong>Computed Display:</strong> {layoutInfo.computedStyles.display}</div>
            <div><strong>Grid Template Columns:</strong> {layoutInfo.computedStyles.gridTemplateColumns}</div>
          </div>
        </div>

        {/* Test Grid Layout */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Grid Layout Test</h2>
          <div
            id="test-grid-container"
            className="min-h-screen lg:grid lg:grid-cols-2 border-2 border-red-500"
          >
            {/* Left side - Form */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
              <div className="mx-auto w-full max-w-sm lg:w-96">
                <h2 className="text-3xl font-bold">Test Form</h2>
                <p className="text-sm text-gray-600 mt-2">This is a test of the left column</p>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="hidden lg:flex bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
              <div className="flex items-center justify-center h-full w-full p-8">
                <div className="text-center max-w-lg relative z-10">
                  <h1 className="text-5xl font-bold mb-3 text-white">Test Content</h1>
                  <p className="text-white/80 text-xl font-medium">Right side content test</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Variables Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">CSS Variables Test</h2>
          <div className="space-y-4">
            <div className="bg-primary text-primary-foreground p-4 rounded">
              Primary color test
            </div>
            <div className="bg-blue-600 text-white p-4 rounded">
              Direct blue color test
            </div>
          </div>
        </div>

        {/* Tailwind Utilities Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Tailwind Utilities Test</h2>
          <div className="space-y-4">
            <div className="lg:grid lg:grid-cols-2 gap-4">
              <div className="bg-green-500 text-white p-4 rounded">Column 1</div>
              <div className="bg-yellow-500 text-black p-4 rounded">Column 2</div>
            </div>
            <div className="hidden lg:flex bg-purple-500 text-white p-4 rounded">
              Hidden on mobile, flex on large screens
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}