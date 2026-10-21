const _ThreadStrategy = require("../src/serverless/strategies/threadStrategy");
const ThreadStrategy = _ThreadStrategy.default || _ThreadStrategy;
const path = require("path");
const fs = require("fs");

describe("ThreadStrategy (serverless/strategies/threadStrategy.js)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js");

    test("runs handler in worker thread successfully", async () => {
        const strategy = new ThreadStrategy();
        const result = await strategy.run(fixturePath, "hello", { test: 1 });
        expect(result).toEqual({ statusCode: 200, body: "ok" });
    });

    test("rejects when handler in worker thread throws or does not exist", async () => {
        const strategy = new ThreadStrategy();
        await expect(strategy.run(fixturePath, "missingHandler", {})).rejects.toThrow();
    });

    test("rejects when worker crashes or stops with non-zero exit code", async () => {
        const strategy = new ThreadStrategy();
        const badWorker = path.resolve(__dirname, "fixtures/badWorker.js");
        fs.writeFileSync(badWorker, "process.exit(3);");
        try {
            // Point to a module that crashes the thread
            await expect(strategy.run(badWorker, "hello", {})).rejects.toThrow("Worker stopped with exit code 3");
        } finally {
            if (fs.existsSync(badWorker)) fs.unlinkSync(badWorker);
        }
    });
});