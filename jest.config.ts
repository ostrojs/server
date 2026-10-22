import { execSync } from "child_process";
import path from "path";
import fs from "fs";

let tsJestPath = "ts-jest";
try {
    tsJestPath = require.resolve("ts-jest");
} catch {
    try {
        const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
        const candidate = path.join(globalRoot, "ts-jest");
        if (fs.existsSync(candidate)) {
            tsJestPath = candidate;
        }
    } catch {}
}

export default {
    "testEnvironment": "node",
    "moduleDirectories": [
        "node_modules",
        "../foundation/node_modules"
    ],
    "moduleNameMapper": {
        "^@ostro/server/(.*)$": "<rootDir>/src/$1",
        "^@ostro/server$": "<rootDir>/src/server",
    },
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
        "src/**/*.ts",
        "src/serverless/wrappers/**/*.js",
        "!**/node_modules/**",
        "!**/vendor/**",
        "!**/coverage/**",
        "!**/build/**",
        "!jest.config.js",
        "!test/**"
    ],
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/build/"
    ],
    "coverageThreshold": {
        "global": {
            "branches": 100,
            "functions": 100,
            "lines": 100,
            "statements": 100
        }
    },
    "testMatch": [
        "**/test/**/*.test.ts",
        "**/test/**/*.test.js"
    ],
    "transform": {
        "^.+\\.ts$": [
            tsJestPath,
            {
                "tsconfig": "<rootDir>/tsconfig.json"
            }
        ]
    }
};
