// Jest Setup
import { jest } from '@jest/globals';

// Mock react-native-quick-crypto if necessary for simple UI tests
// Real crypto tests will run in specific environment
jest.mock('react-native-quick-crypto', () => ({
    randomBytes: jest.fn(),
    createCipheriv: jest.fn(),
    createDecipheriv: jest.fn(),
}));

// Mock LogBox to avoid noise
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
    ignoreLogs: jest.fn(),
}));
