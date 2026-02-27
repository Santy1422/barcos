// Jest setup file
import 'reflect-metadata';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
// console.log = jest.fn();
// console.error = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
