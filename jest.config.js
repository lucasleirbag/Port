module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-canvas-mock', '<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/unit/**/*.test.js'],
};
