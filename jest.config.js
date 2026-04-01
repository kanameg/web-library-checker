module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'extension/api/calil.js',
    'extension/background/service_worker.js',
    'extension/content/content_script.js',
    'extension/popup/popup.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html'],
  testTimeout: 10000,
};
