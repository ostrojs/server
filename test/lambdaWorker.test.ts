import { describe, test, expect, jest } from "@jest/globals";
const _LambdaWorker = require("../src/serverless/lambdaWorker");
const LambdaWorker = _LambdaWorker.default || _LambdaWorker;
const _VmStrategy = require("../src/serverless/strategies/vmStrategy");
const VmStrategy = _VmStrategy.default || _VmStrategy;
const _ThreadStrategy = require("../src/serverless/strategies/threadStrategy");
const ThreadStrategy = _ThreadStrategy.default || _ThreadStrategy;
const _ForkStrategy = require("../src/serverless/strategies/forkStrategy");
const ForkStrategy = _ForkStrategy.default || _ForkStrategy;
const _ProcessStrategy = require("../src/serverless/strategies/processStrategy");
const ProcessStrategy = _ProcessStrategy.default || _ProcessStrategy;
const path = require("node:path");

describe("LambdaWorker (serverless/lambdaWorker.js)", () => {
    test("static create initializes with correct strategy for vm, thread, fork, process, and default", () => {
        const vmWorker = LambdaWorker.create("vm");
        expect(vmWorker.strategy).toBeInstanceOf(VmStrategy);

        const threadWorker = LambdaWorker.create("thread");
        expect(threadWorker.strategy).toBeInstanceOf(ThreadStrategy);

        const forkWorker = LambdaWorker.create("fork");
        expect(forkWorker.strategy).toBeInstanceOf(ForkStrategy);

        const processWorker = LambdaWorker.create("process");
        expect(processWorker.strategy).toBeInstanceOf(ProcessStrategy);

        const defaultWorker = LambdaWorker.create("other");
        expect(defaultWorker.strategy).toBeInstanceOf(ProcessStrategy);
    });

    test("run delegates to strategy with custom cwd option and default dirname", async () => {
        const mockStrategy = {
            run: jest.fn().mockResolvedValue("done")
        };
        const worker = new LambdaWorker(mockStrategy);

        // default cwd from path.dirname
        await worker.run("/app/handler.js", "index", { test: 1 });
        expect(mockStrategy.run).toHaveBeenCalledWith("/app/handler.js", "index", { test: 1 }, "/app");

        // custom cwd in options
        await worker.run("/app/handler.js", "index", { test: 2 }, { cwd: "/custom/cwd" });
        expect(mockStrategy.run).toHaveBeenCalledWith("/app/handler.js", "index", { test: 2 }, "/custom/cwd");
    });
});