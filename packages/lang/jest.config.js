/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFiles: [],
  rootDir: "./src",
  passWithNoTests: true,
  verbose: true,
};
