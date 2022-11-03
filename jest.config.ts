import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist', '/node_modules/'],
  coveragePathIgnorePatterns: ['dist', '/node_modules/'],
  clearMocks: true,
  setupFilesAfterEnv: ['./src/instances/singleton.ts'],
  moduleDirectories: ['node_modules', 'src'],
};
export default config;
