// Chrome Extension API global mock
// This runs before each test file.

global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    lastError: null,
    openOptionsPage: jest.fn(),
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};
