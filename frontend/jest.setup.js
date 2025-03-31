import "@testing-library/jest-dom";

// Mock global window object for browser globals
global.window = Object.create(window);
Object.defineProperty(window, 'SpeechRecognition', {
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    abort: jest.fn(),
  })),
  writable: true,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    abort: jest.fn(),
  })),
  writable: true,
});

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);
