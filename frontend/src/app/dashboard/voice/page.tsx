'use client';

import { useState } from 'react';
import VoiceCommand from '@/components/commands/VoiceCommand';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function VoiceCommandPage() {
  const [commandHistory, setCommandHistory] = useState<Array<{
    transcript: string;
    result: string;
    timestamp: Date;
  }>>([]);
  
  const handleCommandProcessed = (result: { content: string }, transcript: string) => {
    // Add to command history
    setCommandHistory(prev => [
      {
        transcript,
        result: result.content,
        timestamp: new Date(),
      },
      ...prev
    ]);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Voice Commands</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Speak Your Command</CardTitle>
            </CardHeader>
            <CardContent>
              <VoiceCommand 
                onCommandProcessed={(result) => handleCommandProcessed(result, '')}
              />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Command History</CardTitle>
            </CardHeader>
            <CardContent>
              {commandHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No commands yet. Try speaking a command!
                </p>
              ) : (
                <ul className="space-y-4">
                  {commandHistory.map((command, index) => (
                    <li key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        "{command.transcript}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {command.timestamp.toLocaleTimeString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
