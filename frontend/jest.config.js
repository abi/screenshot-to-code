export default {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testTimeout: 30000,
};
