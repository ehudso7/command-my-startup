'use client';

interface Referral {
  id: string;
  referred_email: string;
  status: 'pending' | 'registered' | 'subscribed' | 'expired';
  amount: number | null;
  created_at: string;
  converted_at: string | null;
}

interface ReferralListProps {
  referrals: Referral[];
}

export default function ReferralList({ referrals }: ReferralListProps) {
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
          </span>
        );
      case 'registered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Registered
          </span>
        );
      case 'subscribed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Subscribed
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            {status}
          </span>
        );
    }
  };
  
  return (
    <div className="overflow-hidden">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {referrals.map(referral => (
          <li key={referral.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {referral.referred_email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Referred on {formatDate(referral.created_at)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(referral.status)}
                
                {referral.amount && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    ${referral.amount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
