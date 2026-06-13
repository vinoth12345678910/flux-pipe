import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@fluxpipe/redis$': '<rootDir>/packages/redis/src/index.ts',
    '^@fluxpipe/rabbitmq$': '<rootDir>/packages/rabbitmq/src/index.ts',
    '^@fluxpipe/database$': '<rootDir>/packages/database/src/index.ts',
    '^@fluxpipe/logger$': '<rootDir>/packages/logger/src/index.ts',
    '^@fluxpipe/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@fluxpipe/shared-config$': '<rootDir>/packages/shared-config/src/index.ts',
    '^@fluxpipe/shared-types$': '<rootDir>/packages/shared-types/src/index.ts',
    '^@fluxpipe/shared-utils$': '<rootDir>/packages/shared-utils/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.base.json' }],
  },
};

export default config;
