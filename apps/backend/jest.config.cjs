/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testRegex: "src/.*\\.spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  // The generated prisma client (moduleFormat cjs) imports its internal
  // modules with .js specifiers; map them to the generated .ts sources.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
};
