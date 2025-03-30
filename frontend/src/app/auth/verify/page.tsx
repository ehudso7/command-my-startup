'use client';

import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-6 py-8 bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Verify Your Email
        </h1>
        
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded">
          <p className="text-center">
            We've sent a verification email to your inbox. Please click the link in the email to verify your account.
          </p>
        </div>
        
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Didn't receive an email? Check your spam folder or try again.
          </p>
          
          <div>
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
