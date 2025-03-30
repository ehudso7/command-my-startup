describe('Login Flow', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/auth/login');
  });

  it('displays login form', () => {
    // Check if the login form elements are present
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').contains('Log in');
  });

  it('shows error with invalid credentials', () => {
    // Try to log in with invalid credentials
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Check for error message
    cy.contains('Invalid login credentials').should('be.visible');
  });

  it('navigates to registration page', () => {
    // Click on the sign-up link
    cy.contains('Sign up').click();
    
    // Check that we're on the registration page
    cy.url().should('include', '/auth/signup');
    cy.contains('Sign Up for Command My Startup').should('be.visible');
  });

  it('successfully logs in and redirects to dashboard', () => {
    // Note: This requires a seeded test user in your dev/test environment
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('testpassword');
    cy.get('button[type="submit"]').click();
    
    // Check for redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
  });
});
