// Mock for next/navigation
export function useRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn()
  };
}

export function usePathname() {
  return "/mock-path";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useServerInsertedHTML() {
  return jest.fn();
}

export function notFound() {
  return jest.fn();
}