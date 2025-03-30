'use client';

import { useState } from 'react';

interface ReferralFormProps {
  onSubmit: (email: string, notes?: string) => Promise<boolean>;
}

export default function ReferralForm({ onSubmit }: ReferralFormProps) {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const success = await onSubmit(email, notes || undefined);
      
      if (success) {
        // Reset form on success
        setEmail('');
        setNotes('');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send referral');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Friend's Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={loading}
          required
        />
      </div>
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Personal Message (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a personal note to your invitation"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
          rows={3}
          disabled={loading}
        />
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  );
}
