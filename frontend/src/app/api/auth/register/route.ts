import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();
    
    const supabase = createClient();
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    // Check for referral code cookie
    const cookieStore = cookies();
    const referralCode = cookieStore.get('referral_code')?.value;
    
    if (referralCode && authData.user) {
      // Look up the referrer by code
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer) {
        // Check if the referred email was already in the referrals table
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id, status')
          .eq('referrer_id', referrer.id)
          .eq('referred_email', email)
          .single();
        
        if (existingReferral) {
          // Update existing referral with the new user ID
          await supabase
            .from('referrals')
            .update({
              referred_user_id: authData.user.id,
              status: 'registered',
            })
            .eq('id', existingReferral.id);
        } else {
          // Create a new referral entry
          await supabase
            .from('referrals')
            .insert({
              referrer_id: referrer.id,
              referred_email: email,
              referred_user_id: authData.user.id,
              status: 'registered',
            });
        }
        
        // Store the referrer ID in the user's metadata
        await supabase.auth.updateUser({
          data: {
            referred_by: referrer.id
          }
        });
      }
    }
    
    return NextResponse.json({ 
      message: 'Registration successful. Please check your email for verification.',
      user: authData.user
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
