import { beforeAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

// Setup JSDOM for browser environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Set globals for browser environment
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Text = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;

// Global test setup
beforeAll(() => {
  // Mock global APIs that might not be available in test environment
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // Mock localStorage and sessionStorage
  const localStorageMock = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
  
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Mock File APIs
  global.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.size = chunks.length;
      this.type = options.type || '';
      this.lastModified = Date.now();
    }
  };

  global.FileReader = class FileReader {
    constructor() {
      this.readyState = 0;
      this.result = null;
      this.error = null;
    }
    
    readAsDataURL() {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'data:image/png;base64,test';
        this.onload?.({ target: this });
      }, 0);
    }
    
    readAsText() {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'test content';
        this.onload?.({ target: this });
      }, 0);
    }
  };
});

// Global cleanup after each test
afterEach(() => {
  // Reset any global state that might have been modified during tests
  localStorage.clear();
  sessionStorage.clear();
});