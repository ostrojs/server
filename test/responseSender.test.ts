const _ResponseSender = require("../src/serverless/responseSender");
const ResponseSender = _ResponseSender.default || _ResponseSender;

describe("ResponseSender (serverless/responseSender.js)", () => {
    test("sendSuccess handles text body and custom status/headers", () => {
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        ResponseSender.sendSuccess(res, {
            statusCode: 201,
            headers: { "X-Custom": "value" },
            body: "hello world"
        });
        expect(res.writeHead).toHaveBeenCalledWith(201, { "X-Custom": "value" });
        expect(res.end).toHaveBeenCalledWith("hello world");
    });

    test("sendSuccess handles base64 encoded binary body, cookies and defaults", () => {
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        ResponseSender.sendSuccess(res, {
            cookies: ["c1=v1"],
            isBase64Encoded: true,
            body: Buffer.from("binary").toString("base64")
        });
        expect(res.writeHead).toHaveBeenCalledWith(200, { "Set-Cookie": ["c1=v1"] });
        expect(res.end).toHaveBeenCalledWith(Buffer.from("binary"));
    });

    test("sendSuccess handles missing body and existing headers with cookies", () => {
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        ResponseSender.sendSuccess(res, {
            cookies: ["c2=v2"],
            headers: { "Content-Type": "text/plain" },
            isBase64Encoded: true,
            body: null
        });
        expect(res.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": "text/plain",
            "Set-Cookie": ["c2=v2"]
        });
        expect(res.end).toHaveBeenCalledWith(Buffer.from(""));

        // Without base64
        const res2 = { writeHead: jest.fn(), end: jest.fn() };
        ResponseSender.sendSuccess(res2, {});
        expect(res2.writeHead).toHaveBeenCalledWith(200, {});
        expect(res2.end).toHaveBeenCalledWith("");
    });

    test("sendError uses res.send when available", () => {
        const res = { send: jest.fn() };
        ResponseSender.sendError(res, new Error("custom error"));
        expect(res.send).toHaveBeenCalledWith("custom error", 500);
    });

    test("sendError writes 500 json when res.send is not available and handles non-error object", () => {
        const res = {
            writeHead: jest.fn(),
            end: jest.fn()
        };
        ResponseSender.sendError(res, new Error("failed json"));
        expect(res.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: "failed json" }));

        // Non-error argument
        const res2 = { writeHead: jest.fn(), end: jest.fn() };
        ResponseSender.sendError(res2, "string error");
        expect(res2.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
        expect(res2.end).toHaveBeenCalledWith(JSON.stringify({ error: "string error" }));
    });
});