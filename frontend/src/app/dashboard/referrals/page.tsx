'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import ReferralForm from '@/components/referrals/ReferralForm';
import ReferralList from '@/components/referrals/ReferralList';

export default function ReferralsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  
  // Fetch referral data
  useEffect(() => {
    if (!user) return;
    
    async function fetchData() {
      try {
        // Fetch referral code
        const codeResponse = await fetch('/api/referrals/code');
        if (codeResponse.ok) {
          const codeData = await codeResponse.json();
          setReferralCode(codeData.code);
        }
        
        // Fetch referrals
        const referralsResponse = await fetch('/api/referrals');
        if (referralsResponse.ok) {
          const data = await referralsResponse.json();
          setReferrals(data.referrals || []);
          setTotalEarnings(data.totalEarnings || 0);
        }
      } catch (error) {
        console.error('Error fetching referral data:', error);
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load referral data',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user, showToast]);
  
  // Handle new referral creation
  const handleCreateReferral = async (email: string, notes?: string) => {
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, notes }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create referral');
      }
      
      const data = await response.json();
      
      // Add the new referral to the list
      setReferrals([data.referral, ...referrals]);
      
      showToast({
        type: 'success',
        title: 'Referral Created',
        message: `Invitation sent to ${email}`,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error creating referral:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create referral',
      });
      return false;
    }
  };
  
  // Create a shareable referral link
  const getReferralLink = () => {
    return `${window.location.origin}/?ref=${referralCode}`;
  };
  
  // Copy referral link to clipboard
  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    
    showToast({
      type: 'success',
      title: 'Copied',
      message: 'Referral link copied to clipboard',
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Referral Program</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Earnings Card */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Your Earnings</h2>
            <p className="text-3xl font-bold text-primary">${totalEarnings.toFixed(2)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total referral earnings
            </p>
          </CardContent>
        </Card>
        
        {/* Referrals Count Card */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Referrals</h2>
            <p className="text-3xl font-bold text-primary">{referrals.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              People you've referred
            </p>
          </CardContent>
        </Card>
        
        {/* Commission Rate Card */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Commission</h2>
            <p className="text-3xl font-bold text-primary">30%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Of subscription payments
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Share this link with friends and earn 30% commission on their subscription payments.
            </p>
            
            <div className="flex items-center">
              <input
                type="text"
                value={getReferralLink()}
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-md px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-primary-dark"
              >
                Copy
              </button>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Invite by Email</h3>
              <ReferralForm onSubmit={handleCreateReferral} />
            </div>
          </CardContent>
        </Card>
        
        {/* Referral List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400">
                  You haven't made any referrals yet.
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Share your referral link to start earning!
                </p>
              </div>
            ) : (
              <ReferralList referrals={referrals} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
