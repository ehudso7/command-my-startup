'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [commandInput, setCommandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null);
  
  // Recent projects (in a real app, you'd fetch these from the database)
  const recentProjects = [
    { id: '1', name: 'Landing Page', description: 'Website landing page for product launch', progress: 75 },
    { id: '2', name: 'Mobile App', description: 'iOS and Android app development', progress: 30 },
    { id: '3', name: 'Marketing Campaign', description: 'Social media marketing strategy', progress: 50 },
  ];
  
  // Recent commands (in a real app, you'd fetch these from the database)
  const recentCommands = [
    { id: '1', prompt: 'Create a landing page for my SaaS product', date: '2023-05-10' },
    { id: '2', prompt: 'Write a blog post about AI in startups', date: '2023-05-08' },
    { id: '3', prompt: 'Generate a marketing plan for Q2', date: '2023-05-05' },
  ];
  
  // Handle command submission
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commandInput.trim() || isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    setCommandResult(null);
    
    try {
      // In a real app, you'd send this to your API
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: commandInput,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process command');
      }
      
      const data = await response.json();
      setCommandResult(data.content);
      
      showToast({
        type: 'success',
        title: 'Command Executed',
        message: 'Your command was processed successfully',
      });
    } catch (error: any) {
      console.error('Command error:', error);
      
      showToast({
        type: 'error',
        title: 'Command Failed',
        message: error.message || 'An error occurred while processing your command',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user?.user_metadata?.full_name || 'Entrepreneur'}!</h1>
        <p className="text-gray-600 dark:text-gray-400">What would you like to build today?</p>
      </div>
      
      {/* Command Input */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Command Center</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCommandSubmit} className="space-y-4">
            <div>
              <label htmlFor="command" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enter a natural language command
              </label>
              <div className="flex">
                <input
                  id="command"
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="e.g., 'Create a landing page for my fintech startup'"
                  className="flex-1 rounded-l-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !commandInput.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Run'}
                </button>
              </div>
            </div>
            
            {commandResult && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Result:</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert">
                  <pre className="whitespace-pre-wrap">{commandResult}</pre>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      
      {/* Dashboard Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Link
              href="/projects"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">
                No projects yet. Create your first project!
              </p>
            ) : (
              <ul className="space-y-4">
                {recentProjects.map(project => (
                  <li key={project.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 p-4 rounded-md transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Commands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Commands</CardTitle>
            <Link
              href="/commands"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentCommands.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">
                No commands yet. Try running your first command!
              </p>
            ) : (
              <ul className="space-y-4">
                {recentCommands.map(command => (
                  <li key={command.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                    <Link
                      href={`/commands/${command.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 p-4 rounded-md transition-colors"
                    >
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          &quot;{command.prompt}&quot;
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(command.date).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
