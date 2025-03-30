import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

// Mock supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

// Test component that uses auth context
const TestComponent = () => {
  const { user, isLoading, signIn } = useAuth();
  
  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user-state">{user ? 'Authenticated' : 'Not Authenticated'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('provides authentication state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially should be loading
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    
    // After loading, should show not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('user-state')).toHaveTextContent('Not Authenticated');
    });
  });
  
  it('handles sign in', async () => {
    // Mock successful sign in
    const mockUser = { id: '123', email: 'test@example.com' };
    const supabase = require('@/lib/supabase/client').supabase;
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null,
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    });
    
    // Click sign in button
    const user = userEvent.setup();
    await user.click(screen.getByText('Sign In'));
    
    // Verify sign in was called
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });
  
  // Add more tests for other auth functions as needed
});
