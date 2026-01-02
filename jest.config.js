module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  
  // Test isolation and reliability
  maxWorkers: process.env.CI ? 2 : '50%', // Limit parallelism in CI
  testTimeout: 10000, // 10 second timeout
  
  // Cleanup
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // CI/CD optimizations
  bail: process.env.CI ? 1 : 0, // Stop on first failure in CI
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: false, // Disable for now (can slow down tests)
}; 