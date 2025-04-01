'use client';

import { useState, useEffect } from 'react';

export default function TestBuildPage() {
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    react: false,
    next: false,
    tailwind: false
  });
  
  useEffect(() => {
    // This just confirms that client-side code is running
    setModuleStatus({
      react: true,
      next: true,
      tailwind: true
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Build Test Page</h1>
        <p className="text-gray-600 mb-4">
          If you can see this page, the build process is working correctly.
        </p>
        
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold mb-2">Module Status:</h2>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${moduleStatus.react ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>React {moduleStatus.react ? '✓' : '✗'}</span>
            </li>
            <li className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${moduleStatus.next ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Next.js {moduleStatus.next ? '✓' : '✗'}</span>
            </li>
            <li className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${moduleStatus.tailwind ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Tailwind CSS {moduleStatus.tailwind ? '✓' : '✗'}</span>
            </li>
          </ul>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-gray-500">
            Build time: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  );
}