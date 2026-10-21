const _ServerLess = require("../src/adapter/serverless");
const ServerLess = _ServerLess.default || _ServerLess;
const path = require("path");

class MockRequest {
    constructor(req) {
        Object.assign(this, req);
    }
}

class MockResponse {
    constructor(res) {
        Object.assign(this, res);
    }
}

describe("ServerLess adapter (adapter/serverless.js)", () => {
    test("initializes and dispatches to LambdaSimulator.handleHttpRequest", async () => {
        const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js") + ".hello";
        const adapter = new ServerLess({ handler: fixturePath, strategy: "vm" });
        const handler = adapter.handle(MockRequest, MockResponse);
        expect(typeof handler).toBe("function");

        const rawReq = {
            on: jest.fn((event, cb) => {
                if (event === "end") cb();
            }),
            headers: {},
            url: "/test",
            method: "GET",
            socket: {},
            httpVersion: "1.1"
        };
        const rawRes = {
            writeHead: jest.fn(),
            end: jest.fn()
        };

        await handler(rawReq, rawRes);
        expect(rawRes.writeHead).toHaveBeenCalledWith(200, {});
        expect(rawRes.end).toHaveBeenCalledWith("ok");
    });
});