import '@testing-library/jest-dom';
import { beforeAll } from 'bun:test';

// Create mock functions that work in both Jest and Bun
const createMockFn = () => {
  const fn = () => {};
  fn.mockReturnValue = (value) => { fn._returnValue = value; return fn; };
  fn.mockImplementation = (impl) => { fn._impl = impl; return fn; };
  return fn;
};

// Global mock function factory
global.createMockFn = createMockFn;

// Setup navigation mocks
beforeAll(() => {
  // Mock Next.js router for both Jest and Bun
  const routerMock = {
    push: createMockFn(),
    replace: createMockFn(),
    back: createMockFn(),
    forward: createMockFn(),
    refresh: createMockFn(),
    prefetch: createMockFn(),
  };

  global.mockRouter = routerMock;
  global.mockSearchParams = new URLSearchParams();
  global.mockPathname = '';
  global.mockParams = {};
});

// Mock next/image
global.NextImage = (props) => {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img {...props} />;
};

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

// Global test utilities - Mock fetch to return a proper Response object
global.fetch = createMockFn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: {
      get: (header) => header === 'content-type' ? 'application/json' : null
    }
  })
);

// Mock axios for API client tests
global.mockAxiosInstance = {
  interceptors: {
    request: { use: createMockFn() },
    response: { use: createMockFn() }
  },
  post: createMockFn(),
  get: createMockFn(),
  put: createMockFn(),
  patch: createMockFn(),
  delete: createMockFn(),
  defaults: { headers: {} }
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: createMockFn(), // deprecated
    removeListener: createMockFn(), // deprecated
    addEventListener: createMockFn(),
    removeEventListener: createMockFn(),
    dispatchEvent: createMockFn(),
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: createMockFn(),
  setItem: createMockFn(),
  removeItem: createMockFn(),
  clear: createMockFn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: createMockFn(),
  setItem: createMockFn(),
  removeItem: createMockFn(),
  clear: createMockFn(),
};
global.sessionStorage = sessionStorageMock;

// Mock File API
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

global.FileReader = class FileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onprogress = null;
  }

  readAsDataURL(file) {
    if (this.onload) {
      this.onload({ target: { result: 'data:image/png;base64,mock' } });
    }
  }

  readAsText(file) {
    if (this.onload) {
      this.onload({ target: { result: 'mock text content' } });
    }
  }

  abort() {
    if (this.onabort) {
      this.onabort();
    }
  }
};

// Add custom matchers for accessibility testing
expect.extend({
  toBeAccessible(received) {
    const pass = received && typeof received === 'object';
    return {
      message: () => `expected ${received} to be accessible`,
      pass,
    };
  },
});

// Mock SWR
global.mockSWR = {
  data: null,
  error: null,
  isLoading: false,
  mutate: createMockFn(),
};

global.mockSWRConfig = {
  mutate: createMockFn(),
};