import { describe, test, expect, jest } from "@jest/globals";
const _LambdaSimulator = require("../src/serverless/lambdaSimulator");
const LambdaSimulator = _LambdaSimulator.default || _LambdaSimulator;
const path = require("node:path");

describe("LambdaSimulator (serverless/lambdaSimulator.js)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js") + ".hello";

    test("initializes with absolute handler and runs handleEvent and handleHttpRequest", async () => {
        const sim = new LambdaSimulator({ handler: fixturePath, strategy: "vm" });
        expect(sim.$handlerName).toBe("hello");
        expect(sim.$strategy).toBe("process");

        // handleEvent
        const eventRes = await sim.handleEvent({});
        expect(eventRes).toEqual({ statusCode: 200, body: "ok" });

        // handleHttpRequest success
        const req = {
            on: (event, cb) => { if (event === "end") cb(); },
            headers: {},
            url: "/api",
            method: "GET",
            socket: {},
            httpVersion: "1.1"
        };
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        await sim.handleHttpRequest(req, res);
        expect(res.writeHead).toHaveBeenCalledWith(200, {});
        expect(res.end).toHaveBeenCalledWith("ok");
    });

    test("handles relative handler paths", () => {
        const relPath = path.relative(process.cwd(), path.resolve(__dirname, "fixtures/dummyHandler.js")) + ".hello";
        const sim = new LambdaSimulator({ handler: relPath });
        expect(path.isAbsolute(sim.$modulePath)).toBe(true);
    });

    test("throws error when handler format has no dot", () => {
        expect(() => new LambdaSimulator({ handler: "/some/path/withoutdot" })).toThrow("Handler must be in format <path>.<function>");
    });

    test("handleHttpRequest catches worker errors and dispatches to ResponseSender.sendError", async () => {
        const fixturePathFail = path.resolve(__dirname, "fixtures/dummyHandler.js") + ".nonExistent";
        const sim = new LambdaSimulator({ handler: fixturePathFail, strategy: "vm" });
        const req = {
            on: (event, cb) => { if (event === "end") cb(); },
            headers: {},
            url: "/api",
            method: "GET",
            socket: {},
            httpVersion: "1.1"
        };
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        await sim.handleHttpRequest(req, res);
        expect(res.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
    });
});