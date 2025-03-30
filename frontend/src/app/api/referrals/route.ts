import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// GET referrals for current user
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get referrals
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Calculate total earnings
    const totalEarnings = referrals?.reduce((sum, referral) => sum + (referral.amount || 0), 0) || 0;
    
    return NextResponse.json({ 
      referrals, 
      totalEarnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get referrals' },
      { status: 500 }
    );
  }
}

// Create a new referral
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { email, notes } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if email is already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', user.id)
      .eq('referred_email', email)
      .single();
    
    if (existingReferral) {
      return NextResponse.json(
        { error: 'You have already referred this person' },
        { status: 400 }
      );
    }
    
    // Create referral
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        id: uuidv4(),
        referrer_id: user.id,
        referred_email: email,
        status: 'pending',
        metadata: notes ? { notes } : {},
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ referral });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create referral' },
      { status: 500 }
    );
  }
}
