import { describe, test, expect, jest } from "@jest/globals";
const childProcess = require("node:child_process");
const EventEmitter = require("node:events");
const path = require("node:path");
const fs = require("node:fs");

describe("ForkStrategy (serverless/strategies/forkStrategy.js)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js");

    test("runs handler in forked process successfully", async () => {
        const _ForkStrategy = require("../src/serverless/strategies/forkStrategy");
const ForkStrategy = _ForkStrategy.default || _ForkStrategy;
        const strategy = new ForkStrategy();
        const result = await strategy.run(fixturePath, "hello", { test: 1 }, process.cwd());
        expect(result).toEqual({ statusCode: 200, body: "ok" });
    });

    test("rejects when forked process returns error message", async () => {
        const _ForkStrategy = require("../src/serverless/strategies/forkStrategy");
const ForkStrategy = _ForkStrategy.default || _ForkStrategy;
        const strategy = new ForkStrategy();
        await expect(strategy.run(fixturePath, "missingHandler", {}, process.cwd())).rejects.toThrow();
    });

    test("rejects when forked process exits with non-zero exit code", async () => {
        const _ForkStrategy = require("../src/serverless/strategies/forkStrategy");
const ForkStrategy = _ForkStrategy.default || _ForkStrategy;
        const strategy = new ForkStrategy();
        const badFork = path.resolve(__dirname, "fixtures/badFork.js");
        fs.writeFileSync(badFork, "process.exit(4);");
        try {
            await expect(strategy.run(badFork, "hello", {}, process.cwd())).rejects.toThrow("Forked process exited with code 4");
        } finally {
            if (fs.existsSync(badFork)) fs.unlinkSync(badFork);
        }
    });

    test("rejects when child process emits error", async () => {
        const fakeChild = new EventEmitter();
        fakeChild.send = jest.fn();
        const spy = jest.spyOn(childProcess, 'fork').mockImplementation(() => {
            process.nextTick(() => {
                fakeChild.emit('error', new Error('Fork spawn failed'));
            });
            return fakeChild;
        });

        jest.isolateModules(async () => {
            const _ForkStrategy = require('../src/serverless/strategies/forkStrategy');
const ForkStrategy = _ForkStrategy.default || _ForkStrategy;
            const strategy = new ForkStrategy();
            await expect(strategy.run(fixturePath, 'hello', {}, process.cwd())).rejects.toThrow('Fork spawn failed');
            spy.mockRestore();
        });
    });
});
