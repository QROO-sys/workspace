module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testRegex: '.*\.(test|spec)\.(ts|tsx)$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
