module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./extension/__tests__/setup.js'],
  testMatch: ['**/extension/__tests__/**/*.test.js'],
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
