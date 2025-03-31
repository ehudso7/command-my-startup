// Global type declarations

// For Speech Recognition API
interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

// For Jest testing library extensions
import '@testing-library/jest-dom';

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
  toHaveTextContent(text: string): R;
  toHaveClass(className: string): R;
  toBeDisabled(): R;
  toHaveBeenCalledTimes(number: number): R;
  toHaveBeenCalledWith(...args: any[]): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

// For Stripe API version
declare module 'stripe' {
  interface StripeConstructorOptions {
    apiVersion: '2022-11-15' | '2025-02-24.acacia' | '2024-03-30';
  }
  
  interface SubscriptionsResource {
    del(id: string, options?: any): Promise<Stripe.Response<Stripe.Subscription>>;
  }
}

// For Cypress commands
declare namespace Cypress {
  interface Chainable<Subject> {
    login(email: string, password: string): Chainable<void>;
  }
}