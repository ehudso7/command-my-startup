import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { code } = body;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }
    
    // Find the referral code
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    
    if (referralError) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      );
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is trying to use their own code
    if (referral.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      );
    }
    
    // Check if user has already used this code
    const { data: existingUse, error: existingError } = await supabase
      .from('referral_uses')
      .select('*')
      .eq('referral_id', referral.id)
      .eq('user_id', user.id)
      .single();
    
    if (existingUse) {
      return NextResponse.json(
        { error: 'You have already used this referral code' },
        { status: 400 }
      );
    }
    
    // Apply the referral
    const { data: referralUse, error: useError } = await supabase
      .from('referral_uses')
      .insert({
        referral_id: referral.id,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (useError) {
      return NextResponse.json(
        { error: useError.message },
        { status: 500 }
      );
    }
    
    // Update the referral count
    const { error: updateError } = await supabase
      .from('referrals')
      .update({ uses: referral.uses + 1 })
      .eq('id', referral.id);
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }
    
    // Apply credits or benefits to both users
    // This would depend on your specific implementation
    
    return NextResponse.json({
      success: true,
      message: 'Referral code applied successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to apply referral code' },
      { status: 500 }
    );
  }
}
